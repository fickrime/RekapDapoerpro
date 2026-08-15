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

export function sanitizeDocxXml(zip: PizZip): void {
  const xmlFiles = Object.keys(zip.files).filter((fileName) =>
    fileName.startsWith('word/') && fileName.endsWith('.xml')
  );

  for (const xmlPath of xmlFiles) {
    const docXmlFile = zip.file(xmlPath);
    if (!docXmlFile) continue;

    let xmlContent = docXmlFile.asText();

    // 1. Fix "i t e m s", "it em s", "it  em s", "item s", "it ems" typos inside opening or closing loop tags
    // e.g. {#it em s}, {/it em s}, {{#it em s}}, {{/it em s}}, {# it em s }, etc.
    xmlContent = xmlContent.replace(
      /(\{#|\{\{#|\{\/|\{\{\/)\s*i(?:<[^>]+>|\s)*t(?:<[^>]+>|\s)*e(?:<[^>]+>|\s)*m(?:<[^>]+>|\s)*s\s*(\}|\}\})/gi,
      '$1items$2'
    );

    // 2. Fix other potential spaced loop tags (e.g. orders, barang, table)
    xmlContent = xmlContent.replace(
      /(\{#|\{\{#|\{\/|\{\{\/)\s*o(?:<[^>]+>|\s)*r(?:<[^>]+>|\s)*d(?:<[^>]+>|\s)*e(?:<[^>]+>|\s)*r(?:<[^>]+>|\s)*s\s*(\}|\}\})/gi,
      '$1orders$2'
    );
    xmlContent = xmlContent.replace(
      /(\{#|\{\{#|\{\/|\{\{\/)\s*b(?:<[^>]+>|\s)*a(?:<[^>]+>|\s)*r(?:<[^>]+>|\s)*a(?:<[^>]+>|\s)*n(?:<[^>]+>|\s)*g\s*(\}|\}\})/gi,
      '$1barang$2'
    );

    // 3. Trim leading/trailing whitespace inside single or double curly braces tags
    // e.g. {{ # items }} -> {{#items}}, { / items } -> {/items}, {{ total }} -> {{total}}
    xmlContent = xmlContent.replace(/(\{\{#?|\{#?)\s+([a-zA-Z0-9_\-\.\$]+)\s+(\}\}|\})/g, '$1$2$3');
    xmlContent = xmlContent.replace(/(\{\{\/?|\{\/?)\s+([a-zA-Z0-9_\-\.\$]+)\s+(\}\}|\})/g, '$1$2$3');

    zip.file(xmlPath, xmlContent);
  }
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
  sanitizeDocxXml(zip);
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
      sanitizeDocxXml(zip2);
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
      const errorDetails = formatDocxtemplaterErrors(errSingle || errDouble, storeName);
      throw new Error(errorDetails);
    }
  }

  const baseFileName = `Invoice_${storeName.replace(/\s+/g, '_')}_${kitchenName.replace(/\s+/g, '_')}_${rawDate}`;

  // 4. Auto-compress template images in browser
  let finalDocxBlob: Blob = docxBlob;
  try {
    finalDocxBlob = await compressDocxImagesClient(docxBlob, onProgress);
  } catch (compressErr) {
    console.warn('[Client PDF Export] Browser image compression warning:', compressErr);
  }

  // 5. 100% Client-Side PDF Generation (Unlimited, Fast, Offline)
  return await renderDocxToPdfClientSide(finalDocxBlob, baseFileName, onProgress);
}

/**
 * Download filled DOCX file directly without PDF conversion
 */
export async function exportInvoiceDocxOnly(
  options: ExportInvoiceOptions,
  onProgress?: (statusMsg: string) => void
): Promise<{ docxBlob: Blob; fileName: string }> {
  const { storeName, kitchenName } = options;
  onProgress?.('Menyiapkan data invoice...');
  const { validItems, dataContext, rawDate } = prepareScopedInvoiceData(options);
  if (validItems.length === 0) {
    throw new Error('Tidak ada transaksi valid untuk di-export');
  }
  onProgress?.('Mengambil template invoice...');
  const arrayBuffer = await fetchDocxTemplateBuffer(storeName);
  onProgress?.('Mengisi template invoice...');
  const zip = new PizZip(arrayBuffer);
  sanitizeDocxXml(zip);
  let docxBlob: Blob;
  try {
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
    const zip2 = new PizZip(arrayBuffer);
    sanitizeDocxXml(zip2);
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
  }

  const fileName = `Invoice_${storeName.replace(/\s+/g, '_')}_${kitchenName.replace(/\s+/g, '_')}_${rawDate}.docx`;
  saveAs(docxBlob, fileName);
  onProgress?.('File DOCX Berhasil Diunduh!');
  return { docxBlob, fileName };
}

/**
 * Client-Side PDF Generation Fallback using docx-preview + html2pdf
 * Runs completely in browser, requires no server or external API keys.
 */
export async function renderDocxToPdfClientSide(
  docxBlob: Blob,
  baseFileName: string,
  onProgress?: (statusMsg: string) => void
): Promise<{ pdfBlob: Blob; pdfUrl: string; fileName: string }> {
  onProgress?.('Mencetak PDF di browser (Client-Side)...');
  console.log('[Client PDF Fallback] Rendering DOCX to PDF in browser via docx-preview + html2pdf...');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';
  container.style.color = '#000000';
  document.body.appendChild(container);

  try {
    const arrayBuffer = await docxBlob.arrayBuffer();
    await renderAsync(arrayBuffer, container, undefined, {
      inWrapper: false,
      ignoreWidth: false,
      ignoreHeight: false,
      breakPages: true,
    });

    onProgress?.('Memproses halaman PDF...');

    const fileName = `${baseFileName}.pdf`;
    const opt = {
      margin: 8,
      filename: fileName,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
    };

    const pdfBlob: Blob = await html2pdf().set(opt).from(container).output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    try {
      saveAs(pdfBlob, fileName);
    } catch (e) {
      console.warn('[Client PDF Fallback] saveAs failed or blocked:', e);
    }

    onProgress?.('Selesai (PDF Browser)!');

    return {
      pdfBlob,
      pdfUrl,
      fileName,
    };
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

/**
 * Backwards compatibility alias
 */
export const downloadDocxInvoice = exportInvoicePdf;
