import React, { useState } from 'react';
import { 
  X, 
  Utensils, 
  Store as StoreIcon, 
  Truck, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Smartphone, 
  AlertTriangle, 
  FileText, 
  Upload, 
  FileCheck, 
  ExternalLink, 
  Receipt, 
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { Kitchen, Store as StoreType, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getCustomTemplateUrl, 
  setCustomTemplateUrl, 
  downloadDocxInvoice, 
  INVOICE_TEMPLATES 
} from '../lib/docxTemplate';
import {
  getGasBaseUrl,
  setGasBaseUrl,
  fetchSheetData,
  GAS_BASE_URL,
  GAS_TOKEN,
} from '../lib/googleSheets';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  kitchens: Kitchen[];
  onUpdateKitchens: (kitchens: Kitchen[]) => void;
  stores: StoreType[];
  onUpdateStores: (stores: StoreType[]) => void;
  pemasokList: string[];
  onUpdatePemasok: (pemasok: string[]) => void;
  orders?: OrderItem[];
  onUpdateOrders?: (orders: OrderItem[]) => void;
  onDeleteAllData?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  kitchens,
  onUpdateKitchens,
  stores,
  onUpdateStores,
  pemasokList,
  onUpdatePemasok,
  orders = [],
  onUpdateOrders,
  onDeleteAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'dapur' | 'toko' | 'pemasok' | 'template' | 'googlesheets' | 'install' | 'danger'>('dapur');

  // Form states for adding/editing Master Data
  const [newKitchenName, setNewKitchenName] = useState('');
  const [newKitchenLocation, setNewKitchenLocation] = useState('');
  const [editingKitchenId, setEditingKitchenId] = useState<string | null>(null);

  const [newStoreName, setNewStoreName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const [newPemasokName, setNewPemasokName] = useState('');

  // DOCX Template States
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<File | null>(null);
  const [templateStatus, setTemplateStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCustomTemplateUrl, setActiveCustomTemplateUrl] = useState<string | null>(getCustomTemplateUrl());
  const [customTemplateName, setCustomTemplateName] = useState<string | null>(
    localStorage.getItem('custom_docx_template_name')
  );

  // Google Sheets states
  const [gasUrlInput, setGasUrlInput] = useState(getGasBaseUrl());
  const [gasTokenInput, setGasTokenInput] = useState(localStorage.getItem('gas_secret_token') || GAS_TOKEN);
  const [testingGas, setTestingGas] = useState(false);
  const [gasTestStatus, setGasTestStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedGasCode, setCopiedGasCode] = useState(false);
  const [showGasCodeText, setShowGasCodeText] = useState(false);

  // Install PWA states
  const [isInstalled, setIsInstalled] = useState(false);

  if (!isOpen) return null;

  // --- KITCHEN HANDLERS ---
  const handleAddOrUpdateKitchen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitchenName.trim()) return;

    if (editingKitchenId) {
      onUpdateKitchens(
        kitchens.map((k) =>
          k.id === editingKitchenId
            ? { ...k, nama: newKitchenName.trim(), lokasi: newKitchenLocation.trim() || undefined }
            : k
        )
      );
      setEditingKitchenId(null);
    } else {
      const newK: Kitchen = {
        id: `k-${Date.now()}`,
        nama: newKitchenName.trim(),
        lokasi: newKitchenLocation.trim() || undefined,
      };
      onUpdateKitchens([...kitchens, newK]);
    }
    setNewKitchenName('');
    setNewKitchenLocation('');
  };

  const handleEditKitchen = (k: Kitchen) => {
    setEditingKitchenId(k.id);
    setNewKitchenName(k.nama);
    setNewKitchenLocation(k.lokasi || '');
  };

  const handleDeleteKitchen = (id: string) => {
    if (confirm('Yakin ingin menghapus dapur ini?')) {
      onUpdateKitchens(kitchens.filter((k) => k.id !== id));
    }
  };

  // --- STORE HANDLERS ---
  const handleAddOrUpdateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    if (editingStoreId) {
      onUpdateStores(
        stores.map((s) => (s.id === editingStoreId ? { ...s, nama: newStoreName.trim() } : s))
      );
      setEditingStoreId(null);
    } else {
      const newS: StoreType = {
        id: `s-${Date.now()}`,
        nama: newStoreName.trim(),
      };
      onUpdateStores([...stores, newS]);
    }
    setNewStoreName('');
  };

  const handleEditStore = (s: StoreType) => {
    setEditingStoreId(s.id);
    setNewStoreName(s.nama);
  };

  const handleDeleteStore = (id: string) => {
    if (confirm('Yakin ingin menghapus toko ini?')) {
      onUpdateStores(stores.filter((s) => s.id !== id));
    }
  };

  // --- PEMASOK HANDLERS ---
  const handleAddPemasok = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPemasokName.trim()) return;
    if (pemasokList.includes(newPemasokName.trim())) {
      alert('Pemasok sudah terdaftar');
      return;
    }
    onUpdatePemasok([...pemasokList, newPemasokName.trim()]);
    setNewPemasokName('');
  };

  const handleDeletePemasok = (name: string) => {
    if (confirm(`Yakin ingin menghapus pemasok "${name}"?`)) {
      onUpdatePemasok(pemasokList.filter((p) => p !== name));
    }
  };

  // --- GOOGLE SHEETS HANDLERS ---
  const handleSaveGasSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setGasBaseUrl(gasUrlInput);
    localStorage.setItem('gas_secret_token', gasTokenInput.trim());
    setGasTestStatus({
      success: true,
      message: 'URL Google Apps Script & Token berhasil disimpan!',
    });
    setTimeout(() => setGasTestStatus(null), 3000);
  };

  const handleTestGasConnection = async () => {
    setTestingGas(true);
    setGasTestStatus(null);
    setGasBaseUrl(gasUrlInput);
    localStorage.setItem('gas_secret_token', gasTokenInput.trim());

    try {
      const res = await fetchSheetData<any>('pesanan');
      if (res.error) {
        setGasTestStatus({
          success: false,
          message: `Gagal: ${res.error}. Pastikan Web App disetel ke "Anyone" (Siapa saja).`,
        });
      } else {
        setGasTestStatus({
          success: true,
          message: `Sukses Terhubung! Terbaca ${res.data.length} baris di sheet "pesanan".`,
        });
      }
    } catch (err: any) {
      setGasTestStatus({
        success: false,
        message: `Error: ${err?.message || 'Tidak dapat menghubungi Web App URL'}`,
      });
    } finally {
      setTestingGas(false);
    }
  };

  // --- TEMPLATE HANDLERS ---
  const handleUseLocalDocx = () => {
    if (!selectedTemplateFile) return;
    const objectUrl = URL.createObjectURL(selectedTemplateFile);
    setCustomTemplateUrl(objectUrl);
    localStorage.setItem('custom_docx_template_name', selectedTemplateFile.name);
    setActiveCustomTemplateUrl(objectUrl);
    setCustomTemplateName(selectedTemplateFile.name);
    setTemplateStatus({
      type: 'success',
      text: `Template lokal "${selectedTemplateFile.name}" aktif untuk sesi browser ini!`,
    });
  };

  const handleResetCustomTemplate = () => {
    setCustomTemplateUrl(null);
    localStorage.removeItem('custom_docx_template_name');
    setActiveCustomTemplateUrl(null);
    setCustomTemplateName(null);
    setTemplateStatus({
      type: 'success',
      text: 'Berhasil di-reset ke template standar default per toko.',
    });
  };

  const handleTestSampleDocxExport = async () => {
    try {
      const sampleItems: OrderItem[] = orders.length > 0 ? orders.slice(0, 3) : [
        {
          id: 'test-1',
          namaBarang: 'Ayam Potong Segar',
          qty: 10,
          hargaBeli: 28000,
          hargaJual: 35000,
          toko: stores[0]?.nama || 'HTG',
          tujuanDapur: kitchens[0]?.nama || 'Dapur Utama',
          pemasok: pemasokList[0] || 'Supplier Utama',
          status: 'pending',
          tanggal: new Date().toISOString().split('T')[0],
          catatan: 'Contoh catatan pesanan'
        }
      ];

      await downloadDocxInvoice({
        storeName: stores[0]?.nama || 'HTG',
        kitchenName: kitchens[0]?.nama || 'Dapur Utama',
        items: sampleItems,
        invoiceNumber: 'INV-SAMPLE-001',
        bayar: 100000,
      });
    } catch (err: any) {
      alert(`Gagal uji export template: ${err?.message || err}`);
    }
  };

  const handleDeleteAllDataConfirm = () => {
    if (
      confirm(
        '⚠️ PERINGATAN: Seluruh data pesanan lokal akan dihapus permanen! Apakah Anda benar-benar yakin?'
      )
    ) {
      if (onDeleteAllData) {
        onDeleteAllData();
      }
    }
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

        {/* Bottom Sheet Container */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[88vh] z-10 border-t border-slate-200/80 overflow-hidden"
        >
          {/* Mobile Drag Indicator */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 leading-none">
                Pengaturan Sistem &amp; Master Data
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Kelola master data toko, dapur, template invoice, dan spreadsheet
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Horizontally Scrollable Modern Tab Bar for Mobile & Desktop */}
          <div className="px-3 py-2 bg-slate-50/90 border-b border-slate-200/80">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
              <button
                type="button"
                onClick={() => setActiveTab('dapur')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dapur'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Dapur ({kitchens.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('toko')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'toko'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <StoreIcon className="w-3.5 h-3.5" />
                <span>Toko ({stores.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pemasok')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'pemasok'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Pemasok ({pemasokList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('template')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'template'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Template DOCX</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('googlesheets')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'googlesheets'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('install')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'install'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                <span>Install APK</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('danger')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'danger'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            {/* SUB-TAB 1: KELOLA DAPUR */}
            {activeTab === 'dapur' && (
              <div className="space-y-4">
                <form onSubmit={handleAddOrUpdateKitchen} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {editingKitchenId ? 'Edit Data Dapur' : 'Tambah Dapur Baru'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nama Dapur (misal: Dapur Utama)"
                      required
                      value={newKitchenName}
                      onChange={(e) => setNewKitchenName(e.target.value)}
                      className="p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-semibold"
                    />
                    <input
                      type="text"
                      placeholder="Lokasi / Keterangan (Opsional)"
                      value={newKitchenLocation}
                      onChange={(e) => setNewKitchenLocation(e.target.value)}
                      className="p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:outline-none font-semibold"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    {editingKitchenId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKitchenId(null);
                          setNewKitchenName('');
                          setNewKitchenLocation('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{editingKitchenId ? 'Simpan Perubahan' : 'Tambah Dapur'}</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Daftar Dapur Aktif ({kitchens.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {kitchens.map((k) => (
                      <div
                        key={k.id}
                        className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{k.nama}</div>
                          {k.lokasi && <div className="text-[11px] text-slate-500 font-medium">{k.lokasi}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditKitchen(k)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKitchen(k.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: KELOLA TOKO */}
            {activeTab === 'toko' && (
              <div className="space-y-4">
                <form onSubmit={handleAddOrUpdateStore} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {editingStoreId ? 'Edit Toko' : 'Tambah Toko Baru'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Toko (Contoh: HTG, PROHE, LUWENG BOGA)"
                      required
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{editingStoreId ? 'Simpan' : 'Tambah'}</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Daftar Toko ({stores.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stores.map((s) => (
                      <div
                        key={s.id}
                        className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all"
                      >
                        <span className="font-extrabold text-xs text-slate-900">{s.nama}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditStore(s)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStore(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 3: KELOLA PEMASOK */}
            {activeTab === 'pemasok' && (
              <div className="space-y-4">
                <form onSubmit={handleAddPemasok} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Tambah Pemasok Baru
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama Pemasok (Contoh: Juragan Ayam, Pasar Rogojampi)"
                      required
                      value={newPemasokName}
                      onChange={(e) => setNewPemasokName(e.target.value)}
                      className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Daftar Pemasok ({pemasokList.length})
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pemasokList.map((p) => (
                      <div
                        key={p}
                        className="p-3 bg-white border border-slate-200/80 rounded-2xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-all"
                      >
                        <span className="font-bold text-xs text-slate-900">{p}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePemasok(p)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: CUSTOM TEMPLATE DOCX */}
            {activeTab === 'template' && (
              <div className="space-y-4 text-xs text-slate-700">
                {/* Offline Print Info Card */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-xl">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-black text-emerald-950 text-xs sm:text-sm block">
                        Cetak Browser Offline (No Limit &amp; Cepat)
                      </span>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Semua file Word .DOCX dikonversi menjadi PDF secara langsung di browser tanpa ketergantungan API eksternal.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Template Aktif & Defaults */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider">
                      Status Template Aktif
                    </span>
                    {activeCustomTemplateUrl && (
                      <button
                        type="button"
                        onClick={handleResetCustomTemplate}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-1 rounded-lg border border-rose-200 transition-colors"
                      >
                        Reset ke Default
                      </button>
                    )}
                  </div>

                  {activeCustomTemplateUrl ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Menggunakan Template Custom: {customTemplateName || 'Template Custom'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 font-medium">
                        Menggunakan template bawaan default per toko:
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        {Object.entries(INVOICE_TEMPLATES).map(([storeKey, url]) => (
                          <a
                            key={storeKey}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all shadow-2xs"
                          >
                            <span className="font-bold text-slate-900">{storeKey}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions for Testing and Selecting Local File */}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestSampleDocxExport}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Uji Export Invoice DOCX</span>
                    </button>
                  </div>
                </div>

                {/* Local Docx Uploader */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Gunakan File .DOCX Kustom dari HP/Komputer</span>
                  </h4>

                  <input
                    type="file"
                    accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => setSelectedTemplateFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-xl p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />

                  {selectedTemplateFile && (
                    <button
                      type="button"
                      onClick={handleUseLocalDocx}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      <span>Gunakan File "{selectedTemplateFile.name}" Sebagai Template</span>
                    </button>
                  )}

                  {templateStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold space-y-1.5 ${
                        templateStatus.type === 'success'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {templateStatus.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                        <span>{templateStatus.text}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Variable Placeholder Reference */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2">
                  <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider block">
                    Daftar Variable / Tag Placeholder (.docx)
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Sisipkan tag tag berikut ke dalam file .docx Anda:
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{dapur}`}</span>
                      <span className="text-slate-500 text-[9px]">Dapur Tujuan</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{toko}`}</span>
                      <span className="text-slate-500 text-[9px]">Nama Toko</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{tanggal}`}</span>
                      <span className="text-slate-500 text-[9px]">Tanggal</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{invoiceNumber}`}</span>
                      <span className="text-slate-500 text-[9px]">No Invoice</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{total}`}</span>
                      <span className="text-slate-500 text-[9px]">Total (Rp)</span>
                    </div>
                    <div className="p-2 bg-white rounded-xl border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{bayar}`} &amp; {`{sisa}`}</span>
                      <span className="text-slate-500 text-[9px]">Nominal Bayar</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: GOOGLE SHEETS */}
            {activeTab === 'googlesheets' && (
              <div className="space-y-4 text-xs text-slate-700">
                <form onSubmit={handleSaveGasSettings} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                      Pengaturan URL Google Apps Script Web App
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      URL Deployment Web App (/exec):
                    </label>
                    <input
                      type="url"
                      value={gasUrlInput}
                      onChange={(e) => setGasUrlInput(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      required
                      className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Token Keamanan:
                    </label>
                    <input
                      type="text"
                      value={gasTokenInput}
                      onChange={(e) => setGasTokenInput(e.target.value)}
                      placeholder="Gakusah"
                      className="w-full text-xs font-mono p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan Konfigurasi URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestGasConnection}
                      disabled={testingGas}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingGas ? 'animate-spin' : ''}`} />
                      <span>{testingGas ? 'Menguji...' : 'Uji Koneksi Sheet'}</span>
                    </button>
                  </div>

                  {gasTestStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-bold space-y-1.5 ${
                        gasTestStatus.success
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {gasTestStatus.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                        )}
                        <span>{gasTestStatus.message}</span>
                      </div>
                    </div>
                  )}
                </form>

                {/* Apps Script Code Copy Card */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[11px] text-amber-950">
                      Script Code.gs (Google Apps Script)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const code = `const TOKEN = "Gakusah";

function doGet(e) {
  const sheetName = (e && e.parameter && e.parameter.sheet) || "pesanan";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  const headers = data[0];
  const rows = data.slice(1).map((row, i) => {
    let obj = { rowIndex: i + 2 };
    headers.forEach((h, idx) => obj[h] = row[idx]);
    return obj;
  }).filter(r => r.ITEM || r.BARANG || r.NO_INVOICE);
  return ContentService.createTextOutput(JSON.stringify(rows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return ContentService.createTextOutput(JSON.stringify({ error: "No post data received" })).setMimeType(ContentService.MimeType.JSON);
  }
  const body = JSON.parse(e.postData.contents);
  if (body.token !== TOKEN) {
    return ContentService.createTextOutput(JSON.stringify({ error: "unauthorized" })).setMimeType(ContentService.MimeType.JSON);
  }
  const sheetName = body.sheet || "pesanan";
  const sheet = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ error: "Sheet not found" })).setMimeType(ContentService.MimeType.JSON);
  const headers = sheet.getDataRange().getValues()[0];
  if (body.action === "add") {
    const newRow = headers.map(h => body.data[h] !== undefined ? body.data[h] : "");
    sheet.appendRow(newRow);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", rowIndex: sheet.getLastRow() })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ error: "unknown action" })).setMimeType(ContentService.MimeType.JSON);
}`;
                        navigator.clipboard.writeText(code);
                        setCopiedGasCode(true);
                        setTimeout(() => setCopiedGasCode(false), 3000);
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      {copiedGasCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedGasCode ? 'Tercopy!' : 'Salin Code.gs'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    Pastikan script di Google Apps Script telah di-deploy sebagai Web App dengan access <strong>"Anyone" (Siapa saja)</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* SUB-TAB 6: INSTALL APK / PWA */}
            {activeTab === 'install' && (
              <div className="space-y-6 text-center py-6 max-w-sm mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center shadow-xl shadow-indigo-500/25">
                    <Receipt className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Rekap Dapur Pro
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Tambahkan ke Layar Utama HP untuk pengalaman seperti aplikasi native.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left space-y-2 text-xs">
                  <span className="font-black text-slate-800 block">Cara Pasang di HP (Android / iOS):</span>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium text-[11px]">
                    <li>Buka menu browser (titik 3 di Chrome atau tombol Bagikan di Safari).</li>
                    <li>Pilih <strong>"Tambahkan ke Layar Utama" (Add to Home Screen)</strong> atau <strong>"Install Aplikasi"</strong>.</li>
                    <li>Aplikasi akan langsung muncul di menu HP Anda!</li>
                  </ol>
                </div>
              </div>
            )}

            {/* SUB-TAB 7: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="bg-rose-50/80 p-5 rounded-2xl border border-rose-200 space-y-3">
                <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>Danger Zone: Hapus Semua Data Pesanan Lokal</span>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-medium">
                  Fitur ini akan membersihkan data pesanan yang tersimpan di perangkat ini. Gunakan hanya jika Anda ingin mereset aplikasi.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteAllDataConfirm}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>HAPUS SELURUH DATA PESANAN LOKAL</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
