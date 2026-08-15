import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, FileCode, CheckCircle2 } from 'lucide-react';
import { OrderItem } from '../types';
import { exportToExcel, exportToCSV } from '../lib/exportExcel';
import { formatTanggal } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderItem[];
  selectedDate: string;
  onExportSuccess?: (fileName: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedDate,
  onExportSuccess,
}) => {
  const [exportScope, setExportScope] = useState<'selected_date' | 'all'>('selected_date');

  if (!isOpen) return null;

  const filteredOrders = exportScope === 'selected_date'
    ? orders.filter((item) => item.tanggal === selectedDate)
    : orders;

  const handleExportExcel = () => {
    const fileName = `Rekap_Dapur_${exportScope === 'selected_date' ? selectedDate : 'Semua'}.xlsx`;
    exportToExcel(filteredOrders, fileName.replace('.xlsx', ''));
    onClose();
    if (onExportSuccess) {
      onExportSuccess(fileName);
    }
  };

  const handleExportCSV = () => {
    const fileName = `Rekap_Dapur_${exportScope === 'selected_date' ? selectedDate : 'Semua'}.csv`;
    exportToCSV(filteredOrders, fileName.replace('.csv', ''));
    onClose();
    if (onExportSuccess) {
      onExportSuccess(fileName);
    }
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
          className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] z-10 border-t border-slate-200/80 overflow-hidden"
        >
          {/* Mobile Drag Indicator */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                  Ekspor Laporan Spreadsheet
                </h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Unduh data pesanan dalam format Excel / CSV
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

          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Scope Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                Pilih Cakupan Data:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('selected_date')}
                  className={`p-3 rounded-2xl border-2 text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    exportScope === 'selected_date'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-extrabold">Tanggal Aktif</div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      {formatTanggal(selectedDate, false)} ({orders.filter((o) => o.tanggal === selectedDate).length} Item)
                    </div>
                  </div>
                  {exportScope === 'selected_date' && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`p-3 rounded-2xl border-2 text-left text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                    exportScope === 'all'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-extrabold">Semua Riwayat</div>
                    <div className="text-[11px] text-slate-500 font-semibold">
                      Total {orders.length} Pesanan
                    </div>
                  </div>
                  {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
                </button>
              </div>
            </div>

            {/* Format Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredOrders.length === 0}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredOrders.length === 0}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-black text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <FileCode className="w-5 h-5 text-indigo-300" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
