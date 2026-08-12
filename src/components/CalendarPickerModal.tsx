import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  X,
  Calendar as CalendarIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  endDate?: string;     // YYYY-MM-DD
  onSelectDateRange: (startDate: string, endDate: string) => void;
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const DAY_NAMES_ID = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu

export const CalendarPickerModal: React.FC<CalendarPickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  endDate,
  onSelectDateRange,
}) => {
  // Parse initial dates
  const initialDateObj = new Date(selectedDate || new Date().toISOString().split('T')[0]);
  const [viewYear, setViewYear] = useState(initialDateObj.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDateObj.getMonth()); // 0-indexed

  // Selection state
  const [tempStart, setTempStart] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [tempEnd, setTempEnd] = useState<string>(endDate || selectedDate || new Date().toISOString().split('T')[0]);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      const d = new Date(selectedDate || new Date());
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setTempStart(selectedDate);
      setTempEnd(endDate || selectedDate);
    }
  }, [isOpen, selectedDate, endDate]);

  if (!isOpen) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = () => setViewYear(prev => prev - 1);
  const handleNextYear = () => setViewYear(prev => prev + 1);

  // Days calculations
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handleDayClick = (dayNumber: number) => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const formattedDay = String(dayNumber).padStart(2, '0');
    const clickedDateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

    if (!isSelectingRange) {
      // First click set single day or range start
      setTempStart(clickedDateStr);
      setTempEnd(clickedDateStr);
      setIsSelectingRange(true);
    } else {
      // Second click set range end
      if (clickedDateStr < tempStart) {
        setTempEnd(tempStart);
        setTempStart(clickedDateStr);
      } else {
        setTempEnd(clickedDateStr);
      }
      setIsSelectingRange(false);
    }
  };

  // Select Full Month Shortcut (1st to last day of current view month)
  const handleSelectFullMonth = () => {
    const formattedMonth = String(viewMonth + 1).padStart(2, '0');
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startStr = `${viewYear}-${formattedMonth}-01`;
    const endStr = `${viewYear}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`;
    setTempStart(startStr);
    setTempEnd(endStr);
    setIsSelectingRange(false);
  };

  // Select Today Shortcut
  const handleSelectToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setTempStart(todayStr);
    setTempEnd(todayStr);
    const todayObj = new Date();
    setViewYear(todayObj.getFullYear());
    setViewMonth(todayObj.getMonth());
    setIsSelectingRange(false);
  };

  const handleApply = () => {
    onSelectDateRange(tempStart, tempEnd);
    onClose();
  };

  // Formatter for bottom Rentang text
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const mIdx = parseInt(m, 10) - 1;
    return `${parseInt(d, 10)} ${MONTH_NAMES_SHORT[mIdx]} ${y}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm no-print">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="clay-card w-full max-w-sm bg-white p-4 sm:p-5 rounded-3xl shadow-2xl border border-slate-200 text-slate-800 space-y-4 font-sans"
        >
          {/* Top Bar with Title and Close */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Pilih Tanggal / Rentang
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Filter Shortcuts */}
          <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={handleSelectToday}
              className="flex-1 py-1.5 text-[11px] font-extrabold rounded-xl bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-2xs border border-slate-200/60 text-center"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={handleSelectFullMonth}
              className="flex-1 py-1.5 text-[11px] font-extrabold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all shadow-2xs border border-blue-200/60 text-center"
            >
              Bulan Ini (1 - 31)
            </button>
          </div>

          {/* Month Header Navigation (Matches Image 2) */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title="Tahun Sebelumnya"
              >
                <ChevronsLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
              {MONTH_NAMES_ID[viewMonth]} {viewYear}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                title="Tahun Berikutnya"
              >
                <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Days Grid Table */}
          <div className="space-y-2">
            {/* Day Names Header (M S S R K J S) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {DAY_NAMES_ID.map((d, i) => (
                <span key={i} className="text-[11px] font-black text-slate-400 py-1">
                  {d}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Offset slots */}
              {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9 w-full" />
              ))}

              {/* Day slots */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const formattedMonth = String(viewMonth + 1).padStart(2, '0');
                const formattedDay = String(dayNum).padStart(2, '0');
                const dateStr = `${viewYear}-${formattedMonth}-${formattedDay}`;

                const isStart = dateStr === tempStart;
                const isEnd = dateStr === tempEnd;
                const isSingle = isStart && tempStart === tempEnd;
                const isInRange = dateStr >= tempStart && dateStr <= tempEnd && !isSingle;

                let btnStyle = 'bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold';

                if (isStart || isEnd) {
                  btnStyle = 'bg-blue-600 text-white font-black shadow-md rounded-xl scale-105';
                } else if (isInRange) {
                  btnStyle = 'bg-blue-100 text-blue-900 font-extrabold rounded-lg';
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleDayClick(dayNum)}
                    className={`h-9 w-full flex items-center justify-center text-xs transition-all ${btnStyle}`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Selected Rentang Pill (Matches Image 2) */}
          <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              RENTANG:
            </span>
            <div className="bg-blue-100/90 text-blue-800 font-black text-xs px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
              {tempStart === tempEnd ? (
                formatShortDate(tempStart)
              ) : (
                `${formatShortDate(tempStart)} — ${formatShortDate(tempEnd)}`
              )}
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Terapkan</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
