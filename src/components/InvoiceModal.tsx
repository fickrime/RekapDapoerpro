import React, { useState, useEffect } from 'react';
import { X, Printer, Receipt, FileText, User, MapPin, Phone, CreditCard, Loader2, Download, CheckCircle2 } from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah, formatTanggalRealtime, parseIndonesianNumber } from '../lib/formatters';
import { exportInvoicePdf } from '../lib/docxTemplate';
import { motion, AnimatePresence } from 'motion/react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceNumber: string;
  items: OrderItem[];
  tujuanDapur?: string;
  toko?: string;
  recipientName?: string;
  recipientAddress?: string;
  recipientPhone?: string;
  bayarAmount?: number;
  onSaveInvoiceRecord?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceNumber,
  items,
  tujuanDapur,
  toko,
  recipientName,
  recipientAddress,
  recipientPhone,
  bayarAmount = 0,
  onSaveInvoiceRecord,
}) => {
  const [bayar, setBayar] = useState<number>(bayarAmount);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [exportStatusMsg, setExportStatusMsg] = useState('');
  const [pdfResult, setPdfResult] = useState<{ url: string; fileName: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setBayar(bayarAmount);
      setExportStatusMsg('');
      setPdfResult(null);
    }
  }, [isOpen, bayarAmount]);

  if (!isOpen || items.length === 0) return null;

  // Filter items strictly to match store + kitchen + date
  const targetStore = (toko || items[0]?.toko || '').trim().toLowerCase();
  const targetKitchen = (tujuanDapur || items[0]?.tujuanDapur || '').trim().toLowerCase();
  const targetDate = items[0]?.tanggal;

  const scopedItems = items.filter((item) => {
    const matchStore = !targetStore || item.toko.trim().toLowerCase() === targetStore;
    const matchKitchen = !targetKitchen || item.tujuanDapur.trim().toLowerCase() === targetKitchen;
    const matchDate = !targetDate || item.tanggal === targetDate;
    return matchStore && matchKitchen && matchDate;
  });

  const displayItems = scopedItems.length > 0 ? scopedItems : items;

  const realTimeDate = formatTanggalRealtime();
  const totalJual = displayItems.reduce((sum, item) => {
    const q = parseIndonesianNumber(item.qty);
    const p = parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0);
    return sum + q * p;
  }, 0);
  const sisa = totalJual - parseIndonesianNumber(bayar);

  const mainKitchen = tujuanDapur || displayItems[0]?.tujuanDapur || 'Singojuruh';
  const mainStore = toko || displayItems[0]?.toko || 'HTG';

  const handleExport = async () => {
    setPdfResult(null);
    setIsExportingDocx(true);
    setExportStatusMsg('Membuka tab PDF...');

    // Step 1: Open blank tab IMMEDIATELY on user click event (user gesture required by mobile browsers)
    let preOpenedTab: Window | null = null;
    try {
      preOpenedTab = window.open('about:blank', '_blank');
      if (preOpenedTab) {
        preOpenedTab.document.write(`
          <!DOCTYPE html>
          <html lang="id">
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Memproses PDF Invoice...</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex; flex-direction: column; align-items: center; justify-content: center;
                  min-height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;
                  padding: 24px; text-align: center; box-sizing: border-box;
                }
                .card {
                  background: #1e293b; padding: 32px 24px; border-radius: 20px;
                  border: 1px solid #334155; max-width: 420px; width: 100%;
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                }
                .spinner {
                  width: 44px; height: 44px; border: 4px solid #fbbf24;
                  border-top-color: transparent; border-radius: 50%;
                  animation: spin 0.8s linear infinite; margin: 0 auto 20px auto;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                h2 { font-size: 18px; font-weight: 800; color: #fbbf24; margin: 0 0 10px 0; }
                p { font-size: 13px; color: #94a3b8; margin: 0; line-height: 1.5; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="spinner"></div>
                <h2>Sedang Memproses PDF Invoice...</h2>
                <p>Mohon tunggu sebentar, file PDF sedang disiapkan. Halaman ini akan otomatis menampilkan file PDF setelah selesai.</p>
              </div>
            </body>
          </html>
        `);
      }
    } catch (tabErr) {
      console.warn('[Mobile Export] Pre-opening tab failed or blocked:', tabErr);
    }

    try {
      if (onSaveInvoiceRecord) {
        onSaveInvoiceRecord();
      }

      const res = await exportInvoicePdf(
        {
          storeName: mainStore,
          kitchenName: mainKitchen,
          items: displayItems,
          invoiceNumber,
          bayar,
          customNama: recipientName || mainKitchen,
          customAlamat: recipientAddress || 'Banyuwangi',
          customNomor: recipientPhone || invoiceNumber,
        },
        (statusText) => {
          setExportStatusMsg(statusText);
        }
      );

      if (res && res.pdfUrl) {
        setPdfResult({ url: res.pdfUrl, fileName: res.fileName });

        // Step 3: Redirect the pre-opened tab to the generated Blob URL
        if (preOpenedTab && !preOpenedTab.closed) {
          preOpenedTab.location.href = res.pdfUrl;
        }
      }
    } catch (err: any) {
      console.error('Export Invoice Error:', err);
      if (preOpenedTab && !preOpenedTab.closed) {
        try {
          preOpenedTab.document.body.innerHTML = `
            <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; color: #f8fafc; padding: 20px; text-align: center;">
              <div style="background: #1e293b; border: 1px solid #ef4444; padding: 24px; border-radius: 16px; max-width: 400px;">
                <h2 style="color: #f87171; margin-top: 0;">Gagal Mengonversi PDF</h2>
                <p style="color: #cbd5e1; font-size: 14px;">${err?.message || err}</p>
                <button onclick="window.close()" style="background: #ef4444; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 12px;">Tutup Halaman</button>
              </div>
            </div>
          `;
        } catch (_) {
          preOpenedTab.close();
        }
      }
      alert(`Gagal Export Invoice PDF:\n${err?.message || err}`);
    } finally {
      setIsExportingDocx(false);
      setExportStatusMsg('');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-slate-300"
        >
          {/* Modal Top Control Bar */}
          <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-white">
                  Pratinjau Data Invoice
                </h2>
                <span className="text-[11px] text-amber-300 font-mono">
                  Toko: {mainStore} • Dapur: {mainKitchen}
                </span>
              </div>
            </div>

            {/* Action Buttons: "Export PDF" & Close */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleExport}
                disabled={isExportingDocx}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-75 disabled:cursor-not-allowed text-slate-900 font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border border-amber-500/80"
                title="Export Invoice ke PDF"
              >
                {isExportingDocx ? (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-slate-900" />
                ) : (
                  <Printer className="w-4 h-4 stroke-[2.5] shrink-0" />
                )}
                <span>{isExportingDocx ? (exportStatusMsg || 'Mengolah PDF...') : 'Export / Cetak PDF'}</span>
              </button>

              <button
                onClick={onClose}
                disabled={isExportingDocx}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Pratinjau Content Body */}
          <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-50 text-slate-900 font-sans space-y-6">
            {/* Active Export Status Banner */}
            {isExportingDocx && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-3 text-amber-900 text-xs sm:text-sm font-bold">
                <Loader2 className="w-5 h-5 animate-spin text-amber-600 shrink-0" />
                <div>
                  <p className="font-extrabold text-amber-950">{exportStatusMsg || 'Sedang memproses PDF...'}</p>
                  <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                    Proses konversi dapat memakan waktu beberapa detik di koneksi mobile. Mohon tidak menutup halaman ini.
                  </p>
                </div>
              </div>
            )}

            {/* Success Fallback Download Banner */}
            {pdfResult && !isExportingDocx && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 font-sans shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-xs sm:text-sm text-emerald-950">PDF Invoice Berhasil Dibuat!</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Jika file PDF belum otomatis terbuka di tab browser Anda, silakan klik tombol di samping.
                    </p>
                  </div>
                </div>
                <a
                  href={pdfResult.url}
                  download={pdfResult.fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0 border border-emerald-700/50"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Klik di sini untuk download PDF</span>
                </a>
              </div>
            )}
            {/* Store & Recipient Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Data Toko & Invoice */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    INFORMASI TRANSAKSI
                  </span>
                  <span className="text-xs font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    {invoiceNumber}
                  </span>
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <p><strong className="text-slate-900">Toko:</strong> {mainStore}</p>
                  <p><strong className="text-slate-900">Tanggal:</strong> {realTimeDate}</p>
                  <p><strong className="text-slate-900">Jumlah Item:</strong> {displayItems.length} barang</p>
                </div>
              </div>

              {/* Card 2: Data Penerima */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    KEPADA YTH. (PENERIMA)
                  </span>
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-xs space-y-1 text-slate-700">
                  <p className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                    <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{recipientName || mainKitchen}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{recipientAddress || 'Banyuwangi'}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{recipientPhone || '-'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Table of Items */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Rincian Barang / Pesanan
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {displayItems.length} Item
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">NO</th>
                      <th className="py-2.5 px-3 text-center w-16">QTY</th>
                      <th className="py-2.5 px-3">NAMA BARANG</th>
                      <th className="py-2.5 px-3 text-right w-28">HARGA</th>
                      <th className="py-2.5 px-3 text-right w-32">JUMLAH</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                    {displayItems.map((item, idx) => {
                      const q = parseIndonesianNumber(item.qty);
                      const p = parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0);
                      const subtotalJual = q * p;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-slate-900">{q}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.namaBarang}
                            {item.catatan && (
                              <span className="block text-[10px] text-slate-500 font-normal italic">
                                *{item.catatan}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                            {formatRupiah(p)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            {formatRupiah(subtotalJual)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total, Bayar, Sisa Summary Box */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs text-slate-500 font-medium space-y-0.5">
                <p className="flex items-center gap-1 text-slate-700 font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Status Pembayaran:</span>
                </p>
                <p>Pembayaran diatur saat konfirmasi modal sebelumnya.</p>
              </div>

              <div className="w-full sm:w-72 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="font-bold text-slate-600">TOTAL:</span>
                  <span className="font-black text-slate-900 text-sm">{formatRupiah(totalJual)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 text-emerald-700 font-bold">
                  <span>BAYAR:</span>
                  <span>{formatRupiah(bayar)}</span>
                </div>
                <div className="flex justify-between items-center py-1 text-amber-700 font-black text-sm">
                  <span>SISA:</span>
                  <span>{formatRupiah(sisa)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
