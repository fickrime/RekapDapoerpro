import React from 'react';
import { LayoutDashboard, Plus, TableProperties } from 'lucide-react';
import { motion } from 'motion/react';

export type TabType = 'dashboard' | 'transaksi';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenAddModal,
}) => {
  return (
    <div className="fixed bottom-3 left-0 right-0 z-30 px-4 max-w-lg mx-auto no-print">
      <nav className="clay-card bg-white/90 backdrop-blur-xl h-[72px] rounded-3xl flex items-center justify-between px-8 border border-white/80 shadow-[0_10px_30px_rgba(166,180,200,0.5)]">
        {/* KIRI — Dashboard */}
        <button
          onClick={() => onChangeTab('dashboard')}
          className={`flex flex-col items-center justify-center space-y-0.5 transition-all ${
            activeTab === 'dashboard' 
              ? 'text-[#4f46e5] scale-105 font-extrabold' 
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'clay-pill-active text-[#4f46e5]' : ''}`}>
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider">Dashboard</span>
        </button>

        {/* TENGAH — Clay FAB Tambah Pesanan */}
        <div className="relative -top-5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenAddModal}
            className="w-[62px] h-[62px] clay-btn-primary rounded-full flex items-center justify-center text-white border-4 border-[#edf2f9] shadow-[0_12px_24px_rgba(79,70,229,0.45)] focus:outline-none"
            title="Tambah Pesanan Baru"
          >
            <Plus className="w-8 h-8 stroke-[3]" />
          </motion.button>
        </div>

        {/* KANAN — Log Transaksi */}
        <button
          onClick={() => onChangeTab('transaksi')}
          className={`flex flex-col items-center justify-center space-y-0.5 transition-all ${
            activeTab === 'transaksi' 
              ? 'text-[#4f46e5] scale-105 font-extrabold' 
              : 'text-slate-400 hover:text-slate-600 font-semibold'
          }`}
        >
          <div className={`p-1.5 rounded-xl transition-all ${activeTab === 'transaksi' ? 'clay-pill-active text-[#4f46e5]' : ''}`}>
            <TableProperties className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider">Log Transaksi</span>
        </button>
      </nav>
    </div>
  );
};
