import * as XLSX from 'xlsx';
import { OrderItem } from '../types';
import { formatRupiah, formatTanggal } from './formatters';

export function exportToExcel(orders: OrderItem[], filenamePrefix = 'Rekap_Dapur_Tracker') {
  if (!orders || orders.length === 0) {
    alert('Tidak ada data pesanan untuk diekspor');
    return;
  }

  const exportData = orders.map((item, index) => {
    const totalBeli = item.qty * item.hargaBeli;
    const totalJual = item.qty * item.hargaJual;
    const profit = totalJual - totalBeli;

    return {
      'No': index + 1,
      'Tanggal': formatTanggal(item.tanggal, false),
      'Nama Barang': item.namaBarang,
      'Qty': item.qty,
      'Harga Beli (Satuan)': item.hargaBeli,
      'Harga Jual (Satuan)': item.hargaJual,
      'Total Pembelian': totalBeli,
      'Total Penjualan': totalJual,
      'Keuntungan (Profit)': profit,
      'Toko': item.toko,
      'Tujuan Dapur': item.tujuanDapur,
      'Pemasok / Supplier': item.pemasok,
      'Status': item.status === 'selesai' ? 'Selesai' : 'Pending',
      'Catatan': item.catatan || '-'
    };
  });

  // Calculate totals
  const totalBeliAll = orders.reduce((sum, item) => sum + (item.qty * item.hargaBeli), 0);
  const totalJualAll = orders.reduce((sum, item) => sum + (item.qty * item.hargaJual), 0);
  const totalProfitAll = totalJualAll - totalBeliAll;

  // Append summary row
  exportData.push({
    'No': 0,
    'Tanggal': '--- REKAP TOTAL ---',
    'Nama Barang': `Total ${orders.length} Item`,
    'Qty': orders.reduce((sum, item) => sum + item.qty, 0),
    'Harga Beli (Satuan)': 0,
    'Harga Jual (Satuan)': 0,
    'Total Pembelian': totalBeliAll,
    'Total Penjualan': totalJualAll,
    'Keuntungan (Profit)': totalProfitAll,
    'Toko': '',
    'Tujuan Dapur': '',
    'Pemasok / Supplier': '',
    'Status': '',
    'Catatan': ''
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 15 }, // Tanggal
    { wch: 25 }, // Nama Barang
    { wch: 8 },  // Qty
    { wch: 18 }, // Harga Beli
    { wch: 18 }, // Harga Jual
    { wch: 18 }, // Total Pembelian
    { wch: 18 }, // Total Penjualan
    { wch: 18 }, // Keuntungan
    { wch: 12 }, // Toko
    { wch: 22 }, // Tujuan Dapur
    { wch: 20 }, // Pemasok
    { wch: 10 }, // Status
    { wch: 20 }, // Catatan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Dapur Tracker');

  const todayStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

export function exportToCSV(orders: OrderItem[], filenamePrefix = 'Rekap_Dapur_Tracker') {
  if (!orders || orders.length === 0) {
    alert('Tidak ada data pesanan untuk diekspor');
    return;
  }

  const exportData = orders.map((item, index) => {
    const totalBeli = item.qty * item.hargaBeli;
    const totalJual = item.qty * item.hargaJual;
    const profit = totalJual - totalBeli;

    return {
      'No': index + 1,
      'Tanggal': item.tanggal,
      'Nama Barang': item.namaBarang,
      'Qty': item.qty,
      'Harga Beli Satuan': item.hargaBeli,
      'Harga Jual Satuan': item.hargaJual,
      'Total Beli': totalBeli,
      'Total Jual': totalJual,
      'Profit': profit,
      'Toko': item.toko,
      'Tujuan Dapur': item.tujuanDapur,
      'Pemasok': item.pemasok,
      'Status': item.status
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const todayStr = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `${filenamePrefix}_${todayStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
