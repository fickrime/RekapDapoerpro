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
      <div className="fixed inset-0 z-50 flex items-end justify-center no-print font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        />

        {/* Bottom Sheet Modal */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] z-10 border-t border-slate-200/80 overflow-hidden"
        >
          {/* Mobile Drag Indicator */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                  Data Penerima Invoice
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {storeName || items[0]?.toko} • {kitchenName || items[0]?.tujuanDapur} ({items.length} item)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-3.5 overflow-y-auto">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Input 1: Nama Penerima */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Nama Penerima <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Contoh: Dapur Rogojampi / Pak Budi"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Input 2: Alamat */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Alamat Tujuan
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Contoh: Banyuwangi"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Input 3: Telepon */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                No. HP / Kontak
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="082229992371"
                className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Input 4: Nominal Bayar */}
            <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
              <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                Pembayaran Awal / DP (Rp):
              </label>
              <input
                type="number"
                min="0"
                max={totalAmount}
                value={bayarInput}
                onChange={(e) => setBayarInput(e.target.value)}
                placeholder="0"
                className="w-full text-sm font-black px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none text-slate-900"
              />
              <div className="flex items-center justify-between text-[11px] font-bold pt-1 text-slate-600">
                <span>Total: <strong className="text-slate-900">{formatRupiah(totalAmount)}</strong></span>
                <span>Sisa: <strong className="text-rose-600">{formatRupiah(calculatedSisa)}</strong></span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>Lanjut ke Cetak Invoice</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
