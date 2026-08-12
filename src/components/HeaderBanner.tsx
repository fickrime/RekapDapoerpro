import React, { useState, useMemo } from 'react';
import { 
  Settings, 
  ShoppingBag, 
  TrendingUp, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { OrderItem } from '../types';
import { formatRupiah, parseIndonesianNumber } from '../lib/formatters';

interface HeaderBannerProps {
  orders: OrderItem[];
  selectedDate: string;
  onOpenSettings: () => void;
  onOpenTextImport?: () => void;
  onOpenExport?: () => void;
  onRefreshGas?: () => void;
  isSyncingGas?: boolean;
}

export const HeaderBanner: React.FC<HeaderBannerProps> = ({
  orders = [],
  selectedDate,
  onOpenSettings,
  onRefreshGas,
  isSyncingGas = false,
}) => {
  const [period, setPeriod] = useState<'hari_ini' | 'bulan_ini' | 'all_time'>('hari_ini');

  // Filter orders according to active period selection
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    if (period === 'hari_ini') {
      const targetDate = selectedDate || new Date().toISOString().split('T')[0];
      return orders.filter((o) => o.tanggal === targetDate);
    } else if (period === 'bulan_ini') {
      const monthKey = (selectedDate || new Date().toISOString().split('T')[0]).substring(0, 7);
      return orders.filter((o) => o.tanggal && o.tanggal.startsWith(monthKey));
    } else {
      return orders;
    }
  }, [orders, period, selectedDate]);

  // Dynamic calculations
  const totalOrders = filteredOrders.length;
  const totalPenjualan = filteredOrders.reduce((sum, item) => sum + parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaJual), 0);
  const totalPembelian = filteredOrders.reduce((sum, item) => sum + parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaBeli), 0);
  const totalProfit = totalPenjualan - totalPembelian;
  const totalPending = filteredOrders.filter((o) => o.status === 'pending').length;

  const appLogoUrl = "https://vkrgybebgnnaxzzcfjpn.supabase.co/storage/v1/object/public/LOGO/Rekap%20Dapur%20pro.png";

  return (
    <header className="no-print px-3 pt-3 pb-2 max-w-5xl mx-auto w-full font-sans">
      {/* Claymorphism Semi-Glass Container */}
      <div className="bg-white/75 backdrop-blur-xl border border-white/80 p-3 sm:p-4 rounded-3xl shadow-[8px_8px_20px_rgba(166,180,200,0.35),-6px_-6px_16px_rgba(255,255,255,0.95)] space-y-3">
        {/* Top Header Bar with Brand & Period Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-slate-200/80 pb-2.5">
          {/* Brand & Logo */}
          <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <img 
                src={appLogoUrl} 
                alt="Rekap Dapur Pro" 
                className="w-9 h-9 object-contain drop-shadow-md rounded-xl bg-white p-0.5 border border-slate-200/80 flex-shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-none flex items-center gap-1.5 whitespace-nowrap">
                  <span>Rekap Dapur Pro</span>
                </h1>
              </div>
            </div>

            {/* Mobile Refresh & Settings Buttons */}
            <div className="sm:hidden flex items-center gap-1">
              {onRefreshGas && (
                <button
                  type="button"
                  onClick={onRefreshGas}
                  disabled={isSyncingGas}
                  title="Sinkronkan data dari Google Sheets"
                  className="clay-btn p-2 rounded-2xl text-indigo-600 hover:text-indigo-800 flex-shrink-0 cursor-pointer border border-slate-200"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingGas ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                title="Pengaturan Master Data"
                className="clay-btn p-2 rounded-2xl text-slate-700 hover:text-indigo-600 flex-shrink-0 cursor-pointer border border-slate-200"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Right Section: Filter Switcher & Desktop Settings */}
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            {/* Filter Pills: Hari Ini, Bulan Ini, All Time */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-[inset_2px_2px_4px_rgba(166,180,200,0.25)] w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={() => setPeriod('hari_ini')}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all whitespace-nowrap text-center cursor-pointer ${
                  period === 'hari_ini'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriod('bulan_ini')}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all whitespace-nowrap text-center cursor-pointer ${
                  period === 'bulan_ini'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPeriod('all_time')}
                className={`flex-1 sm:flex-none px-3 py-1.5 sm:py-1 rounded-xl text-[10px] font-extrabold uppercase transition-all whitespace-nowrap text-center cursor-pointer ${
                  period === 'all_time'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
            </div>

            {/* Desktop Refresh & Settings Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {onRefreshGas && (
                <button
                  type="button"
                  onClick={onRefreshGas}
                  disabled={isSyncingGas}
                  title="Sinkronkan data dari Google Sheets"
                  className="clay-btn px-3 py-2 rounded-2xl text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-bold text-xs flex-shrink-0 cursor-pointer border border-slate-200/80"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGas ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGas ? 'Syncing...' : 'Sync Sheet'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenSettings}
                title="Pengaturan Master Data"
                className="clay-btn p-2 rounded-2xl text-slate-700 hover:text-indigo-600 flex-shrink-0 cursor-pointer border border-slate-200/80"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Clay Glassmorphism 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {/* Tile 1: Pesanan */}
          <div className="bg-indigo-50/70 backdrop-blur-md border border-indigo-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[4px_4px_10px_rgba(166,180,200,0.25),inset_1px_1px_2px_rgba(255,255,255,0.9)]">
            <div className="flex items-center justify-between text-indigo-700">
              <span className="text-[10px] font-black uppercase tracking-tight">PESANAN</span>
              <div className="w-6 h-6 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <ShoppingBag className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-base sm:text-lg font-black text-slate-900">{totalOrders}</span>
              <span className="text-[10px] text-slate-500 font-bold ml-1">Item</span>
            </div>
          </div>

          {/* Tile 2: Profit */}
          <div className="bg-emerald-50/70 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[4px_4px_10px_rgba(166,180,200,0.25),inset_1px_1px_2px_rgba(255,255,255,0.9)]">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-black uppercase tracking-tight">PROFIT</span>
              <div className="w-6 h-6 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-xs sm:text-base font-black text-emerald-700 leading-tight block truncate">
                {formatRupiah(totalProfit)}
              </span>
            </div>
          </div>

          {/* Tile 3: Pending */}
          <div className="bg-rose-50/70 backdrop-blur-md border border-rose-200/80 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-[4px_4px_10px_rgba(166,180,200,0.25),inset_1px_1px_2px_rgba(255,255,255,0.9)]">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[10px] font-black uppercase tracking-tight">PENDING</span>
              <div className="w-6 h-6 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <span className="text-base sm:text-lg font-black text-rose-700">{totalPending}</span>
              <span className="text-[10px] text-rose-600/80 font-bold ml-1">Item</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

