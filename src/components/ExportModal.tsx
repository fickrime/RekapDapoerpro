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
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  orders,
  selectedDate,
}) => {
  const [exportScope, setExportScope] = useState<'selected_date' | 'all'>('selected_date');

  if (!isOpen) return null;

  const filteredOrders = exportScope === 'selected_date'
    ? orders.filter((item) => item.tanggal === selectedDate)
    : orders;

  const handleExportExcel = () => {
    exportToExcel(filteredOrders, `Rekap_Dapur_${exportScope === 'selected_date' ? selectedDate : 'Semua'}`);
    onClose();
  };

  const handleExportCSV = () => {
    exportToCSV(filteredOrders, `Rekap_Dapur_${exportScope === 'selected_date' ? selectedDate : 'Semua'}`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#4E54C8] to-[#6366F1] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-200" />
              <h2 className="text-base font-bold">Ekspor Laporan Data</h2>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Scope Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Pilih Cakupan Data
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setExportScope('selected_date')}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                    exportScope === 'selected_date'
                      ? 'border-[#4E54C8] bg-indigo-50/70 text-[#4E54C8]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">Tanggal Aktif ({formatTanggal(selectedDate, false)})</div>
                    <div className="text-[11px] text-slate-500">
                      {orders.filter((o) => o.tanggal === selectedDate).length} pesanan tercatat
                    </div>
                  </div>
                  {exportScope === 'selected_date' && <CheckCircle2 className="w-4 h-4 text-[#4E54C8]" />}
                </button>

                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                    exportScope === 'all'
                      ? 'border-[#4E54C8] bg-indigo-50/70 text-[#4E54C8]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold">Semua Riwayat Pesanan</div>
                    <div className="text-[11px] text-slate-500">
                      Total {orders.length} pesanan tersimpan
                    </div>
                  </div>
                  {exportScope === 'all' && <CheckCircle2 className="w-4 h-4 text-[#4E54C8]" />}
                </button>
              </div>
            </div>

            {/* Format Export Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={filteredOrders.length === 0}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={filteredOrders.length === 0}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
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
