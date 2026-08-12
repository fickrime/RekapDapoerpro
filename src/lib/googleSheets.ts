import { OrderItem, InvoiceRecord } from '../types';

export const GAS_BASE_URL =
  'https://script.google.com/macros/s/AKfycbxvxj1V6LKfqFNYVh_ITbigm_LeS0Q1_f2qpHdAcuqUQqgOrNtzI0_RA4ypPJbU-Fe6sQ/exec';

export const GAS_TOKEN = (import.meta.env.VITE_GAS_TOKEN as string) || 'Gakusah';

export interface AddRowResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Fungsi addRow() mengirimkan POST data ke Google Apps Script backend.
 * Format Payload:
 * {
 *   "token": "GANTI_TOKEN_RAHASIA_INI",
 *   "action": "add",
 *   "sheet": "pesanan" | "transaksi",
 *   "data": { ...field sesuai kolom sheet... }
 * }
 */
export async function addRow(
  sheet: 'pesanan' | 'transaksi',
  data: Record<string, any>
): Promise<AddRowResponse> {
  const rawStoredToken = localStorage.getItem('gas_secret_token');
  const token =
    rawStoredToken && rawStoredToken !== 'undefined' && rawStoredToken !== 'GANTI_TOKEN_RAHASIA_INI'
      ? rawStoredToken
      : GAS_TOKEN;
  const payload = {
    token,
    action: 'add',
    sheet,
    data,
  };

  // Log object "data" & payload ke console SEBELUM melakukan fetch POST
  console.log(`[GoogleSheets addRow] Sheet: "${sheet}"`);
  console.log('[GoogleSheets addRow] Data Object (Keys & Values):', data);
  console.log('[GoogleSheets addRow] Full POST Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(GAS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP Error status: ${response.status}`);
    }

    const text = await response.text();
    let resData: any = {};
    try {
      resData = JSON.parse(text);
    } catch {
      resData = { raw: text };
    }

    // Evaluasi respon dari backend Apps Script
    if (resData.success === true || resData.status === 'success' || resData.status === 'ok') {
      return {
        success: true,
        message: resData.message || `Data berhasil disimpan ke sheet "${sheet}"!`,
        data: resData.data,
      };
    } else {
      const errorMsg =
        resData.error ||
        resData.message ||
        (typeof resData.raw === 'string' ? resData.raw : null) ||
        'Gagal menyimpan data ke Google Sheets (Response error).';
      return {
        success: false,
        error: errorMsg,
      };
    }
  } catch (err: any) {
    console.error(`[GoogleSheets API] Error addRow ke sheet ${sheet}:`, err);
    return {
      success: false,
      error: err?.message || 'Gagal terhubung ke Google Apps Script backend.',
    };
  }
}

/**
 * Builder helper untuk membuat payload "data" sheet "pesanan"
 * yang PERSIS SAMA dengan header sheet:
 * DAPUR, ITEM, DATE, QTY, TOKO, PAYMENT, DILEVERY, H. JUAL, H. BELI
 */
export function buildPesananPayload(item: Partial<OrderItem> & {
  tujuanDapur?: string;
  namaBarang?: string;
  tanggal?: string;
  qty?: number;
  toko?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  status?: string;
  hargaJual?: number;
  hargaBeli?: number;
}) {
  return {
    DAPUR: item.tujuanDapur || '',
    ITEM: item.namaBarang || '',
    DATE: item.tanggal || '',
    QTY: Number(item.qty) || 0,
    TOKO: item.toko || '',
    PAYMENT: item.paymentStatus || (item.status === 'selesai' ? 'PAID' : 'UNPAID'),
    DILEVERY: item.deliveryStatus || (item.status === 'selesai' ? 'DONE' : 'PENDING'),
    'H. JUAL': Number(item.hargaJual) || 0,
    'H. BELI': Number(item.hargaBeli) || 0,
  };
}

/**
 * Builder helper untuk membuat payload "data" sheet "transaksi"
 * yang PERSIS SAMA dengan header sheet:
 * TANGGAL, PEMASOK, BARANG, TOKO, QTY, H. BELI, TOTAL, STATUS
 */
export function buildTransaksiPayload(invoice: {
  tanggalPrint?: string;
  toko?: string;
  totalBeli?: number;
  totalJual?: number;
  items?: OrderItem[];
}) {
  const items = invoice.items || [];
  const totalQty = items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);
  const barangSummary = items.map((i) => `${i.namaBarang} (${i.qty})`).join(', ');
  const pemasokName = items[0]?.pemasok || 'Pemasok 1';

  return {
    TANGGAL: invoice.tanggalPrint || '',
    PEMASOK: pemasokName,
    BARANG: barangSummary,
    TOKO: invoice.toko || '',
    QTY: totalQty,
    'H. BELI': Number(invoice.totalBeli) || 0,
    TOTAL: Number(invoice.totalJual) || 0,
    STATUS: 'LUNAS',
  };
}

/**
 * Mapper helper untuk baris raw dari Sheet Pesanan ke TypeScript OrderItem
 */
export function mapRawOrder(row: any): OrderItem {
  const statusStr = (row.STATUS || row.status || 'pending').toString().toLowerCase();
  const status = statusStr === 'selesai' || statusStr === 'done' ? 'selesai' : 'pending';
  const payStatus = row.PAYMENT || row.paymentStatus || row.payment_status || (status === 'selesai' ? 'PAID' : 'UNPAID');
  const delStatus = row.DILEVERY || row.DELIVERY || row.deliveryStatus || row.delivery_status || (status === 'selesai' ? 'DONE' : 'PENDING');

  return {
    id: (row.NO || row.no || row.id || row.ID || `ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`).toString(),
    namaBarang: (row.ITEM || row.item || row.namaBarang || row.nama_barang || row['Nama Barang'] || '').toString(),
    qty: Number(row.QTY || row.qty || row.Qty || row.jumlah) || 0,
    hargaBeli: Number(row['H. BELI'] || row['H.BELI'] || row.hargaBeli || row.harga_beli || row['Harga Beli']) || 0,
    hargaJual: Number(row['H. JUAL'] || row['H.JUAL'] || row.hargaJual || row.harga_jual || row['Harga Jual']) || 0,
    toko: (row.TOKO || row.toko || row.Toko || '').toString(),
    tujuanDapur: (row.DAPUR || row.dapur || row.tujuanDapur || row.tujuan_dapur || row['Tujuan Dapur'] || '').toString(),
    pemasok: (row.PEMASOK || row.pemasok || row.Pemasok || '').toString(),
    status,
    paymentStatus: payStatus === 'PAID' ? 'PAID' : 'UNPAID',
    deliveryStatus: delStatus === 'DONE' ? 'DONE' : 'PENDING',
    tanggal: (row.DATE || row.date || row.tanggal || row.Tanggal || new Date().toISOString().split('T')[0]).toString(),
    createdAt: (row.createdAt || row.created_at || new Date().toISOString()).toString(),
    catatan: (row.catatan || row.Catatan || '').toString(),
  };
}

/**
 * Mapper helper untuk baris raw dari Sheet Transaksi ke TypeScript InvoiceRecord
 */
export function mapRawInvoice(row: any): InvoiceRecord {
  let items: OrderItem[] = [];
  if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  } else if (Array.isArray(row.items)) {
    items = row.items.map(mapRawOrder);
  }

  return {
    id: (row.NO || row.no || row.id || row.ID || `inv-${Date.now()}-${Math.floor(Math.random() * 10000)}`).toString(),
    invoiceNumber: (row.NO || row.no || row.invoiceNumber || row.invoice_number || row['Nomor Invoice'] || '').toString(),
    tanggalPrint: (row.TANGGAL || row.tanggal || row.tanggalPrint || row.tanggal_print || row['Tanggal Print'] || '').toString(),
    createdAt: (row.createdAt || row.created_at || new Date().toISOString()).toString(),
    tujuanDapur: (row.DAPUR || row.dapur || row.tujuanDapur || row.tujuan_dapur || '').toString(),
    toko: (row.TOKO || row.toko || row.Toko || '').toString(),
    items,
    totalBeli: Number(row['H. BELI'] || row.totalBeli || row.total_beli) || 0,
    totalJual: Number(row.TOTAL || row.totalJual || row.total_jual) || 0,
    totalProfit: Number(row.totalProfit || row.total_profit) || 0,
  };
}

/**
 * Fetch data dari Google Sheets via GET endpoint
 * GET {BASE_URL}?sheet=pesanan
 * GET {BASE_URL}?sheet=transaksi
 */
export async function fetchSheetData<T = any>(
  sheet: 'pesanan' | 'transaksi'
): Promise<{ data: T[]; error: string | null }> {
  try {
    const url = `${GAS_BASE_URL}?sheet=${encodeURIComponent(sheet)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP Error status ${response.status}`);
    }

    const json = await response.json();
    let rows: any[] = [];
    if (Array.isArray(json)) {
      rows = json;
    } else if (Array.isArray(json.data)) {
      rows = json.data;
    } else if (Array.isArray(json.result)) {
      rows = json.result;
    } else if (Array.isArray(json.rows)) {
      rows = json.rows;
    }

    return { data: rows as T[], error: null };
  } catch (err: any) {
    console.error(`[GoogleSheets API] Error fetchSheetData (${sheet}):`, err);
    return { data: [], error: err?.message || 'Gagal mengambil data dari Google Sheets' };
  }
}
