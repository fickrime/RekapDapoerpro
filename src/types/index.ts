export type OrderStatus = "pending" | "selesai";
export type PaymentStatus = "PAID" | "UNPAID";
export type DeliveryStatus = "DONE" | "PENDING";

export interface OrderItem {
  id: string;
  namaBarang: string;
  qty: number;
  hargaBeli: number;
  hargaJual: number;
  toko: string;         // Toko Kita (e.g. HTG, PROHE, LUWENG BOGA, ADIFRUITA)
  tujuanDapur: string;  // Dinamis dari daftar dapur
  pemasok: string;      // Supplier/Pemasok
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  deliveryStatus?: DeliveryStatus;
  tanggal: string;      // YYYY-MM-DD
  createdAt?: string;    // ISO timestamp string
  catatan?: string;
}

export interface Kitchen {
  id: string;
  nama: string;
  penanggungJawab?: string;
  lokasi?: string;
}

export interface Store {
  id: string;
  nama: string;
  lokasi?: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  tanggalPrint: string;  // Tanggal real-time saat dibuat
  createdAt: string;
  tujuanDapur: string;
  toko: string;
  items: OrderItem[];
  totalBeli: number;
  totalJual: number;
  totalProfit: number;
}

export interface TextParseResult {
  namaBarang: string;
  qty: number;
  hargaBeli: number;
  hargaJual: number;
  toko?: string;
  tujuanDapur?: string;
  pemasok?: string;
}
