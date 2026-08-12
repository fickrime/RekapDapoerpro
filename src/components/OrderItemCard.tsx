import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Store as StoreIcon, 
  Utensils, 
  Truck, 
  Edit3, 
  Trash2,
  TrendingUp,
  Tag
} from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah, parseIndonesianNumber } from '../lib/formatters';
import { motion } from 'motion/react';

interface OrderItemCardProps {
  item: OrderItem;
  onToggleStatus: (id: string) => void;
  onEdit: (item: OrderItem) => void;
  onDelete: (id: string) => void;
}

export const OrderItemCard: React.FC<OrderItemCardProps> = ({
  item,
  onToggleStatus,
  onEdit,
  onDelete,
}) => {
  const isDone = item.status === 'selesai';
  const q = parseIndonesianNumber(item.qty);
  const hb = parseIndonesianNumber(item.hargaBeli);
  const hj = parseIndonesianNumber(item.hargaJual);
  const totalBeli = q * hb;
  const totalJual = q * hj;
  const profit = totalJual - totalBeli;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl p-4 transition-all border shadow-sm ${
        isDone
          ? 'bg-white border-emerald-200/70 shadow-emerald-50/50'
          : 'bg-white border-slate-200 shadow-slate-100/70'
      }`}
    >
      {/* Top Header: Title & Direct Quick Toggle Switch */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className={`text-base font-bold tracking-tight ${isDone ? 'text-slate-700 line-through decoration-slate-300' : 'text-slate-900'}`}>
              {item.namaBarang}
            </h3>
            
            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                isDone
                  ? 'bg-emerald-50 text-[#10B981]'
                  : 'bg-red-50 text-[#EF4444]'
              }`}
            >
              {isDone ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  Selesai
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5 text-[#EF4444]" />
                  Pending
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium flex-wrap">
            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 font-semibold">
              {item.qty} Qty
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <StoreIcon className="w-3.5 h-3.5 text-slate-400" />
              {item.toko}
            </span>
          </div>
        </div>

        {/* High Density Direct Toggle Switch */}
        <div className="flex items-center flex-col gap-1">
          <button
            type="button"
            onClick={() => onToggleStatus(item.id)}
            className={`relative inline-flex h-6 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
              isDone ? 'bg-[#10B981] border-[#10B981]' : 'bg-white border-[#4E54C8]'
            }`}
            title={isDone ? 'Ubah ke Pending' : 'Tandai Selesai'}
          >
            <span className="sr-only">Toggle Status</span>
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-md ring-0 transition duration-200 ease-in-out my-0.5 ${
                isDone ? 'translate-x-6 bg-white' : 'translate-x-1 bg-[#4E54C8]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Details Grid: Kitchen, Supplier, Prices & Profit */}
      <div className="bg-slate-50 rounded-xl p-3 mb-3 grid grid-cols-2 gap-2 text-xs border border-slate-100">
        <div className="flex items-center gap-1.5 text-slate-600">
          <Utensils className="w-3.5 h-3.5 text-[#4E54C8]" />
          <span className="text-slate-600 font-medium truncate">{item.tujuanDapur}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <Truck className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-slate-600 font-medium truncate">{item.pemasok}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <Tag className="w-3.5 h-3.5 text-slate-400" />
          <span>Beli: <strong className="text-slate-700">{formatRupiah(item.hargaBeli)}</strong></span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-600">
          <Tag className="w-3.5 h-3.5 text-indigo-500" />
          <span>Jual: <strong className="text-[#10B981] font-bold">{formatRupiah(item.hargaJual)}</strong></span>
        </div>
      </div>

      {/* Footer: Profit & Actions */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Profit:</span>
          <span className={`font-bold flex items-center gap-1 ${profit >= 0 ? 'text-[#10B981]' : 'text-rose-600'}`}>
            <TrendingUp className="w-3 h-3" />
            {formatRupiah(profit)}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">Total: <strong className="text-slate-800">{formatRupiah(totalJual)}</strong></span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#4E54C8] hover:bg-violet-50 transition-colors"
            title="Edit Pesanan"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="Hapus Pesanan"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
