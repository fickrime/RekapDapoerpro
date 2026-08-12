import React, { useState, useEffect } from 'react';
import { X, Save, Plus, PackageCheck, Utensils, Store, Truck, Tag, Calendar, Trash2 } from 'lucide-react';
import { OrderItem, Kitchen, Store as StoreType } from '../types';
import { formatRupiah } from '../lib/formatters';
import { motion, AnimatePresence } from 'motion/react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    orderData: Omit<OrderItem, 'id' | 'createdAt'> | Array<Omit<OrderItem, 'id' | 'createdAt'>>,
    editId?: string
  ) => void;
  initialData?: OrderItem | null;
  prefilledKitchen?: string;
  kitchens: Kitchen[];
  stores: StoreType[];
  pemasokList: string[];
  selectedDate: string;
}

interface ItemRow {
  id: string;
  namaBarang: string;
  qty: number | '';
  hargaBeli: number | '';
  hargaJual: number | '';
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  prefilledKitchen,
  kitchens,
  stores,
  pemasokList,
  selectedDate,
}) => {
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [toko, setToko] = useState('');
  const [tujuanDapur, setTujuanDapur] = useState('');
  const [pemasok, setPemasok] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID'>('UNPAID');
  const [deliveryStatus, setDeliveryStatus] = useState<'DONE' | 'PENDING'>('PENDING');
  const [tanggal, setTanggal] = useState(selectedDate);
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    if (initialData) {
      setItemRows([
        {
          id: '1',
          namaBarang: initialData.namaBarang,
          qty: initialData.qty,
          hargaBeli: initialData.hargaBeli,
          hargaJual: initialData.hargaJual,
        },
      ]);
      setToko(initialData.toko);
      setTujuanDapur(initialData.tujuanDapur);
      setPemasok(initialData.pemasok);
      setPaymentStatus(initialData.paymentStatus || (initialData.status === 'selesai' ? 'PAID' : 'UNPAID'));
      setDeliveryStatus(initialData.deliveryStatus || (initialData.status === 'selesai' ? 'DONE' : 'PENDING'));
      setTanggal(initialData.tanggal);
      setCatatan(initialData.catatan || '');
    } else {
      // Reset form for creating new pesanan
      setItemRows([
        {
          id: Date.now().toString(),
          namaBarang: '',
          qty: 1,
          hargaBeli: '',
          hargaJual: '',
        },
      ]);
      setToko('');
      setTujuanDapur(prefilledKitchen || '');
      setPemasok('');
      setPaymentStatus('UNPAID');
      setDeliveryStatus('PENDING');
      setTanggal(selectedDate || new Date().toISOString().split('T')[0]);
      setCatatan('');
    }
  }, [initialData, prefilledKitchen, isOpen, kitchens, stores, pemasokList, selectedDate]);

  if (!isOpen) return null;

  const addItemRow = () => {
    setItemRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        namaBarang: '',
        qty: 1,
        hargaBeli: '',
        hargaJual: '',
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (itemRows.length <= 1) return;
    setItemRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateItemRow = (id: string, field: keyof ItemRow, value: any) => {
    setItemRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const isFormValid =
    tanggal.trim() !== '' &&
    toko !== '' &&
    toko !== '-' &&
    tujuanDapur !== '' &&
    tujuanDapur !== '-' &&
    pemasok !== '' &&
    pemasok !== '-' &&
    itemRows.length > 0 &&
    itemRows.every(
      (r) =>
        r.namaBarang.trim() !== '' &&
        r.qty !== '' &&
        Number(r.qty) > 0 &&
        r.hargaBeli !== '' &&
        Number(r.hargaBeli) >= 0 &&
        r.hargaJual !== '' &&
        Number(r.hargaJual) >= 0
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      alert('Mohon lengkapi semua kolom wajib (Tanggal, Nama Barang, Toko, Dapur, Pemasok, Harga Beli, Harga Jual, Qty).');
      return;
    }

    const calculatedStatus =
      deliveryStatus === 'DONE' && paymentStatus === 'PAID' ? 'selesai' : 'pending';

    if (initialData) {
      // Editing a single existing order
      const firstRow = itemRows[0];
      onSave(
        {
          namaBarang: firstRow.namaBarang.trim(),
          qty: Number(firstRow.qty) || 1,
          hargaBeli: Number(firstRow.hargaBeli) || 0,
          hargaJual: Number(firstRow.hargaJual) || 0,
          toko,
          tujuanDapur,
          pemasok,
          status: calculatedStatus,
          paymentStatus,
          deliveryStatus,
          tanggal,
          catatan,
        },
        initialData.id
      );
    } else {
      // Adding one or multiple order items
      const payload = itemRows.map((row) => ({
        namaBarang: row.namaBarang.trim(),
        qty: Number(row.qty) || 1,
        hargaBeli: Number(row.hargaBeli) || 0,
        hargaJual: Number(row.hargaJual) || 0,
        toko,
        tujuanDapur,
        pemasok,
        status: calculatedStatus,
        paymentStatus,
        deliveryStatus,
        tanggal,
        catatan,
      }));
      onSave(payload);
    }

    onClose();
  };

  const grandTotalBeli = itemRows.reduce(
    (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.hargaBeli) || 0),
    0
  );
  const grandTotalJual = itemRows.reduce(
    (sum, r) => sum + (Number(r.qty) || 0) * (Number(r.hargaJual) || 0),
    0
  );
  const grandTotalProfit = grandTotalJual - grandTotalBeli;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-md no-print">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="clay-card bg-white/95 w-full max-w-xl rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col border border-white"
        >
          {/* Header with Compact Small Date Input Tucked In */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white flex items-center justify-between border-b border-white/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <PackageCheck className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm sm:text-base font-extrabold">
                {initialData ? 'Edit Pesanan' : 'Tambah Pesanan'}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              {/* Tanggal Kecil Nyelip di Atas */}
              <div className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-lg border border-white/30 text-[11px] font-bold">
                <Calendar className="w-3 h-3 text-white" />
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="bg-transparent text-white font-mono focus:outline-none cursor-pointer text-[11px]"
                />
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* List of Items / Barang */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  DAFTAR BARANG PESANAN ({itemRows.length})
                </span>
              </div>

              {itemRows.map((row, index) => {
                const subBeli = (Number(row.qty) || 0) * (Number(row.hargaBeli) || 0);
                const subJual = (Number(row.qty) || 0) * (Number(row.hargaJual) || 0);

                return (
                  <div
                    key={row.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md font-mono">
                        # BARANG {index + 1}
                      </span>
                      {itemRows.length > 1 && !initialData && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(row.id)}
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition-colors"
                          title="Hapus Barang Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Nama Barang */}
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                        NAMA BARANG
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Ayam Fillet, Yali 80, Minyak Goreng..."
                        value={row.namaBarang}
                        onChange={(e) => updateItemRow(row.id, 'namaBarang', e.target.value)}
                        className="w-full px-3 py-2 clay-input text-xs text-slate-900 font-bold"
                      />
                    </div>

                    {/* QTY, HARGA BELI, HARGA JUAL */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1">
                          JUMLAH (QTY)
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={row.qty}
                          onChange={(e) =>
                            updateItemRow(
                              row.id,
                              'qty',
                              e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                          className="w-full px-2.5 py-2 clay-input text-xs text-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-0.5">
                          <Tag className="w-3 h-3 text-slate-400" /> H. BELI
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="0"
                          value={row.hargaBeli}
                          onChange={(e) =>
                            updateItemRow(
                              row.id,
                              'hargaBeli',
                              e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-full px-2.5 py-2 clay-input text-xs text-slate-900 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-0.5">
                          <Tag className="w-3 h-3 text-indigo-500" /> H. JUAL
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="0"
                          value={row.hargaJual}
                          onChange={(e) =>
                            updateItemRow(
                              row.id,
                              'hargaJual',
                              e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          className="w-full px-2.5 py-2 clay-input text-xs text-slate-900 font-bold"
                        />
                      </div>
                    </div>

                    {/* Subtotal preview */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5 px-1">
                      <span>Total Beli: {formatRupiah(subBeli)}</span>
                      <span className="font-bold text-emerald-600">
                        Profit: {formatRupiah(subJual - subBeli)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {!initialData && (
                <button
                  type="button"
                  onClick={addItemRow}
                  className="w-full py-2 border-2 border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all bg-indigo-50/50 hover:bg-indigo-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Tambah Jenis Barang Lain</span>
                </button>
              )}
            </div>

            {/* Total Summary box if multiple items */}
            {itemRows.length > 1 && (
              <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-950 font-mono">
                <span>Total ({itemRows.length} Barang):</span>
                <span className="text-emerald-700">Profit: {formatRupiah(grandTotalProfit)}</span>
              </div>
            )}

            {/* TOKO Dropdown */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-indigo-600" /> TOKO
              </label>
              <select
                value={toko}
                onChange={(e) => setToko(e.target.value)}
                className="w-full px-4 py-2.5 clay-input text-sm text-slate-900 font-bold cursor-pointer"
              >
                <option value="">-</option>
                {stores.map((st) => (
                  <option key={st.id} value={st.nama}>
                    {st.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* DAPUR Dropdown */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-[#4f46e5]" /> DAPUR
              </label>
              <select
                value={tujuanDapur}
                onChange={(e) => setTujuanDapur(e.target.value)}
                className="w-full px-4 py-2.5 clay-input text-sm text-slate-900 font-bold cursor-pointer"
              >
                <option value="">-</option>
                {kitchens.map((k) => (
                  <option key={k.id} value={k.nama}>
                    {k.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* PEMASOK Dropdown */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-indigo-500" /> PEMASOK
              </label>
              <select
                value={pemasok}
                onChange={(e) => setPemasok(e.target.value)}
                className="w-full px-4 py-2.5 clay-input text-sm text-slate-900 font-bold cursor-pointer"
              >
                <option value="">-</option>
                {pemasokList.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment & Delivery Status Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  PAYMENT STATUS
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as any)}
                  className={`w-full px-3 py-2.5 clay-input text-xs font-black cursor-pointer ${
                    paymentStatus === 'PAID'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  DELIVERY STATUS
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value as any)}
                  className={`w-full px-3 py-2.5 clay-input text-xs font-black cursor-pointer ${
                    deliveryStatus === 'DONE'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="DONE">DONE</option>
                </select>
              </div>
            </div>

            {/* CATATAN */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                CATATAN
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Catatan atau rincian tambahan..."
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full px-4 py-2 clay-input text-xs text-slate-900 font-medium"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!isFormValid}
                className={`w-full py-3 px-4 text-white font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
                  isFormValid
                    ? 'clay-btn-primary cursor-pointer active:scale-95'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                }`}
              >
                {initialData ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                {initialData ? 'Simpan Perubahan' : `Tambah ${itemRows.length} Pesanan`}
              </button>
              {!isFormValid && (
                <p className="text-[10px] text-amber-600 font-bold text-center mt-1.5">
                  * Lengkapi Tanggal, Nama Barang, Toko, Dapur, Pemasok, Harga Beli & Harga Jual.
                </p>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
