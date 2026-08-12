/**
 * CloudConvert Helper for converting filled DOCX buffer into PDF
 */

// Helper fetch with custom AbortController timeout (default 90 seconds)
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 90000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`TIMEOUT: Request ke ${url} melebihi batas waktu ${Math.round(timeoutMs / 1000)} detik.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkOrTimeoutError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  
  // Do NOT retry for explicit CloudConvert API 4xx errors
  if (msg.includes('403') || msg.includes('401') || msg.includes('422') || msg.includes('400') || msg.includes('invalid scope')) {
    return false;
  }

  return (
    msg.includes('timeout') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('aborterror') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('socket') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  );
}

async function executeCloudConvertJobOnce(
  docxBuffer: Buffer,
  apiKey: string,
  onStatusChange?: (msg: string) => void
): Promise<Buffer> {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    throw new Error('API Key CloudConvert tidak dikonfigurasi. Harap tentukan CLOUDCONVERT_API_KEY di environment variable server.');
  }

  onStatusChange?.('Membuat job konversi di CloudConvert...');
  console.log('[CloudConvert] Membuat Job konversi DOCX ke PDF...');

  // 1. Create Job with tasks: import-file -> convert-file -> export-file
  const createJobRes = await fetchWithTimeout(
    'https://api.cloudconvert.com/v2/jobs',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks: {
          'import-file': {
            operation: 'import/upload',
          },
          'convert-file': {
            operation: 'convert',
            input: 'import-file',
            input_format: 'docx',
            output_format: 'pdf',
            engine: 'libreoffice',
          },
          'export-file': {
            operation: 'export/url',
            input: 'convert-file',
          },
        },
      }),
    },
    90000 // 90s timeout
  );

  if (!createJobRes.ok) {
    const errText = await createJobRes.text();
    console.error(`[CloudConvert API Error - Create Job] Status Code: ${createJobRes.status}`);
    console.error(`[CloudConvert API Response Body]:`, errText);
    
    if (createJobRes.status === 403 || errText.includes('Invalid scope')) {
      throw new Error(
        `CloudConvert API Error (403): API Key tidak memiliki izin/scope yang cukup ("Invalid scope(s) provided"). API Key saat ini hanya memiliki scope 'user.read/user.write'. Harap buat API Key baru di CloudConvert Dashboard (https://cloudconvert.com/dashboard/api/v1/keys) dan centang scope 'task.read', 'task.write', 'task.create' (atau centang ALL SCOPES).`
      );
    }

    let errorDetail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed.message) errorDetail = parsed.message;
      if (parsed.errors) errorDetail += ' | ' + JSON.stringify(parsed.errors);
    } catch (_) {}

    throw new Error(`CloudConvert API Error (${createJobRes.status}): ${errorDetail}`);
  }

  const jobJson = await createJobRes.json();
  const jobId = jobJson.data?.id;
  const tasks = jobJson.data?.tasks || [];
  const uploadTask = tasks.find((t: any) => t.name === 'import-file' || t.operation === 'import/upload');

  if (!uploadTask || !uploadTask.result?.form) {
    console.error('[CloudConvert Invalid Job Structure]:', JSON.stringify(jobJson, null, 2));
    throw new Error('Tidak dapat memperoleh Form Upload dari response CloudConvert.');
  }

  const uploadUrl = uploadTask.result.form.url;
  const uploadParams = uploadTask.result.form.parameters;

  // 2. Upload file docx via FormData
  onStatusChange?.('Mengunggah file invoice ke CloudConvert...');
  console.log('[CloudConvert] Mengunggah file docx ke CloudConvert...');
  const formData = new FormData();
  for (const [key, value] of Object.entries(uploadParams)) {
    formData.append(key, value as string);
  }

  const blob = new Blob([docxBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  formData.append('file', blob, 'document.docx');

  const uploadRes = await fetchWithTimeout(
    uploadUrl,
    {
      method: 'POST',
      body: formData,
    },
    90000 // 90s timeout
  );

  if (!uploadRes.ok) {
    const uploadErr = await uploadRes.text();
    console.error(`[CloudConvert API Error - Upload] Status Code: ${uploadRes.status}`);
    console.error(`[CloudConvert Upload Response Body]:`, uploadErr);
    throw new Error(`Gagal mengunggah file docx ke CloudConvert (Status ${uploadRes.status}): ${uploadErr}`);
  }

  // 3. Poll job status
  onStatusChange?.('Mengonversi file ke format PDF...');
  console.log(`[CloudConvert] Memantau status job ID: ${jobId}...`);
  let status = 'processing';
  let exportTask: any = null;
  let attempts = 0;
  const maxAttempts = 45; // ~90 seconds total polling time

  while (status !== 'finished' && status !== 'error' && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    attempts++;

    try {
      const checkRes = await fetchWithTimeout(
        `https://api.cloudconvert.com/v2/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${cleanKey}`,
          },
        },
        15000 // 15s per poll request
      );

      if (!checkRes.ok) {
        const checkErr = await checkRes.text();
        console.warn(`[CloudConvert Poll Status Warning] Status Code ${checkRes.status}:`, checkErr);
        continue;
      }

      const checkJson = await checkRes.json();
      status = checkJson.data?.status;

      if (status === 'error') {
        console.error('[CloudConvert Job Detailed Errors]:', JSON.stringify(checkJson.data, null, 2));
        const failedTask = checkJson.data?.tasks?.find((t: any) => t.status === 'error');
        const errorMsg = failedTask?.message || failedTask?.code || 'Proses konversi PDF di CloudConvert gagal.';
        throw new Error(`Gagal Konversi PDF (CloudConvert): ${errorMsg}`);
      }

      if (status === 'finished') {
        exportTask = checkJson.data?.tasks?.find((t: any) => t.name === 'export-file' || t.operation === 'export/url');
      }
    } catch (pollErr: any) {
      if (isNetworkOrTimeoutError(pollErr)) {
        console.warn(`[CloudConvert Poll Transient Error - attempt ${attempts}]:`, pollErr.message);
        continue; // ignore transient poll glitches and retry next iteration
      }
      throw pollErr;
    }
  }

  if (status !== 'finished' || !exportTask) {
    throw new Error('TIMEOUT: Waktu tunggu konversi PDF di CloudConvert habis (90 detik). Silakan coba lagi.');
  }

  const pdfUrl = exportTask.result?.files?.[0]?.url;
  if (!pdfUrl) {
    console.error('[CloudConvert Missing PDF URL Task Result]:', JSON.stringify(exportTask, null, 2));
    throw new Error('URL file PDF dari CloudConvert tidak ditemukan.');
  }

  // 4. Fetch translated PDF file
  onStatusChange?.('Mengunduh file PDF hasil konversi...');
  console.log('[CloudConvert] Mengunduh hasil PDF...');
  const pdfRes = await fetchWithTimeout(pdfUrl, {}, 90000);
  if (!pdfRes.ok) {
    const downloadErr = await pdfRes.text();
    console.error(`[CloudConvert API Error - Download PDF] Status Code: ${pdfRes.status}`, downloadErr);
    throw new Error(`Gagal mengunduh file PDF hasil konversi (Status ${pdfRes.status})`);
  }

  const pdfArrayBuffer = await pdfRes.arrayBuffer();
  return Buffer.from(pdfArrayBuffer);
}

export async function convertDocxToPdfWithCloudConvert(
  docxBuffer: Buffer,
  apiKey: string,
  onStatusChange?: (msg: string) => void
): Promise<Buffer> {
  let attempt = 0;
  const maxAttempts = 2; // 1 original + 1 retry

  while (attempt < maxAttempts) {
    attempt++;
    try {
      return await executeCloudConvertJobOnce(docxBuffer, apiKey, onStatusChange);
    } catch (err: any) {
      const isRetryable = isNetworkOrTimeoutError(err);
      
      if (isRetryable && attempt < maxAttempts) {
        console.warn(`[CloudConvert Retry] Attempt ${attempt} failed network/timeout. Retrying in 2s...`, err.message);
        onStatusChange?.('Koneksi terputus/lambat. Mencoba ulang konversi (Percobaan 2)...');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      if (isRetryable) {
        throw new Error('Koneksi internet lambat atau terputus. Silakan periksa jaringan Anda dan coba lagi.');
      }

      throw err;
    }
  }

  throw new Error('Koneksi internet lambat atau terputus. Silakan periksa jaringan Anda dan coba lagi.');
}
