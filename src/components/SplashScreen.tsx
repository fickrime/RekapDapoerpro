import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Receipt, Sparkles, UtensilsCrossed, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [statusText, setStatusText] = useState('Menyiapkan Rekap Dapur Pro...');
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(55);
      setStatusText('Memuat Master Data Dapur & Toko...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(90);
      setStatusText('Menyingkronkan Data Pesanan...');
    }, 900);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Sistem Siap!');
    }, 1300);

    const timer4 = setTimeout(() => {
      onFinish();
    }, 1600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onFinish]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white font-sans overflow-hidden px-4 select-none"
    >
      {/* Background Glow Blobs */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-700" />

      {/* Main Content Box */}
      <div className="relative z-10 flex flex-col items-center max-w-sm text-center">
        {/* Animated Icon Container */}
        <div className="relative mb-6">
          {/* Pulsing Aura Ring */}
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-md opacity-60"
          />

          <motion.div
            initial={{ scale: 0.5, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="relative bg-slate-900/90 p-5 rounded-3xl border border-white/20 shadow-2xl backdrop-blur-xl flex items-center justify-center text-indigo-400"
          >
            <Receipt className="w-14 h-14" />
          </motion.div>
        </div>

        {/* Title & Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-1"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            <span>Rekap Dapur Pro</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Sistem Ringkasan Pesanan Supplier &amp; Dapur Harian
          </p>
        </motion.div>

        {/* Loading Progress Bar */}
        <div className="w-full max-w-xs mt-8 space-y-2">
          <div className="h-2 w-full bg-slate-800/80 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              <span>{statusText}</span>
            </span>
            <span className="font-mono text-indigo-300 font-bold">{progress}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
