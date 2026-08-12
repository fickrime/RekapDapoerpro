import React, { useEffect } from 'react';
import { CheckCircle2, Trash2, Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'edit' | 'delete';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const getBgClass = () => {
    switch (toast.type) {
      case 'delete':
        return 'bg-slate-900 border-rose-500/40 text-white';
      case 'edit':
        return 'bg-slate-900 border-indigo-500/40 text-white';
      case 'success':
      default:
        return 'bg-slate-900 border-emerald-500/40 text-white';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'delete':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'edit':
        return <Edit3 className="w-4 h-4 text-indigo-400" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className={`fixed bottom-20 left-4 sm:bottom-5 sm:left-5 z-50 px-3.5 py-2.5 rounded-2xl shadow-2xl border flex items-center gap-2.5 max-w-xs text-xs font-extrabold font-sans backdrop-blur-md no-print ${getBgClass()}`}
      >
        <div className="flex-shrink-0">{getIcon()}</div>
        <span className="flex-1 font-bold text-slate-100">{toast.message}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
