import React, { useState, useEffect } from 'react';
import { X, FileText, ArrowRight, User, MapPin, Phone, CreditCard, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderItem, Kitchen } from '../types';
import { parseIndonesianNumber, formatRupiah } from '../lib/formatters';

interface InvoiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  kitchenName?: string;
  storeName?: string;
  kitchens?: Kitchen[];
  onConfirm: (data: {
    items: OrderItem[];
    kitchenName: string;
    storeName: string;
    recipientName: string;
    address: string;
    phone: string;
    bayar: number;
  }) => void;
}

export const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  isOpen,
  onClose,
  items,
  kitchenName = '',
  storeName = '',
  kitchens = [],
  onConfirm,
}) => {
  const [recipientName, setRecipientName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [bayarInput, setBayarInput] = useState<string>('0');
  const [error, setError] = useState('');

  // Calculate total amount for filtered scoped items
  const totalAmount = items.reduce((sum, item) => {
    const q = parseIndonesianNumber(item.qty);
    const p = parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0);
    return sum + q * p;
  }, 0);

  const parsedBayar = parseIndonesianNumber(bayarInput);
  const calculatedSisa = Math.max(0, totalAmount - parsedBayar);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setBayarInput('0');

      const normKitchen = (kitchenName || items[0]?.tujuanDapur || '').trim().toLowerCase();
      const matchedKitchen = kitchens.find(
        (k) => k.nama.trim().toLowerCase() === normKitchen
      );

      // Default prefill values from matched kitchen
      const defaultName = matchedKitchen?.penanggungJawab || matchedKitchen?.nama || kitchenName || items[0]?.tujuanDapur || '';
      const defaultAddress = matchedKitchen?.lokasi || 'Banyuwangi';
      const defaultPhone = '082229992371';

      setRecipientName(defaultName);
      setAddress(defaultAddress);
      setPhone(defaultPhone);
    }
  }, [isOpen, kitchenName, items, kitchens]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipientName.trim()) {
      setError('Nama Penerima wajib diisi');
      return;
    }

    if (parsedBayar > totalAmount) {
      setError('Jumlah bayar tidak boleh melebihi total');
      return;
    }

    const mainKitchen = kitchenName || items[0]?.tujuanDapur || '';
    const mainStore = storeName || items[0]?.toko || '';

    onConfirm({
      items,
      kitchenName: mainKitchen,
      storeName: mainStore,
      recipientName: recipientName.trim(),
      address: address.trim() || 'Banyuwangi',
      phone: phone.trim() || '-',
      bayar: parsedBayar,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Konfirmasi Data Invoice
                </h3>
                <p className="text-[11px] text-slate-400">
                  Lengkapi data penerima & pembayaran sebelum preview
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Input 1: Nama Penerima */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Nama Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                placeholder="e.g. Dapur Singojuruh / Ibu Maria"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                  error && !recipientName.trim()
                    ? 'border-red-500 focus:ring-red-200 bg-red-50/50'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-slate-50 focus:bg-white'
                }`}
                autoFocus
              />
            </div>

            {/* Input 2: Alamat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Alamat
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Banyuwangi"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-indigo-600 focus:ring-indigo-100 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            {/* Input 3: Nomor Telepon/HP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                Nomor Telepon / HP
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 082229992371"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-indigo-600 focus:ring-indigo-100 bg-slate-50 focus:bg-white transition-all"
              />
            </div>

            {/* Input 4: Jumlah Bayar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Jumlah Bayar (Rp)
              </label>
              <input
                type="text"
                value={bayarInput}
                onChange={(e) => {
                  setBayarInput(e.target.value);
                  const val = parseIndonesianNumber(e.target.value);
                  if (val <= totalAmount) setError('');
                }}
                placeholder="0"
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 transition-all ${
                  error && parsedBayar > totalAmount
                    ? 'border-red-500 focus:ring-red-200 bg-red-50/50'
                    : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100 bg-slate-50 focus:bg-white'
                }`}
              />
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-red-700 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Total Transaksi:</span>
                <span className="font-extrabold text-slate-900">{formatRupiah(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Jumlah Bayar:</span>
                <span className="font-extrabold">{formatRupiah(parsedBayar)}</span>
              </div>
              <div className="flex justify-between text-slate-900 pt-1 border-t border-slate-200 font-bold">
                <span>Sisa Pembayaran:</span>
                <span className="font-black text-amber-600">{formatRupiah(calculatedSisa)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer border border-amber-500/80"
              >
                <span>Lanjut ke Preview</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
