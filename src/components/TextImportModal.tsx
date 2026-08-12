import React, { useState } from 'react';
import { X, FileText, Check, AlertCircle, Sparkles, PlusCircle } from 'lucide-react';
import { TextParseResult, Kitchen, Store as StoreType } from '../types';
import { parseWhatsAppText } from '../lib/parserWA';
import { motion, AnimatePresence } from 'motion/react';

interface TextImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportItems: (items: TextParseResult[], targetDate: string) => void;
  kitchens: Kitchen[];
  stores: StoreType[];
  pemasokList: string[];
  selectedDate: string;
}

export const TextImportModal: React.FC<TextImportModalProps> = ({
  isOpen,
  onClose,
  onImportItems,
  kitchens,
  stores,
  pemasokList,
  selectedDate,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedItems, setParsedItems] = useState<TextParseResult[]>([]);
  const [defaultToko, setDefaultToko] = useState(stores[0]?.nama || 'HTG');
  const [defaultDapur, setDefaultDapur] = useState(kitchens[0]?.nama || 'Siliragung');
  const [defaultPemasok, setDefaultPemasok] = useState(pemasokList[0] || 'Pemasok 1');
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [isParsed, setIsParsed] = useState(false);

  if (!isOpen) return null;

  const sampleTemplate = `Contoh Format Pesanan WhatsApp:
1. Beras Premium 5 kg @ 14000 / 16500
2. Minyak Goreng Filma 10L hb 32000 hj 37000
3. Daging Ayam 3 kg - 45000
4. Telur Ayam 2 karton @ 370000 hj 400000`;

  const handleParse = () => {
    if (!rawText.trim()) {
      alert('Masukkan teks laporan WhatsApp terlebih dahulu.');
      return;
    }

    const items = parseWhatsAppText(rawText, defaultToko, defaultDapur, defaultPemasok);
    setParsedItems(items);
    setIsParsed(true);
  };

  const handleItemChange = (index: number, field: keyof TextParseResult, value: any) => {
    const updated = [...parsedItems];
    updated[index] = { ...updated[index], [field]: value };
    setParsedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setParsedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmSave = () => {
    if (parsedItems.length === 0) {
      alert('Tidak ada item untuk diimpor');
      return;
    }
    onImportItems(parsedItems, targetDate);
    // Reset and close
    setRawText('');
    setParsedItems([]);
    setIsParsed(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-md no-print">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="clay-card bg-white/95 w-full max-w-3xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-[#4f46e5] to-[#6366f1] text-white flex items-center justify-between border-b border-white/30">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-extrabold">Import Pesanan dari Teks WhatsApp</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            {/* Step 1: Input Controls & Textarea */}
            {!isParsed ? (
              <div className="space-y-4">
                <div className="clay-card-flat p-4 rounded-2xl flex items-start gap-3 text-xs text-indigo-900">
                  <Sparkles className="w-5 h-5 text-[#4f46e5] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold mb-0.5 text-slate-800">Parser Teks Otomatis</p>
                    <p className="text-slate-600 font-medium">
                      Paste teks pesan/catatan WhatsApp di bawah ini. Sistem akan mengekstrak nama barang, jumlah qty, dan harga secara otomatis.
                    </p>
                  </div>
                </div>

                {/* Default Selectors for Bulk Assign */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Tanggal Pesanan</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full p-2.5 clay-input text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Default Toko</label>
                    <select
                      value={defaultToko}
                      onChange={(e) => setDefaultToko(e.target.value)}
                      className="w-full p-2.5 clay-input text-xs font-bold"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.nama}>{s.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Default Dapur</label>
                    <select
                      value={defaultDapur}
                      onChange={(e) => setDefaultDapur(e.target.value)}
                      className="w-full p-2.5 clay-input text-xs font-bold"
                    >
                      {kitchens.map((k) => (
                        <option key={k.id} value={k.nama}>{k.nama}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-extrabold text-slate-700 mb-1">Default Pemasok</label>
                    <select
                      value={defaultPemasok}
                      onChange={(e) => setDefaultPemasok(e.target.value)}
                      className="w-full p-2.5 clay-input text-xs font-bold"
                    >
                      {pemasokList.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Textarea */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase">
                      Paste Teks Pesanan
                    </label>
                    <button
                      type="button"
                      onClick={() => setRawText(sampleTemplate)}
                      className="text-[11px] font-extrabold text-[#4f46e5] hover:underline"
                    >
                      Gunakan Contoh Teks
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    placeholder="Contoh: 1. Beras 5kg @ 14000 / 16500..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3.5 clay-input font-mono text-xs font-bold text-slate-800"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleParse}
                  className="w-full py-3.5 px-4 clay-btn-primary text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  Proses & Ekstrak Data
                </button>
              </div>
            ) : (
              /* Step 2: Confirmation & Preview Table */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Hasil Ekstraksi ({parsedItems.length} Item)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsParsed(false)}
                    className="text-xs font-extrabold text-[#4f46e5] hover:underline"
                  >
                    Edit Teks Kembali
                  </button>
                </div>

                {parsedItems.length === 0 ? (
                  <div className="clay-badge-rose p-4 rounded-2xl text-xs flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Tidak ada data barang yang terdeteksi. Silakan periksa kembali teks yang di-paste.
                  </div>
                ) : (
                  <div className="overflow-x-auto clay-card-flat p-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-indigo-100 font-extrabold text-slate-700">
                          <th className="p-2.5">Nama Barang</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5">Harga Beli</th>
                          <th className="p-2.5">Harga Jual</th>
                          <th className="p-2.5">Tujuan Dapur</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-white/60">
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.namaBarang}
                                onChange={(e) => handleItemChange(idx, 'namaBarang', e.target.value)}
                                className="w-full p-1.5 clay-input text-xs font-bold"
                              />
                            </td>
                            <td className="p-2 w-16">
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 1)}
                                className="w-full p-1.5 clay-input text-xs font-bold text-center"
                              />
                            </td>
                            <td className="p-2 w-28">
                              <input
                                type="number"
                                value={item.hargaBeli}
                                onChange={(e) => handleItemChange(idx, 'hargaBeli', parseInt(e.target.value) || 0)}
                                className="w-full p-1.5 clay-input text-xs font-bold"
                              />
                            </td>
                            <td className="p-2 w-28">
                              <input
                                type="number"
                                value={item.hargaJual}
                                onChange={(e) => handleItemChange(idx, 'hargaJual', parseInt(e.target.value) || 0)}
                                className="w-full p-1.5 clay-input text-xs font-bold"
                              />
                            </td>
                            <td className="p-2 w-36">
                              <select
                                value={item.tujuanDapur}
                                onChange={(e) => handleItemChange(idx, 'tujuanDapur', e.target.value)}
                                className="w-full p-1.5 clay-input text-xs font-bold"
                              >
                                {kitchens.map((k) => (
                                  <option key={k.id} value={k.nama}>{k.nama}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2 text-center w-12">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setIsParsed(false)}
                    className="px-4 py-2.5 clay-btn text-xs font-bold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={parsedItems.length === 0}
                    className="px-6 py-2.5 clay-badge-green text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Konfirmasi & Simpan Semua ({parsedItems.length} Item)
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
