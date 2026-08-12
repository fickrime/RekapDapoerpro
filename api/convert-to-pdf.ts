import { convertDocxToPdfWithCloudConvert } from '../src/lib/cloudConvert';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    let downloadName = 'Invoice.pdf';
    let customApiKey = '';

    if (req.query?.fileName) {
      downloadName = decodeURIComponent(req.query.fileName as string);
    }
    if (req.query?.apiKey) {
      customApiKey = decodeURIComponent(req.query.apiKey as string);
    }

    const rawBuffer = await getRawBody(req);

    if (!rawBuffer || rawBuffer.length === 0) {
      return res.status(400).json({ error: 'Data request kosong. File DOCX tidak ditemukan.' });
    }

    let docxBuffer: Buffer = rawBuffer;
    const contentType = (req.headers['content-type'] || '').toLowerCase();

    // If request was sent as JSON, parse JSON body
    if (contentType.includes('application/json')) {
      try {
        const jsonStr = rawBuffer.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        if (parsed.docxBase64) {
          docxBuffer = Buffer.from(parsed.docxBase64, 'base64');
        }
        if (parsed.fileName) downloadName = parsed.fileName;
        if (parsed.apiKey) customApiKey = parsed.apiKey;
      } catch (e) {
        console.warn('[Vercel API /api/convert-to-pdf] Failed to parse JSON body:', e);
      }
    }

    if (!docxBuffer || docxBuffer.length === 0) {
      return res.status(400).json({ error: 'Data file DOCX tidak ditemukan dalam request.' });
    }

    const finalSizeBytes = docxBuffer.length;
    const finalSizeMB = (finalSizeBytes / (1024 * 1024)).toFixed(2);
    console.log(`[Vercel API /api/convert-to-pdf] Received DOCX binary (${finalSizeBytes} bytes / ${finalSizeMB} MB)`);

    const MAX_PAYLOAD_BYTES = 4.5 * 1024 * 1024;
    if (finalSizeBytes > MAX_PAYLOAD_BYTES) {
      console.warn(`[Vercel API /api/convert-to-pdf] Payload size (${finalSizeMB} MB) exceeds 4.5MB limit`);
      return res.status(413).json({
        error: `Ukuran file DOCX (${finalSizeMB} MB) melebihi batas maksimum platform (4.50 MB).`,
      });
    }

    const apiKey = (process.env.CLOUDCONVERT_API_KEY || customApiKey || '').trim();
    if (!apiKey) {
      console.error('[Vercel API Error /api/convert-to-pdf]: CLOUDCONVERT_API_KEY is not configured on Vercel.');
      return res.status(400).json({
        error: 'CLOUDCONVERT_API_KEY tidak ditemukan di environment variable server Vercel. Harap atur CLOUDCONVERT_API_KEY pada Vercel Dashboard -> Settings -> Environment Variables.',
      });
    }

    console.log(`[Vercel API] Starting CloudConvert conversion for ${downloadName}...`);
    const pdfBuffer = await convertDocxToPdfWithCloudConvert(docxBuffer, apiKey);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err: any) {
    console.error('[Vercel API Error /api/convert-to-pdf Exception Details]:', err);
    return res.status(500).json({
      error: err?.message || 'Gagal melakukan konversi PDF via CloudConvert',
    });
  }
}


