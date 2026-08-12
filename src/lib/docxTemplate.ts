import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { compressDocxImagesClient } from './clientDocxCompressor';
import html2pdf from 'html2pdf.js';
import { renderAsync } from 'docx-preview';
import { OrderItem } from '../types';
import {
  formatRupiah,
  formatTanggal,
  formatTanggalRealtime,
  parseIndonesianNumber,
  generateInvoiceNumber,
} from './formatters';

export const TEMPLATE_URLS: Record<string, string> = {
  "LUWENG BOGA": "https://docs.google.com/document/d/1vCwDWoGEQhmyujqTF0l0VVJU3cH8nyxn/export?format=docx",
  "HTG": "https://docs.google.com/document/d/1km9cBqcqqfWoHdI8tg7ATjw2ZSAsL4gZ/export?format=docx",
  "LUMBUNG ADIFRUTA": "https://docs.google.com/document/d/1AvbWhAIgCgyHBqeaZ-qpw3MSrKazoXoh/export?format=docx",
  "PROHE": "https://docs.google.com/document/d/1uzoTVnveItdYGgHoZcFedec1KMf-D0LX/export?format=docx"
};

export const INVOICE_TEMPLATES = TEMPLATE_URLS;

export function getCustomTemplateUrl(): string | null {
  return localStorage.getItem('custom_docx_template_url');
}

export function setCustomTemplateUrl(url: string | null, name?: string): void {
  if (url) {
    localStorage.setItem('custom_docx_template_url', url);
    if (name) localStorage.setItem('custom_docx_template_name', name);
  } else {
    localStorage.removeItem('custom_docx_template_url');
    localStorage.removeItem('custom_docx_template_name');
  }
}

/**
 * Get Google Docs export URL for a given store name
 */
export function getTemplateUrlForStore(storeName: string): string {
  const customUrl = getCustomTemplateUrl();
  if (customUrl) return customUrl;

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

export interface ExportInvoiceOptions {
  storeName: string;
  kitchenName: string;
  items: OrderItem[];
  invoiceNumber?: string;
  dateStr?: string;
  bayar?: number;
  customNama?: string;
  customAlamat?: string;
  customNomor?: string;
}

/**
 * Format docxtemplater errors into detailed messages for debugging
 */
function formatDocxtemplaterErrors(err: any, storeName: string): string {
  console.error(`[docxtemplater Error on store "${storeName}"]:`, err);

  if (err.properties && Array.isArray(err.properties.errors)) {
    const errorList = err.properties.errors
      .map((e: any, idx: number) => {
        const explanation = e.properties?.explanation || e.message || 'Syntax/Tag Error';
        const tag = e.properties?.id || e.properties?.xtag || e.properties?.context || '';
        const file = e.properties?.file || '';
        return `${idx + 1}. ${explanation} ${tag ? `[Tag: "${tag}"]` : ''} ${file ? `(${file})` : ''}`;
      })
      .join('\n');

    return `MultiError (${err.properties.errors.length} error pada template "${storeName}"):\n${errorList}`;
  }

  return `TemplateError pada template "${storeName}": ${err?.message || err}`;
}

/**
 * Prepare and filter transaction items strictly by store, kitchen, and date
 */
export function prepareScopedInvoiceData(options: ExportInvoiceOptions) {
  const { storeName, kitchenName, items, bayar = 0 } = options;

  const targetStore = (storeName || '').trim().toLowerCase();
  const targetKitchen = (kitchenName || '').trim().toLowerCase();
  const targetDate = options.dateStr || items[0]?.tanggal;

  // 1. FILTER: strictly match store + kitchen + date of the clicked action row
  const filteredItems = items.filter((item) => {
    const matchStore = !targetStore || (item.toko || '').trim().toLowerCase() === targetStore;
    const matchKitchen = !targetKitchen || (item.tujuanDapur || '').trim().toLowerCase() === targetKitchen;
    const matchDate = !targetDate || item.tanggal === targetDate;
    return matchStore && matchKitchen && matchDate;
  });

  const validItems = filteredItems.length > 0 ? filteredItems : items;

  // 2. Invoice Number Auto Generation
  const autoInvoiceNo =
    options.invoiceNumber ||
    (validItems[0] as any)?.noInvoice ||
    (validItems[0] as any)?.nomorInvoice ||
    generateInvoiceNumber(kitchenName);

  const formattedDate = targetDate ? formatTanggal(targetDate, false) : formatTanggalRealtime();
  const rawDate = targetDate || new Date().toISOString().split('T')[0];

  const displayNama = options.customNama || kitchenName;
  const displayAlamat = options.customAlamat || 'Banyuwangi';
  const displayNomor = options.customNomor || autoInvoiceNo;

  // 3. Calculate TOTAL using parseIndonesianNumber
  let grandTotal = 0;
  const itemsFormatted = validItems.map((item, index) => {
    const q = parseIndonesianNumber(item.qty);
    const unitPrice = parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0);
    const subtotal = q * unitPrice;
    grandTotal += subtotal;

    return {
      no: index + 1,
      NO: index + 1,
      qty: q,
      QTY: q,
      banyaknya: q,
      BANYAKNYA: q,

      nama: item.namaBarang,
      NAMA: item.namaBarang,
      namaItem: item.namaBarang,
      NAMA_ITEM: item.namaBarang,
      nama_item: item.namaBarang,
      namaBarang: item.namaBarang,
      NAMA_BARANG: item.namaBarang,
      nama_barang: item.namaBarang,
      barang: item.namaBarang,
      BARANG: item.namaBarang,
      item: item.namaBarang,
      ITEM: item.namaBarang,

      harga: formatRupiah(unitPrice),
      HARGA: formatRupiah(unitPrice),
      hargaJual: formatRupiah(unitPrice),
      hargaBeli: formatRupiah(parseIndonesianNumber(item.hargaBeli)),

      jumlah: formatRupiah(subtotal),
      JUMLAH: formatRupiah(subtotal),
      subtotal: formatRupiah(subtotal),
      SUBTOTAL: formatRupiah(subtotal),

      catatan: item.catatan || '',
      pemasok: item.pemasok || '',
    };
  });

  const parsedBayar = parseIndonesianNumber(bayar);
  const sisa = grandTotal - parsedBayar;

  // Exact Data Context required by docxtemplater:
  // { tgl, nama, alamat, nomor, TOTAL, bayar, sisa, items: [...] }
  const dataContext = {
    // Dates
    tgl: formattedDate,
    TGL: formattedDate,
    tanggal: formattedDate,
    TANGGAL: formattedDate,
    raw_tanggal: rawDate,

    // Recipient Info
    nama: displayNama,
    NAMA: displayNama,
    dapur: displayNama,
    DAPUR: displayNama,
    kitchen: displayNama,
    tujuanDapur: displayNama,
    kepada: displayNama,
    KEPADA: displayNama,

    alamat: displayAlamat,
    ALAMAT: displayAlamat,

    nomor: displayNomor,
    NOMOR: displayNomor,
    no: displayNomor,
    NO: displayNomor,
    invoiceNumber: autoInvoiceNo,
    INVOICE_NUMBER: autoInvoiceNo,

    // Store Info
    toko: storeName,
    TOKO: storeName,
    store: storeName,

    // Totals
    total: formatRupiah(grandTotal),
    TOTAL: formatRupiah(grandTotal),

    bayar: formatRupiah(parsedBayar),
    BAYAR: formatRupiah(parsedBayar),

    sisa: formatRupiah(sisa),
    SISA: formatRupiah(sisa),

    // Array of items
    items: itemsFormatted,
    ITEMS: itemsFormatted,
    orders: itemsFormatted,
    ORDERS: itemsFormatted,
    barang: itemsFormatted,
    BARANG: itemsFormatted,
    table: itemsFormatted,
    TABLE: itemsFormatted,
  };

  return {
    validItems,
    dataContext,
    grandTotal,
    autoInvoiceNo,
    formattedDate,
    rawDate,
    itemsFormatted,
    parsedBayar,
    sisa,
  };
}

/**
 * Fetch Google Docs docx template via server proxy
 */
export async function fetchDocxTemplateBuffer(storeName: string): Promise<ArrayBuffer> {
  const proxyUrl = `/api/fetch-template?toko=${encodeURIComponent(storeName)}`;

  try {
    const response = await fetch(proxyUrl);
    if (response.ok) {
      return await response.arrayBuffer();
    }
  } catch (err) {
    console.warn('Server proxy fetch failed, trying direct Google Docs export fallback...', err);
  }

  // Fallback to direct fetch if proxy unavailable
  const directUrl = getTemplateUrlForStore(storeName);
  const response = await fetch(directUrl);
  if (!response.ok) {
    throw new Error(`Gagal mengambil template Google Docs untuk ${storeName} (${response.statusText})`);
  }
  return await response.arrayBuffer();
}

/**
 * Main Export Function:
 * 1. Fetch docx template for store
 * 2. Fill data via docxtemplater
 * 3. Save filled docx file
 * 4. Convert filled docx directly to PDF via docx-preview & html2pdf (NO hardcoded HTML templates)
 */
export async function exportInvoicePdf(
  options: ExportInvoiceOptions,
  onProgress?: (statusMsg: string) => void
): Promise<{ pdfBlob: Blob; pdfUrl: string; fileName: string }> {
  const { storeName, kitchenName } = options;

  // 1. Prepare scoped data
  onProgress?.('Menyiapkan data invoice...');
  const {
    validItems,
    dataContext,
    autoInvoiceNo,
    rawDate,
  } = prepareScopedInvoiceData(options);

  if (validItems.length === 0) {
    throw new Error('Tidak ada transaksi valid untuk di-export');
  }

  // 2. Fetch Google Docs docx template via proxy
  onProgress?.('Mengambil template invoice...');
  const arrayBuffer = await fetchDocxTemplateBuffer(storeName);

  // 3. Process docx with Docxtemplater
  onProgress?.('Mengisi template invoice...');
  const zip = new PizZip(arrayBuffer);
  let docxBlob: Blob;

  try {
    // Primary: double curly braces {{tag}} as used in template
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => '',
    });
    doc.render(dataContext);
    docxBlob = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } catch (errDouble: any) {
    console.warn(`Docxtemplater failed with {{ delimiters }}, trying { delimiters } fallback...`, errDouble);
    try {
      const zip2 = new PizZip(arrayBuffer);
      const doc2 = new Docxtemplater(zip2, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '',
      });
      doc2.render(dataContext);
      docxBlob = doc2.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    } catch (errSingle: any) {
      const errorDetails = formatDocxtemplaterErrors(errDouble, storeName);
      throw new Error(errorDetails);
    }
  }

  const baseFileName = `Invoice_${storeName.replace(/\s+/g, '_')}_${kitchenName.replace(/\s+/g, '_')}_${rawDate}`;

  // 4. Auto-compress template images in browser before uploading to Vercel/CloudConvert endpoint
  let finalDocxBlob: Blob = docxBlob;
  try {
    finalDocxBlob = await compressDocxImagesClient(docxBlob, onProgress);
  } catch (compressErr) {
    console.warn('[Client PDF Export] Browser image compression warning:', compressErr);
  }

  const finalArrayBufferDocx = await finalDocxBlob.arrayBuffer();
  const finalSizeBytes = finalArrayBufferDocx.byteLength;
  const finalSizeMB = (finalSizeBytes / (1024 * 1024)).toFixed(2);

  console.log(`[Client PDF Export] Final DOCX size for upload: ${finalSizeBytes} bytes (${finalSizeMB} MB)`);

  // Hard check against Vercel payload limit (4.5 MB)
  if (finalSizeBytes > 4.2 * 1024 * 1024) {
    throw new Error(
      `Ukuran file template DOCX setelah kompresi (${finalSizeMB} MB) masih di atas limit Vercel (4.20 MB). Harap kecilkan logo pada template Google Docs.`
    );
  }

  let convertResponse: Response | null = null;
  let attempt = 0;
  const maxAttempts = 2; // 1 original + 1 retry

  while (attempt < maxAttempts) {
    attempt++;
    try {
      if (attempt > 1) {
        onProgress?.('Koneksi terputus/lambat. Mencoba ulang pengiriman... (Percobaan 2)');
        await new Promise((r) => setTimeout(r, 2000));
      } else {
        onProgress?.('Mengonversi ke PDF via CloudConvert...');
      }

      const pdfFileName = `${baseFileName}.pdf`;
      const convertApiUrl = `/api/convert-to-pdf?fileName=${encodeURIComponent(pdfFileName)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout for mobile networks

      convertResponse = await fetch(convertApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: finalArrayBufferDocx,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!convertResponse.ok) {
        let errorMsg = `HTTP ${convertResponse.status}: Gagal konversi PDF.`;
        try {
          const errJson = await convertResponse.json();
          if (errJson.error) errorMsg = errJson.error;
        } catch (_) {
          const errText = await convertResponse.text().catch(() => '');
          if (errText) errorMsg = `HTTP ${convertResponse.status}: ${errText}`;
        }
        throw new Error(errorMsg);
      }

      break; // Success
    } catch (pdfErr: any) {
      const isNetworkOrTimeout =
        pdfErr.name === 'AbortError' ||
        pdfErr.message?.includes('fetch') ||
        pdfErr.message?.includes('Failed to fetch') ||
        pdfErr.message?.includes('NetworkError') ||
        pdfErr.message?.includes('502') ||
        pdfErr.message?.includes('503') ||
        pdfErr.message?.includes('504');

      if (isNetworkOrTimeout && attempt < maxAttempts) {
        console.warn(`[Client PDF Export] Attempt ${attempt} failed network/timeout:`, pdfErr.message);
        continue;
      }

      if (isNetworkOrTimeout) {
        throw new Error('Koneksi internet lambat atau terputus. Silakan periksa jaringan Anda dan coba lagi.');
      }

      console.error('Konversi PDF via CloudConvert API gagal:', pdfErr);
      throw new Error(pdfErr?.message || pdfErr);
    }
  }

  if (!convertResponse || !convertResponse.ok) {
    throw new Error('Gagal mengonversi PDF, tidak ada respons valid dari server.');
  }

  onProgress?.('Mengunduh file PDF...');
  const pdfBlob = await convertResponse.blob();
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const fileName = `${baseFileName}.pdf`;

  // Fallback direct save
  try {
    saveAs(pdfBlob, fileName);
  } catch (e) {
    console.warn('saveAs failed or blocked:', e);
  }

  onProgress?.('Selesai!');

  return {
    pdfBlob,
    pdfUrl,
    fileName,
  };
}

/**
 * Backwards compatibility alias
 */
export const downloadDocxInvoice = exportInvoicePdf;
