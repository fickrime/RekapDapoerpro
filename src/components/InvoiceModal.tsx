import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Receipt, 
  FileText, 
  User, 
  MapPin, 
  Phone, 
  CreditCard, 
  Download, 
  Sparkles,
  FileDown
} from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah, formatTanggalRealtime, parseIndonesianNumber } from '../lib/formatters';
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
  onTriggerBackgroundExport?: (options: {
    storeName: string;
    kitchenName: string;
    items: OrderItem[];
    invoiceNumber: string;
    bayar: number;
    customNama: string;
    customAlamat: string;
    customNomor: string;
    type: 'pdf' | 'docx';
  }) => void;
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
  onTriggerBackgroundExport,
  onSaveInvoiceRecord,
}) => {
  const [bayar, setBayar] = useState<number>(bayarAmount);

  useEffect(() => {
    if (isOpen) {
      setBayar(bayarAmount);
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

  const totalJual = displayItems.reduce((sum, item) => {
    const q = parseIndonesianNumber(item.qty);
    const p = parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0);
    return sum + q * p;
  }, 0);
  const sisa = Math.max(0, totalJual - parseIndonesianNumber(bayar));

  const mainKitchen = tujuanDapur || displayItems[0]?.tujuanDapur || 'Dapur';
  const mainStore = toko || displayItems[0]?.toko || 'HTG';

  const handleStartPdfExport = () => {
    if (onSaveInvoiceRecord) {
      onSaveInvoiceRecord();
    }
    if (onTriggerBackgroundExport) {
      onTriggerBackgroundExport({
        storeName: mainStore,
        kitchenName: mainKitchen,
        items: displayItems,
        invoiceNumber,
        bayar,
        customNama: recipientName || mainKitchen,
        customAlamat: recipientAddress || 'Banyuwangi',
        customNomor: recipientPhone || invoiceNumber,
        type: 'pdf',
      });
    }
    onClose();
  };

  const handleStartDocxExport = () => {
    if (onSaveInvoiceRecord) {
      onSaveInvoiceRecord();
    }
    if (onTriggerBackgroundExport) {
      onTriggerBackgroundExport({
        storeName: mainStore,
        kitchenName: mainKitchen,
        items: displayItems,
        invoiceNumber,
        bayar,
        customNama: recipientName || mainKitchen,
        customAlamat: recipientAddress || 'Banyuwangi',
        customNomor: recipientPhone || invoiceNumber,
        type: 'docx',
      });
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center no-print font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] z-10 border-t border-slate-200/80 overflow-hidden"
        >
          {/* Mobile Drag Indicator */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                    {invoiceNumber}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                    {mainStore}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {mainKitchen} • {displayItems.length} Barang • {formatRupiah(totalJual)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Recipient & Meta Summary */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Penerima:
                </span>
                <span className="font-extrabold text-slate-900 block mt-0.5">
                  {recipientName || mainKitchen}
                </span>
                <span className="text-[11px] text-slate-600 font-medium block">
                  {recipientAddress || 'Banyuwangi'}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Pembayaran:
                </span>
                <div className="mt-0.5 space-y-0.5 text-[11px]">
                  <span className="font-bold text-slate-700 block">
                    Bayar: <strong className="text-emerald-700">{formatRupiah(bayar)}</strong>
                  </span>
                  <span className="font-bold text-slate-700 block">
                    Sisa: <strong className="text-rose-700">{formatRupiah(sisa)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Scoped Items Table Preview */}
            <div className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 text-[11px] font-black text-slate-700 uppercase tracking-wider flex justify-between">
                <span>Rincian Barang</span>
                <span>{displayItems.length} Item</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {displayItems.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-900 block truncate">{item.namaBarang}</span>
                      <span className="text-[10px] text-slate-500">{item.qty} × {formatRupiah(item.hargaJual || item.hargaBeli || 0)}</span>
                    </div>
                    <span className="font-black text-slate-900 text-xs flex-shrink-0">
                      {formatRupiah(parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 uppercase">Total Invoice:</span>
                <span className="text-base font-black text-indigo-700">{formatRupiah(totalJual)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Instant Background Export */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleStartPdfExport}
              className="w-full sm:flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Cetak &amp; Export PDF (Browser Offline)</span>
            </button>

            <button
              type="button"
              onClick={handleStartDocxExport}
              className="w-full sm:w-auto py-3 px-4 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-indigo-300" />
              <span>Unduh DOCX</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
