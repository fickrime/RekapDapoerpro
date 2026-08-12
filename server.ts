import 'dotenv/config';
import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { convertDocxToPdfWithCloudConvert } from './src/lib/cloudConvert';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
});

const TEMPLATE_URLS: Record<string, string> = {
  "LUWENG BOGA": "https://docs.google.com/document/d/1vCwDWoGEQhmyujqTF0l0VVJU3cH8nyxn/export?format=docx",
  "HTG": "https://docs.google.com/document/d/1km9cBqcqqfWoHdI8tg7ATjw2ZSAsL4gZ/export?format=docx",
  "LUMBUNG ADIFRUTA": "https://docs.google.com/document/d/1AvbWhAIgCgyHBqeaZ-qpw3MSrKazoXoh/export?format=docx",
  "PROHE": "https://docs.google.com/document/d/1uzoTVnveItdYGgHoZcFedec1KMf-D0LX/export?format=docx"
};

function getGoogleDocTemplateUrl(storeName: string): string {
  const norm = (storeName || '').trim().toUpperCase();
  if (norm.includes('LUWENG') || norm.includes('LEMBUNG') || norm.includes('BOGA') || norm.includes('LB')) {
    return TEMPLATE_URLS["LUWENG BOGA"];
  }
  if (norm.includes('PROHE') || norm.includes('PW')) {
    return TEMPLATE_URLS["PROHE"];
  }
  if (norm.includes('LUMBUNG') || norm.includes('ADIFRUTA') || norm.includes('FRUITA') || norm.includes('LA')) {
    return TEMPLATE_URLS["LUMBUNG ADIFRUTA"];
  }
  return TEMPLATE_URLS["HTG"];
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing large payloads
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));
  app.use(express.raw({ type: ['application/octet-stream', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], limit: '100mb' }));

  // Proxy endpoint to fetch Google Docs export link as binary docx
  app.get('/api/fetch-template', async (req, res) => {
    try {
      const tokoQuery = (req.query.toko as string) || 'HTG';
      const targetUrl = getGoogleDocTemplateUrl(tokoQuery);

      console.log(`[Proxy Server] Fetching template for store "${tokoQuery}" from ${targetUrl}`);

      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Gagal mengambil template dari Google Docs (${response.statusText})`,
        });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="template_${tokoQuery.replace(/\s+/g, '_')}.docx"`);
      res.send(buffer);
    } catch (err: any) {
      console.error('[Proxy Server Error]:', err);
      res.status(500).json({ error: err?.message || 'Server error proxying Google Docs template' });
    }
  });

  // Convert DOCX to PDF using CloudConvert API (Supports multipart/form-data, raw binary, and JSON)
  app.post('/api/convert-to-pdf', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: `Ukuran file DOCX terlalu besar. Batas maksimum platform adalah 4.50 MB. Harap kompres logo/gambar pada template Google Docs Anda.`,
          });
        }
        return res.status(400).json({ error: `Gagal membaca file upload multipart: ${err.message}` });
      }
      next();
    });
  }, async (req, res) => {
    try {
      let docxBuffer: Buffer | null = null;
      let downloadName = 'Invoice.pdf';
      let customApiKey = '';

      // 1. Check if uploaded as multipart/form-data (req.file)
      if (req.file && req.file.buffer && req.file.buffer.length > 0) {
        docxBuffer = req.file.buffer;
        if (req.body?.fileName) {
          downloadName = req.body.fileName;
        } else if (req.file.originalname) {
          downloadName = req.file.originalname.replace(/\.docx$/i, '.pdf');
        }
        if (req.body?.apiKey) {
          customApiKey = req.body.apiKey;
        }
      }
      // 2. Fallback: Raw binary octet-stream
      else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
        docxBuffer = req.body;
      }
      // 3. Fallback: Base64 JSON payload
      else if (req.body && typeof req.body === 'object') {
        const { docxBase64, apiKey, fileName } = req.body;
        if (docxBase64) {
          docxBuffer = Buffer.from(docxBase64, 'base64');
        }
        if (fileName) downloadName = fileName;
        if (apiKey) customApiKey = apiKey;
      }

      if (req.query.fileName) {
        downloadName = decodeURIComponent(req.query.fileName as string);
      }
      if (req.query.apiKey) {
        customApiKey = decodeURIComponent(req.query.apiKey as string);
      }

      if (!docxBuffer || docxBuffer.length === 0) {
        return res.status(400).json({ error: 'Data file DOCX tidak ditemukan dalam request.' });
      }

      const finalSizeBytes = docxBuffer.length;
      const finalSizeMB = (finalSizeBytes / (1024 * 1024)).toFixed(2);
      console.log(`[Server API /api/convert-to-pdf] Terima file DOCX (${finalSizeBytes} bytes / ${finalSizeMB} MB)`);

      // Check payload size limit (CloudConvert/Vercel serverless platform function limit is 4.5 MB)
      const MAX_PAYLOAD_BYTES = 4.5 * 1024 * 1024;
      if (finalSizeBytes > MAX_PAYLOAD_BYTES) {
        console.warn(`[Server API /api/convert-to-pdf] Payload size (${finalSizeMB} MB) exceeds limit (4.50 MB)`);
        return res.status(413).json({
          error: `Ukuran file DOCX (${finalSizeMB} MB) melebihi batas maksimum platform (4.50 MB).`,
        });
      }

      const apiKey = (process.env.CLOUDCONVERT_API_KEY || customApiKey || '').trim();
      if (!apiKey) {
        console.error('[Server API Error /api/convert-to-pdf]: CLOUDCONVERT_API_KEY environment variable is not set.');
        return res.status(400).json({
          error: 'CLOUDCONVERT_API_KEY tidak dikonfigurasi di environment variable server. Harap set CLOUDCONVERT_API_KEY.',
        });
      }

      console.log(`[Server API] Converting DOCX (${finalSizeMB} MB) to PDF via CloudConvert API...`);
      const pdfBuffer = await convertDocxToPdfWithCloudConvert(docxBuffer, apiKey);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      return res.status(200).send(pdfBuffer);
    } catch (err: any) {
      console.error('[Convert PDF Server Error Exception]:', err);
      return res.status(500).json({
        error: err?.message || 'Gagal melakukan konversi PDF via CloudConvert',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();