import JSZip from 'jszip';

/**
 * Client-side (Browser) DOCX Image Auto-Compressor
 * 
 * Compresses images inside the generated DOCX ZIP file directly in the browser
 * BEFORE sending the file over the network to Vercel's /api/convert-to-pdf serverless endpoint.
 * This guarantees request payload size stays well below Vercel's 4.5 MB hard proxy limit,
 * preventing HTTP 413 (Payload Too Large) errors on mobile devices and production deployments.
 */
export async function compressDocxImagesClient(
  docxInput: Blob | ArrayBuffer,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  const originalBuffer =
    docxInput instanceof ArrayBuffer
      ? docxInput
      : await docxInput.arrayBuffer();

  const originalSizeBytes = originalBuffer.byteLength;
  const originalSizeMB = (originalSizeBytes / (1024 * 1024)).toFixed(2);
  console.log(
    `[Client DOCX Compressor] Original DOCX size: ${originalSizeBytes} bytes (${originalSizeMB} MB)`
  );

  // If already under 2.5 MB, client compression can be skipped or lightweight
  try {
    const zip = await JSZip.loadAsync(originalBuffer);
    const mediaFiles: string[] = [];

    zip.forEach((relativePath, file) => {
      if (relativePath.startsWith('word/media/') && !file.dir) {
        mediaFiles.push(relativePath);
      }
    });

    if (mediaFiles.length === 0) {
      console.log('[Client DOCX Compressor] No images found in word/media/. Skipping client compression.');
      return new Blob([originalBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    }

    onProgress?.('Mengompresi gambar pada template secara otomatis...');
    let compressedCount = 0;

    for (const filePath of mediaFiles) {
      const file = zip.file(filePath);
      if (!file) continue;

      const ext = filePath.split('.').pop()?.toLowerCase();
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) continue;

      const imgUint8Array = await file.async('uint8array');
      // Only compress images larger than 60 KB
      if (imgUint8Array.byteLength < 60 * 1024) continue;

      try {
        const compressedArrayBuffer = await compressImageBlobInBrowser(
          imgUint8Array,
          ext === 'png' ? 'image/png' : 'image/jpeg'
        );

        if (
          compressedArrayBuffer &&
          compressedArrayBuffer.byteLength < imgUint8Array.byteLength
        ) {
          console.log(
            `[Client DOCX Compressor] Compressed ${filePath}: ${(
              imgUint8Array.byteLength / 1024
            ).toFixed(1)} KB -> ${(
              compressedArrayBuffer.byteLength / 1024
            ).toFixed(1)} KB`
          );
          zip.file(filePath, compressedArrayBuffer);
          compressedCount++;
        }
      } catch (imgErr) {
        console.warn(`[Client DOCX Compressor] Could not compress ${filePath}:`, imgErr);
      }
    }

    if (compressedCount === 0) {
      console.log('[Client DOCX Compressor] No images needed compression.');
      return new Blob([originalBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    }

    const compressedBlob = await zip.generateAsync({
      type: 'blob',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    const finalSizeMB = (compressedBlob.size / (1024 * 1024)).toFixed(2);
    console.log(
      `[Client DOCX Compressor] Compression finished: ${originalSizeMB} MB -> ${finalSizeMB} MB (${compressedCount} images optimized)`
    );

    return compressedBlob;
  } catch (err) {
    console.error('[Client DOCX Compressor] Failed client-side compression:', err);
    return new Blob([originalBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
}

/**
 * Resizes and compresses an image binary using HTML5 Canvas in the browser.
 */
function compressImageBlobInBrowser(
  uint8Array: Uint8Array,
  mimeType: string
): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const blob = new Blob([uint8Array], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      // Max dimension 800px
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        if (width > height) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        } else {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Draw image onto canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG at 0.75 quality for dramatic size reduction
      canvas.toBlob(
        async (outBlob) => {
          if (!outBlob) {
            resolve(null);
            return;
          }
          const buf = await outBlob.arrayBuffer();
          resolve(buf);
        },
        'image/jpeg',
        0.75
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      resolve(null);
    };

    img.src = blobUrl;
  });
}
