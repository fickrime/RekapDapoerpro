import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Store as StoreIcon,
  Utensils,
  Calendar as CalendarIcon,
  Filter,
  DollarSign,
  TrendingUp,
  Package,
  X
} from 'lucide-react';
import { OrderItem, Kitchen, Store as StoreType, PaymentStatus, DeliveryStatus } from '../types';
import { OrdersTableView } from './OrdersTableView';
import { CalendarPickerModal } from './CalendarPickerModal';
import { formatRupiah, formatTanggal } from '../lib/formatters';

interface DashboardViewProps {
  orders: OrderItem[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onToggleStatus: (id: string) => void;
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  onDuplicateOrder: (item: OrderItem) => void;
  onToggleBatchStatus: (kitchenName: string, date: string, targetStatus: 'pending' | 'selesai') => void;
  onEditOrder: (item: OrderItem) => void;
  onDeleteOrder: (id: string) => void;
  onDeleteKitchenOrders: (kitchenName: string, date: string) => void;
  onOpenAddModal: (prefilledKitchen?: string) => void;
  onOpenInvoiceModal: (items: OrderItem[], kitchenName?: string, storeName?: string) => void;
  onExportInvoicePdf?: (items: OrderItem[], kitchenName: string, storeName: string, dateStr?: string) => void;
  kitchens: Kitchen[];
  stores: StoreType[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  selectedDate,
  onDateChange,
  onUpdatePaymentStatus,
  onUpdateDeliveryStatus,
  onDuplicateOrder,
  onEditOrder,
  onDeleteOrder,
  onOpenAddModal,
  onOpenInvoiceModal,
  onExportInvoicePdf,
  kitchens,
  stores,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('all');
  const [selectedKitchenFilter, setSelectedKitchenFilter] = useState<string>('all');
  const [useDateFilter, setUseDateFilter] = useState<boolean>(false); // Default ALL TIME
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Filter orders (All Time by default, or filtered by date if toggled/selected)
  const filteredOrders = useMemo(() => {
    return orders.filter((item) => {
      // Date filter (if active)
      if (useDateFilter) {
        if (endDate && endDate !== selectedDate) {
          if (item.tanggal < selectedDate || item.tanggal > endDate) return false;
        } else {
          if (item.tanggal !== selectedDate) return false;
        }
      }

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesSearch =
          item.namaBarang.toLowerCase().includes(q) ||
          item.pemasok.toLowerCase().includes(q) ||
          item.toko.toLowerCase().includes(q) ||
          item.tujuanDapur.toLowerCase().includes(q) ||
          (item.catatan && item.catatan.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Store filter
      if (selectedStoreFilter !== 'all' && item.toko !== selectedStoreFilter) {
        return false;
      }

      // Kitchen filter
      if (selectedKitchenFilter !== 'all' && item.tujuanDapur !== selectedKitchenFilter) {
        return false;
      }

      return true;
    });
  }, [
    orders,
    useDateFilter,
    selectedDate,
    endDate,
    searchQuery,
    selectedStoreFilter,
    selectedKitchenFilter,
  ]);

  return (
    <div className="space-y-3 pt-1 pb-24 font-sans text-slate-800">
      {/* Compact Search & Action Bar (Replacing the old big top banner) */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-2.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari barang, toko, dapur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Store Filter */}
        <select
          value={selectedStoreFilter}
          onChange={(e) => setSelectedStoreFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white"
        >
          <option value="all">Semua Toko ({stores.length})</option>
          {stores.map((st) => (
            <option key={st.id} value={st.nama}>
              Toko {st.nama}
            </option>
          ))}
        </select>

        {/* Kitchen Filter */}
        <select
          value={selectedKitchenFilter}
          onChange={(e) => setSelectedKitchenFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:bg-white"
        >
          <option value="all">Semua Dapur ({kitchens.length})</option>
          {kitchens.map((k) => (
            <option key={k.id} value={k.nama}>
              Dapur {k.nama}
            </option>
          ))}
        </select>

        {/* Optional Date Filter Toggle */}
        {useDateFilter ? (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsCalendarOpen(true)}
              className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-700 flex items-center gap-1"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>
                {endDate && endDate !== selectedDate
                  ? `${formatTanggal(selectedDate, false)} - ${formatTanggal(endDate, false)}`
                  : formatTanggal(selectedDate, false)}
              </span>
            </button>
            <button
              onClick={() => {
                setUseDateFilter(false);
                setEndDate(undefined);
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
              title="Kembali ke All Time"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setUseDateFilter(true);
              setIsCalendarOpen(true);
            }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter Tanggal</span>
          </button>
        )}
      </div>

      {/* Main Hierarchical Orders Table */}
      <OrdersTableView
        orders={filteredOrders}
        onUpdatePaymentStatus={onUpdatePaymentStatus}
        onUpdateDeliveryStatus={onUpdateDeliveryStatus}
        onEditOrder={onEditOrder}
        onDuplicateOrder={onDuplicateOrder}
        onDeleteOrder={onDeleteOrder}
        onOpenInvoiceModal={onOpenInvoiceModal}
        onExportInvoicePdf={onExportInvoicePdf}
      />

      {/* Popover Calendar Modal (for optional date scope filtering) */}
      <CalendarPickerModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        selectedDate={selectedDate}
        endDate={endDate}
        onSelectRange={(start, end) => {
          onDateChange(start);
          setEndDate(end);
          setUseDateFilter(true);
          setIsCalendarOpen(false);
        }}
        onSelectSingleDate={(dateStr) => {
          onDateChange(dateStr);
          setEndDate(undefined);
          setUseDateFilter(true);
          setIsCalendarOpen(false);
        }}
      />
    </div>
  );
};
