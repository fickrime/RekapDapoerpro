import React from 'react';
import { 
  Trash2, 
  Plus, 
  Check, 
  Clock, 
  Edit2, 
  X, 
  Truck,
  Printer
} from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah, formatTanggalDisatuin, parseIndonesianNumber } from '../lib/formatters';
import { motion } from 'motion/react';

interface DapurTransactionCardProps {
  storeName: string;
  date: string;
  items: OrderItem[];
  onToggleStatus: (id: string) => void;
  onToggleBatchStatus: (storeName: string, date: string, targetStatus: 'pending' | 'selesai') => void;
  onEditOrder: (item: OrderItem) => void;
  onDeleteOrder: (id: string) => void;
  onDeleteKitchenOrders: (storeName: string, date: string) => void;
  onOpenInvoiceModal: (items: OrderItem[], kitchenName?: string, storeName?: string) => void;
  onExportInvoicePdf?: (items: OrderItem[], kitchenName: string, storeName: string, dateStr?: string) => void;
  onAddItemToKitchen: (storeName: string) => void;
}

export const DapurTransactionCard: React.FC<DapurTransactionCardProps> = ({
  storeName,
  date,
  items,
  onToggleBatchStatus,
  onEditOrder,
  onDeleteOrder,
  onDeleteKitchenOrders,
  onOpenInvoiceModal,
  onExportInvoicePdf,
  onAddItemToKitchen,
}) => {
  // Calculate Totals for this Store
  const totalJual = items.reduce((sum, item) => sum + parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaJual), 0);
  const totalBeli = items.reduce((sum, item) => sum + parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaBeli), 0);
  const totalProfit = totalJual - totalBeli;

  // Determine Overall Status for this Store
  const isAllDone = items.length > 0 && items.every((i) => i.status === 'selesai');

  const handleToggleCardStatus = () => {
    const nextStatus = isAllDone ? 'pending' : 'selesai';
    onToggleBatchStatus(storeName, date, nextStatus);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="clay-card p-3 sm:p-4 space-y-3 font-sans text-slate-800 backdrop-blur-md border border-white/80"
    >
      {/* 1. TOP HEADER - LAMPIRAN 1: Date + Store Name Badge + Status + Switch + Delete (NO Printer/Docx in top header) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-indigo-100/60">
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Merged Day & Date Pill (Green) */}
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-[11px] sm:text-xs px-2.5 py-1 rounded-xl uppercase tracking-wider shadow-xs">
            {formatTanggalDisatuin(date)}
          </span>

          {/* Toko Title Pill (Monochrome) */}
          <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 text-slate-900 px-2.5 py-1 rounded-xl font-black text-xs sm:text-sm shadow-2xs uppercase">
            <span>TOKO : {storeName}</span>
          </div>

          {/* Status Badge Pill */}
          <button
            onClick={handleToggleCardStatus}
            className={`flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-extrabold rounded-xl transition-all active:scale-95 cursor-pointer ${
              isAllDone ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
            }`}
          >
            {isAllDone ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                <span>SELESAI</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 stroke-[2.5]" />
                <span>PENDING</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side Control Buttons: Switch Toggle + Hapus Card (Removed Printer & DOCX icons per Lampiran 1) */}
        <div className="flex items-center space-x-1.5">
          {/* Direct Switch Toggle */}
          <button
            type="button"
            onClick={handleToggleCardStatus}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
              isAllDone ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-300 border-slate-200'
            }`}
            title={isAllDone ? 'Ubah ke Pending' : 'Tandai Selesai'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out my-0.5 ${
                isAllDone ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>

          {/* Delete Store Orders Button */}
          <button
            onClick={() => onDeleteKitchenOrders(storeName, date)}
            className="p-1.5 clay-btn text-rose-500 hover:text-rose-700 transition-all active:scale-95 rounded-xl"
            title="Hapus Semua Pesanan Toko Ini"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TABLE - LAMPIRAN 1: BARANG | DAPUR (Yellow) | QTY | H.JUAL | H.BELI | AKSI */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-indigo-100 text-[10px] font-black text-slate-600 uppercase tracking-wider">
              <th className="py-2 px-1 w-[28%]">BARANG</th>
              <th className="py-2 px-1 text-center w-[20%] bg-slate-100 text-slate-900 rounded-t">DAPUR</th>
              <th className="py-2 px-1 text-center w-[10%]">QTY</th>
              <th className="py-2 px-1 text-right w-[20%]">H.JUAL</th>
              <th className="py-2 px-1 text-right w-[14%]">H.BELI</th>
              <th className="py-2 px-1 text-center w-[8%]">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {items.map((item) => {
              const q = parseIndonesianNumber(item.qty);
              const hj = parseIndonesianNumber(item.hargaJual);
              const hb = parseIndonesianNumber(item.hargaBeli);
              const itemTotalJual = q * hj;
              const itemTotalBeli = q * hb;

              return (
                <tr key={item.id} className="hover:bg-white/80 transition-colors">
                  {/* BARANG Column */}
                  <td className="py-2 px-1">
                    <div className="font-extrabold text-slate-900 tracking-tight leading-snug uppercase">
                      {item.namaBarang}
                    </div>
                    {/* Supplier Tag only (Toko tag removed per Lampiran 1) */}
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 flex-wrap">
                      <span className="flex items-center gap-0.5 text-slate-700 font-semibold bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                        <Truck className="w-2.5 h-2.5" />
                        {item.pemasok}
                      </span>
                    </div>

                    {/* Catatan pill */}
                    {item.catatan && (
                      <div className="mt-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 truncate max-w-[140px]">
                        {item.catatan}
                      </div>
                    )}
                  </td>

                  {/* DAPUR Column */}
                  <td className="py-2 px-1 text-center">
                    <span className="bg-slate-100 text-slate-900 font-extrabold px-2.5 py-1 rounded-xl text-[11px] uppercase tracking-wider shadow-2xs border border-slate-300 inline-block">
                      {item.tujuanDapur}
                    </span>
                  </td>

                  {/* QTY Column */}
                  <td className="py-2 px-1 text-center font-bold text-slate-900">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 font-mono text-xs">
                      {item.qty}
                    </span>
                  </td>

                  {/* H.JUAL Column */}
                  <td className="py-2 px-1 text-right">
                    <div className="font-black text-slate-900">
                      {formatRupiah(itemTotalJual)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      @ {formatRupiah(item.hargaJual).replace('Rp ', '')}
                    </div>
                  </td>

                  {/* H.BELI Column */}
                  <td className="py-2 px-1 text-right">
                    <div className="font-medium text-slate-600">
                      {formatRupiah(itemTotalBeli)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      @ {formatRupiah(item.hargaBeli).replace('Rp ', '')}
                    </div>
                  </td>

                  {/* AKSI Column - Edit, Delete, & IKON CETAK (Yellow Button) */}
                  <td className="py-2 px-1 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEditOrder(item)}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Edit Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteOrder(item.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                        title="Hapus Item"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {/* IKON CETAK (Export PDF Invoice) */}
                      <button
                        onClick={() => {
                          const kitchenItems = items.filter((it) => it.tujuanDapur === item.tujuanDapur);
                          if (onExportInvoicePdf) {
                            onExportInvoicePdf(kitchenItems, item.tujuanDapur, storeName, item.tanggal);
                          } else {
                            onOpenInvoiceModal(kitchenItems, item.tujuanDapur, storeName);
                          }
                        }}
                        className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold shadow-2xs transition-all active:scale-95 border border-amber-500/80 cursor-pointer"
                        title="IKON CETAK: Export PDF Invoice Pesanan Dapur Ini"
                      >
                        <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. ADD ITEM BUTTON - Dynamic to Store Name */}
      <button
        onClick={() => onAddItemToKitchen(storeName)}
        className="w-full clay-btn py-2 text-indigo-700 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1 active:scale-[0.99] border border-indigo-200"
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>+ Tambah Barang ke {storeName}</span>
      </button>

      {/* 4. CARD FOOTER WITH TOTAL JUAL & PROFIT NET */}
      <div className="flex items-center justify-between pt-2 border-t border-indigo-100/60 text-xs font-semibold">
        <div>
          <span className="block text-[9px] text-slate-400 uppercase tracking-wider font-black">
            TOTAL JUAL
          </span>
          <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
            {formatRupiah(totalJual)}
          </span>
        </div>

        <div className="text-right">
          <span className="block text-[9px] text-emerald-600 uppercase tracking-wider font-black">
            PROFIT NET
          </span>
          <span className="text-sm sm:text-base font-black text-emerald-600 tracking-tight">
            {formatRupiah(totalProfit)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

