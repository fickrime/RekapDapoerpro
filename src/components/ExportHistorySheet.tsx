import React from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  FileDown, 
  Sparkles,
  Loader2,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExportHistoryItem } from '../types';
import { formatRupiah, formatTanggalRealtime } from '../lib/formatters';

interface ExportHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExportHistoryItem[];
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  isExportingActive: boolean;
  activeExportStatus?: string;
}

export const ExportHistorySheet: React.FC<ExportHistorySheetProps> = ({
  isOpen,
  onClose,
  history,
  onDeleteHistoryItem,
  onClearHistory,
  isExportingActive,
  activeExportStatus,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center no-print">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] z-10 border-t border-slate-200/80 overflow-hidden font-sans"
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
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none flex items-center gap-2">
                  <span>Riwayat Export &amp; Download</span>
                  {history.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-black">
                      {history.length}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Daftar file invoice yang telah berhasil dicetak &amp; diekspor
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Active Export In-Progress Banner */}
          {isExportingActive && (
            <div className="mx-4 mt-3 bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-center gap-3 animate-pulse shadow-xs">
              <Loader2 className="w-5 h-5 text-amber-600 animate-spin flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-amber-900 block">
                  Sedang Memproses Cetak di Latar Belakang...
                </span>
                <span className="text-[11px] text-amber-700 font-medium truncate block">
                  {activeExportStatus || 'Mempersiapkan dokumen dan rendering PDF browser offline'}
                </span>
              </div>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center mx-auto">
                  <Receipt className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-700">Belum Ada Riwayat Cetak</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Ketika Anda mengekspor atau mencetak invoice dari dashboard, riwayat dokumen akan otomatis muncul di sini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/80 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    {/* Item Info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 flex-shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-slate-900">
                            {item.invoiceNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-900 text-[10px] font-extrabold uppercase">
                            {item.toko}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[10px] font-bold">
                            {item.tujuanDapur}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          <span className="font-semibold text-slate-700">
                            {item.itemCount} Barang
                          </span>
                          <span>•</span>
                          <span className="font-black text-emerald-700">
                            {formatRupiah(item.totalJual)}
                          </span>
                          <span>•</span>
                          <span>{formatTanggalRealtime(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      {item.pdfUrl ? (
                        <a
                          href={item.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          download={item.fileName}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka / Unduh</span>
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold">
                          Tersimpan
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => onDeleteHistoryItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Hapus dari riwayat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Action */}
          {history.length > 0 && (
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                Riwayat tersimpan di perangkat lokal
              </span>
              <button
                type="button"
                onClick={onClearHistory}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-100/60 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                Bersihkan Riwayat
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
