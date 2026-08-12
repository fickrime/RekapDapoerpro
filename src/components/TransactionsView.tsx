import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  Truck,
  Edit2,
  Store as StoreIcon,
  MoreVertical,
  Printer,
  X
} from 'lucide-react';
import { InvoiceRecord, OrderItem, Kitchen, PaymentStatus } from '../types';
import { formatRupiah, formatTanggalDisatuin, getTokoBadgeStyle } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';

import { Pagination } from './Pagination';

interface TransactionsViewProps {
  invoices: InvoiceRecord[];
  orders: OrderItem[];
  kitchens: Kitchen[];
  onToggleStatus: (id: string) => void;
  onUpdatePaymentStatus?: (id: string, status: PaymentStatus) => void;
  onToggleBatchStatus: (kitchenName: string, date: string, targetStatus: 'pending' | 'selesai') => void;
  onEditOrder: (item: OrderItem) => void;
  onDeleteOrder: (id: string) => void;
  onDeleteKitchenOrders: (kitchenName: string, date: string) => void;
  onOpenInvoiceModal: (items: OrderItem[], kitchenName?: string, storeName?: string) => void;
  onDeleteInvoice: (id: string) => void;
  onOpenAddModal: (prefilledKitchen?: string) => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  orders,
  onToggleStatus,
  onUpdatePaymentStatus,
  onEditOrder,
  onDeleteOrder,
  onOpenInvoiceModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPemasok, setSelectedPemasok] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'PAID' | 'UNPAID'>('all');

  // Pagination state (max 20 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Active 3-dots action menu tracking
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Expanded notes state tracking
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique suppliers (Pemasok)
  const pemasokList = useMemo(() => {
    const list = Array.from(new Set(orders.map((o) => o.pemasok))).filter(Boolean);
    return list.sort();
  }, [orders]);

  // Helper getters for status
  const getPayStatus = (item: OrderItem): 'PAID' | 'UNPAID' => {
    if (item.paymentStatus) {
      return item.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
    }
    return item.status === 'selesai' ? 'PAID' : 'UNPAID';
  };

  // Filter orders
  const filteredOutcomeOrders = useMemo(() => {
    return orders.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.namaBarang.toLowerCase().includes(q) ||
        item.pemasok.toLowerCase().includes(q) ||
        item.toko.toLowerCase().includes(q) ||
        item.tujuanDapur.toLowerCase().includes(q) ||
        (item.catatan && item.catatan.toLowerCase().includes(q));

      const matchesPemasok = selectedPemasok === 'all' || item.pemasok === selectedPemasok;

      const payStatus = getPayStatus(item);
      const matchesStatus = selectedStatusFilter === 'all' || payStatus === selectedStatusFilter;

      return matchesSearch && matchesPemasok && matchesStatus;
    });
  }, [orders, searchQuery, selectedPemasok, selectedStatusFilter]);

  const totalPages = Math.ceil(filteredOutcomeOrders.length / pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredOutcomeOrders.length, totalPages, currentPage]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOutcomeOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOutcomeOrders, currentPage, pageSize]);

  const handleTogglePayment = (item: OrderItem) => {
    const currentPay = getPayStatus(item);
    const newStatus: PaymentStatus = currentPay === 'PAID' ? 'UNPAID' : 'PAID';
    if (onUpdatePaymentStatus) {
      onUpdatePaymentStatus(item.id, newStatus);
    } else {
      onToggleStatus(item.id);
    }
  };

  const startRowIndex = (currentPage - 1) * pageSize + 1;

  return (
    <div className="space-y-3 pt-2 pb-24 font-sans text-slate-900">
      {/* Search & Filter Toolbar */}
      <div className="clay-card p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 border border-slate-200">
        <div className="relative col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari barang, pemasok, toko..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-7 py-2 clay-input text-xs font-bold text-slate-900 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pemasok */}
        <select
          value={selectedPemasok}
          onChange={(e) => setSelectedPemasok(e.target.value)}
          className="px-3 py-2 clay-input text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
        >
          <option value="all">Semua Pemasok Beli ({pemasokList.length})</option>
          {pemasokList.map((p) => (
            <option key={p} value={p}>
              Pemasok: {p}
            </option>
          ))}
        </select>

        {/* Filter Status */}
        <select
          value={selectedStatusFilter}
          onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
          className="px-3 py-2 clay-input text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
        >
          <option value="all">Semua Status (PAID & UNPAID)</option>
          <option value="UNPAID">UNPAID</option>
          <option value="PAID">PAID</option>
        </select>
      </div>

      {/* OUTCOME TRANSACTIONS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredOutcomeOrders.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <h3 className="text-xs font-extrabold text-slate-900">
              Tidak ada transaksi log ditemukan
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Coba ubah kata kunci pencarian atau filter Pemasok / Status di atas.
            </p>
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs relative">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-2xs">
                  <tr className="text-[8.5px] sm:text-[9px] font-black text-slate-600 uppercase tracking-wider">
                    <th className="py-2.5 px-2 text-center w-8 bg-slate-100 sticky top-0">#</th>
                    <th className="py-2.5 px-2 min-w-[85px] bg-slate-100 sticky top-0">HARI, TGL</th>
                    <th className="py-2.5 px-2 min-w-[110px] bg-slate-100 sticky top-0">PEMASOK</th>
                    <th className="py-2.5 px-2 min-w-[120px] bg-slate-100 sticky top-0">BARANG & TOKO</th>
                    <th className="py-2.5 px-1 text-center w-10 bg-slate-100 sticky top-0">QTY</th>
                    <th className="py-2.5 px-2 text-right min-w-[85px] bg-slate-100 sticky top-0">H. BELI</th>
                    <th className="py-2.5 px-2 text-right min-w-[95px] bg-slate-100 sticky top-0">TOTAL</th>
                    <th className="py-2.5 px-2 text-center w-20 bg-slate-100 sticky top-0">STATUS</th>
                    <th className="py-2.5 px-2 text-center w-12 bg-slate-100 sticky top-0">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-800 bg-white">
                  {paginatedOrders.map((item, idx) => {
                    const totalBeli = item.qty * item.hargaBeli;
                    const payStatus = getPayStatus(item);
                    const isPaid = payStatus === 'PAID';
                    const isMenuOpen = activeMenuId === item.id;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        {/* NO */}
                        <td className="py-2 px-2 text-center text-slate-400 font-mono text-[10px] font-bold">
                          {startRowIndex + idx}
                        </td>

                        {/* TANGGAL */}
                        <td className="py-2 px-2 text-slate-800 font-bold whitespace-nowrap text-[10.5px]">
                          {formatTanggalDisatuin(item.tanggal)}
                        </td>

                        {/* PEMASOK */}
                        <td className="py-2 px-2">
                          <span className="inline-flex items-center gap-1 font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[10px] border border-slate-200/80 truncate max-w-full">
                            <Truck className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                            <span className="truncate">{item.pemasok}</span>
                          </span>
                        </td>

                        {/* NAMA BARANG & TOKO KITA */}
                        <td className="py-1 px-1">
                          <div className="font-bold text-slate-900 text-[10.5px] leading-tight">{item.namaBarang}</div>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500 font-normal mt-0.5">
                            <span className={`flex items-center gap-0.5 px-1 py-0.2 rounded border text-[9px] ${getTokoBadgeStyle(item.toko)}`}>
                              <StoreIcon className="w-2.5 h-2.5" />
                              {item.toko}
                            </span>
                            <span className="font-medium text-slate-500">ke {item.tujuanDapur}</span>
                          </div>
                        </td>


                        {/* QTY */}
                        <td className="py-2 px-1 text-center font-black text-slate-900 font-mono text-[11px]">
                          {item.qty}
                        </td>

                        {/* HARGA BELI */}
                        <td className="py-2 px-2 text-right font-bold text-slate-600 font-mono text-[10px]">
                          {formatRupiah(item.hargaBeli)}
                        </td>

                        {/* TOTAL */}
                        <td className="py-2 px-2 text-right font-black text-slate-900 font-mono text-[10.5px]">
                          {formatRupiah(totalBeli)}
                        </td>

                        {/* STATUS TOGGLE TEXT */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleTogglePayment(item)}
                            className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer transition-all active:scale-95 border ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                            }`}
                            title="Klik untuk ubah status PAID / UNPAID"
                          >
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </button>
                        </td>

                        {/* AKSI THREE DOTS MENU & PRINT ICON */}
                        <td className="py-2 px-2 text-center relative">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => onOpenInvoiceModal([item], item.tujuanDapur, item.toko)}
                              className="p-1 rounded-lg text-amber-600 hover:text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Cetak / Export Invoice PDF (🖨)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            <div className="relative inline-block" ref={isMenuOpen ? menuRef : null}>
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(isMenuOpen ? null : item.id)}
                                className={`p-1 rounded-lg transition-colors ${
                                  isMenuOpen
                                    ? 'bg-slate-200 text-slate-900'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                                title="Menu Aksi"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              <AnimatePresence>
                                {isMenuOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    transition={{ duration: 0.1 }}
                                    className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onOpenInvoiceModal([item], item.tujuanDapur, item.toko);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Export Invoice</span>
                                    </button>

                                    <div className="border-t border-slate-100 my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onEditOrder(item);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Edit</span>
                                    </button>

                                    <div className="border-t border-slate-100 my-1" />

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onDeleteOrder(item.id);
                                      }}
                                      className="w-full px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                      <span>Hapus</span>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

