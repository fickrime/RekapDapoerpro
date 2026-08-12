import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Printer, 
  MoreVertical, 
  Edit2, 
  Copy, 
  Trash2, 
  Package
} from 'lucide-react';
import { OrderItem, PaymentStatus, DeliveryStatus } from '../types';
import { formatRupiah, formatTanggalDisatuin, getTokoBadgeStyle } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';

import { Pagination } from './Pagination';

interface OrderGroup {
  id: string;
  groupIndex: number;
  tujuanDapur: string;
  tanggal: string;
  toko: string;
  payStatus: PaymentStatus;
  delStatus: DeliveryStatus;
  items: OrderItem[];
}

interface OrdersTableViewProps {
  orders: OrderItem[];
  onUpdatePaymentStatus: (id: string, status: PaymentStatus) => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  onEditOrder: (order: OrderItem) => void;
  onDuplicateOrder: (order: OrderItem) => void;
  onDeleteOrder: (id: string) => void;
  onOpenInvoiceModal: (items: OrderItem[], kitchenName: string, storeName: string) => void;
  onExportInvoicePdf?: (items: OrderItem[], kitchenName: string, storeName: string, dateStr?: string) => void;
}

export const OrdersTableView: React.FC<OrdersTableViewProps> = ({
  orders,
  onUpdatePaymentStatus,
  onUpdateDeliveryStatus,
  onEditOrder,
  onDuplicateOrder,
  onDeleteOrder,
  onOpenInvoiceModal,
  onExportInvoicePdf,
}) => {
  // Pagination State (Max 15 groups per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Dropdown open state tracking by group ID
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Expanded notes state tracking for compact fit
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper getters for status fields
  const getPayStatus = (item: OrderItem): PaymentStatus => {
    if (item.paymentStatus) return item.paymentStatus === 'PAID' ? 'PAID' : 'UNPAID';
    return item.status === 'selesai' ? 'PAID' : 'UNPAID';
  };

  const getDelStatus = (item: OrderItem): DeliveryStatus => {
    if (item.deliveryStatus) return item.deliveryStatus;
    return item.status === 'selesai' ? 'DONE' : 'PENDING';
  };

  // Group items hierarchically:
  // Group 1: ATAS -> UNPAID payment + PENDING delivery
  // Group 2: TENGAH -> PAID payment + PENDING delivery (or UNPAID payment + DONE delivery)
  // Group 3: BAWAH -> PAID payment + DONE delivery
  const sortedOrders = useMemo(() => {
    const groupAtas = orders.filter((item) => {
      const pay = getPayStatus(item);
      const del = getDelStatus(item);
      return pay === 'UNPAID' && del === 'PENDING';
    });

    const groupTengah = orders.filter((item) => {
      const pay = getPayStatus(item);
      const del = getDelStatus(item);
      return (pay === 'PAID' && del === 'PENDING') || (pay === 'UNPAID' && del === 'DONE');
    });

    const groupBawah = orders.filter((item) => {
      const pay = getPayStatus(item);
      const del = getDelStatus(item);
      return pay === 'PAID' && del === 'DONE';
    });

    return [...groupAtas, ...groupTengah, ...groupBawah];
  }, [orders]);

  // Group sorted items into OrderGroup objects by Dapur + Tanggal + Toko
  const orderGroups = useMemo(() => {
    const map = new Map<string, OrderItem[]>();

    sortedOrders.forEach((item) => {
      const key = `${item.tujuanDapur}||${item.tanggal}||${item.toko}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    const groups: OrderGroup[] = [];
    let idx = 1;

    map.forEach((items, key) => {
      const first = items[0];

      const payStatuses = items.map(getPayStatus);
      const delStatuses = items.map(getDelStatus);

      const payStatus: PaymentStatus = payStatuses.every((s) => s === 'PAID')
        ? 'PAID'
        : 'UNPAID';

      const delStatus: DeliveryStatus = delStatuses.every((s) => s === 'DONE')
        ? 'DONE'
        : 'PENDING';

      groups.push({
        id: key,
        groupIndex: idx++,
        tujuanDapur: first.tujuanDapur,
        tanggal: first.tanggal,
        toko: first.toko,
        payStatus,
        delStatus,
        items,
      });
    });

    return groups;
  }, [sortedOrders]);

  const totalPages = Math.ceil(orderGroups.length / pageSize);

  // Reset page to 1 if filter reduces totalPages below currentPage
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [orderGroups.length, totalPages, currentPage]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return orderGroups.slice(startIndex, startIndex + pageSize);
  }, [orderGroups, currentPage, pageSize]);

  const handleGroupPaymentChange = (groupItems: OrderItem[], newStatus: PaymentStatus) => {
    groupItems.forEach((it) => onUpdatePaymentStatus(it.id, newStatus));
  };

  const handleGroupDeliveryChange = (groupItems: OrderItem[], newStatus: DeliveryStatus) => {
    groupItems.forEach((it) => onUpdateDeliveryStatus(it.id, newStatus));
  };

  const hasAnyOrders = orders.length > 0;

  if (!hasAnyOrders) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center my-4 space-y-2 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900">Belum Ada Transaksi Pesanan</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
            Tambah pesanan baru untuk mulai mengelola data supplier, toko, dan dapur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* ONE SINGLE COMPACT TABLE WITH STICKY FREEZE PANES HEADER AND MERGED GROUP ROWS */}
      <div className="overflow-x-auto max-h-[70vh] sm:max-h-[75vh] overflow-y-auto">
        <table className="w-full text-left border-collapse text-[9.5px] font-sans relative">
          <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-2xs">
            <tr className="text-[8.5px] font-black text-slate-700 uppercase tracking-tight">
              <th className="py-1.5 px-1 text-center w-5 bg-slate-100 sticky top-0">#</th>
              <th className="py-1.5 px-1 text-center bg-slate-100 sticky top-0">DAPUR</th>
              <th className="py-1.5 px-1 bg-slate-100 sticky top-0">ITEM</th>
              <th className="py-1.5 px-1 text-center whitespace-nowrap bg-slate-100 sticky top-0">DATE</th>
              <th className="py-1.5 px-0.5 text-center w-6 bg-slate-100 sticky top-0">QTY</th>
              <th className="py-1.5 px-1 text-center bg-slate-100 sticky top-0">TOKO</th>
              <th className="py-1.5 px-1 text-center bg-slate-100 sticky top-0">PAYMENT</th>
              <th className="py-1.5 px-1 text-center bg-slate-100 sticky top-0">DELIVERY</th>
              <th className="py-1.5 px-1 text-right whitespace-nowrap bg-slate-100 sticky top-0">H. JUAL</th>
              <th className="py-1.5 px-1 text-right whitespace-nowrap bg-slate-100 sticky top-0">H. BELI</th>
              <th className="py-1.5 px-1 text-center w-8 bg-slate-100 sticky top-0">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {paginatedGroups.map((group) => {
              const rowSpan = group.items.length;
              return group.items.map((item, itemIdx) => {
                const isFirst = itemIdx === 0;
                const isLastInGroup = itemIdx === rowSpan - 1;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/90 transition-colors group ${
                      isLastInGroup ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'
                    }`}
                  >
                    {/* 1. NOMER (MERGED) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-0.5 text-center font-mono text-[9px] text-slate-500 font-bold bg-slate-50/40 align-middle border-r border-slate-100"
                      >
                        {group.groupIndex}
                      </td>
                    )}

                    {/* 2. DAPUR (MERGED) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-1 text-center whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <span className="inline-block bg-slate-100 text-slate-800 font-extrabold px-1.5 py-0.5 rounded text-[9px] border border-slate-200/80">
                          {group.tujuanDapur}
                        </span>
                      </td>
                    )}

                    {/* 3. ITEM (PER ITEM) */}
                    <td className="py-1 px-1 align-middle">
                      <div className="font-bold text-slate-900 text-[9.5px] leading-tight">
                        {item.namaBarang}
                      </div>
                      <div className="text-[8px] text-slate-500 font-mono font-medium">
                        {item.pemasok}
                      </div>
                    </td>

                    {/* 4. DATE (MERGED) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-1 text-center font-mono whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <span className="font-bold text-slate-800 text-[9px] bg-slate-100/80 px-1 py-0.2 rounded border border-slate-200/60">
                          {formatTanggalDisatuin(group.tanggal)}
                        </span>
                      </td>
                    )}

                    {/* 5. QTY (PER ITEM) */}
                    <td className="py-1 px-0.5 text-center font-black font-mono text-[9.5px] text-slate-900 align-middle">
                      {item.qty}
                    </td>

                    {/* 6. TOKO (MERGED) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-1 text-center whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] border ${getTokoBadgeStyle(group.toko)}`}>
                          {group.toko}
                        </span>
                      </td>
                    )}

                    {/* 7. PAYMENT (ONE CLICK TOGGLE) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-1 text-center whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus: PaymentStatus = group.payStatus === 'PAID' ? 'UNPAID' : 'PAID';
                            handleGroupPaymentChange(group.items, nextStatus);
                          }}
                          className={`text-[8.5px] font-black px-2 py-0.5 rounded border cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 mx-auto ${
                            group.payStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                          }`}
                          title="Klik 1x untuk ubah status Payment (PAID / UNPAID)"
                        >
                          <span>{group.payStatus === 'PAID' ? 'PAID' : 'UNPAID'}</span>
                        </button>
                      </td>
                    )}

                    {/* 8. DELIVERY (ONE CLICK TOGGLE) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-1 text-center whitespace-nowrap align-middle border-r border-slate-100"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const nextStatus: DeliveryStatus = group.delStatus === 'DONE' ? 'PENDING' : 'DONE';
                            handleGroupDeliveryChange(group.items, nextStatus);
                          }}
                          className={`text-[8.5px] font-black px-2 py-0.5 rounded border cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 mx-auto ${
                            group.delStatus === 'DONE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                          title="Klik 1x untuk ubah status Delivery (DONE / PENDING)"
                        >
                          <span>{group.delStatus === 'DONE' ? 'DONE' : 'PENDING'}</span>
                        </button>
                      </td>
                    )}

                    {/* 9. H. JUAL (PER ITEM) */}
                    <td className="py-1 px-1 text-right whitespace-nowrap align-middle">
                      <div className="font-bold text-slate-900 font-mono text-[9px]">
                        {formatRupiah(item.qty * item.hargaJual)}
                      </div>
                      <div className="text-[7.5px] text-slate-400 font-mono">
                        @{formatRupiah(item.hargaJual)}
                      </div>
                    </td>

                    {/* 10. H. BELI (PER ITEM) */}
                    <td className="py-1 px-1 text-right whitespace-nowrap align-middle">
                      <div className="font-semibold text-slate-600 font-mono text-[9px]">
                        {formatRupiah(item.qty * item.hargaBeli)}
                      </div>
                      <div className="text-[7.5px] text-slate-400 font-mono">
                        @{formatRupiah(item.hargaBeli)}
                      </div>
                    </td>

                    {/* 11. AKSI (MERGED) */}
                    {isFirst && (
                      <td
                        rowSpan={rowSpan}
                        className="py-1 px-0.5 text-center relative align-middle border-l border-slate-100"
                      >
                        <div className="flex items-center justify-center space-x-0.5">
                          <button
                            onClick={() => {
                              if (onExportInvoicePdf) {
                                onExportInvoicePdf(group.items, group.tujuanDapur, group.toko, group.tanggal);
                              } else {
                                onOpenInvoiceModal(group.items, group.tujuanDapur, group.toko);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-900 font-extrabold shadow-2xs transition-all active:scale-95 border border-amber-500/80 cursor-pointer"
                            title="Export Invoice PDF (Google Docs Template)"
                          >
                            <Printer className="w-3.5 h-3.5 stroke-[2.5]" />
                          </button>

                          <div className="relative" ref={activeMenuId === group.id ? menuRef : null}>
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === group.id ? null : group.id)}
                              className={`p-0.5 rounded transition-colors ${
                                activeMenuId === group.id
                                  ? 'bg-slate-200 text-slate-900'
                                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                              title="Menu Aksi"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            <AnimatePresence>
                              {activeMenuId === group.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  transition={{ duration: 0.1 }}
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-left"
                                >
                                  {group.items.map((it) => (
                                    <div key={it.id} className="px-2.5 py-1 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                      <div className="text-[9.5px] font-bold text-slate-800 truncate">{it.namaBarang}</div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            onEditOrder(it);
                                          }}
                                          className="text-[9px] text-emerald-600 hover:underline font-bold"
                                        >
                                          Edit
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            onDuplicateOrder(it);
                                          }}
                                          className="text-[9px] text-indigo-600 hover:underline font-bold"
                                        >
                                          Duplikat
                                        </button>
                                        <span className="text-slate-300">|</span>
                                        <button
                                          onClick={() => {
                                            setActiveMenuId(null);
                                            onDeleteOrder(it.id);
                                          }}
                                          className="text-[9px] text-rose-600 hover:underline font-bold"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

