import React, { useState, useEffect } from 'react';
import { 
  X, 
  Utensils, 
  Store as StoreIcon, 
  Truck, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Database, 
  RefreshCw, 
  UploadCloud, 
  DownloadCloud, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  Download,
  Smartphone,
  AlertTriangle,
  FileText,
  Upload,
  FileCheck,
  Folder,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { Kitchen, Store as StoreType, OrderItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  supabaseUrl, 
  testSupabaseConnection, 
  pushOrdersToSupabase, 
  fetchOrdersFromSupabase, 
  SUPABASE_SQL_SCHEMA,
  SUPABASE_STORAGE_RLS_SQL,
  uploadTemplateToSupabaseBucket
} from '../lib/supabase';
import { 
  getCustomTemplateUrl, 
  setCustomTemplateUrl, 
  downloadDocxInvoice, 
  INVOICE_TEMPLATES 
} from '../lib/docxTemplate';

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
  const [activeTab, setActiveTab] = useState<'dapur' | 'toko' | 'pemasok' | 'template' | 'supabase' | 'install'>('dapur');

  // Form states for adding/editing
  const [newKitchenName, setNewKitchenName] = useState('');
  const [newKitchenLocation, setNewKitchenLocation] = useState('');
  const [editingKitchenId, setEditingKitchenId] = useState<string | null>(null);

  const [newStoreName, setNewStoreName] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  const [newPemasokName, setNewPemasokName] = useState('');

  // Supabase states
  const [testingConnection, setTestingConnection] = useState(false);
  const [connStatus, setConnStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  // DOCX / PDF Template States
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<File | null>(null);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCustomTemplateUrl, setActiveCustomTemplateUrl] = useState<string | null>(getCustomTemplateUrl());
  const [customTemplateName, setCustomTemplateName] = useState<string | null>(
    localStorage.getItem('custom_docx_template_name')
  );
  const [copiedStorageSql, setCopiedStorageSql] = useState(false);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const appLogoUrl = "https://vkrgybebgnnaxzzcfjpn.supabase.co/storage/v1/object/public/LOGO/Rekap%20Dapur%20pro.png";

  useEffect(() => {
    setActiveCustomTemplateUrl(getCustomTemplateUrl());
    setCustomTemplateName(localStorage.getItem('custom_docx_template_name'));
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!isOpen) return null;

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert('Untuk meng-install "Rekap Dapur Pro" di Android / Desktop / iOS:\n\n1. Buka menu browser (titik tiga di kanan atas).\n2. Pilih "Tambahkan ke Layar Utama" / "Add to Home Screen" atau "Install App".');
    }
  };

  const handleDeleteAllDataConfirm = () => {
    if (window.confirm('PERINGATAN DANGER ZONE!\n\nApakah Anda yakin ingin MENGHAPUS SEMUA DATA PESANAN di aplikasi ini? Tindakan ini tidak dapat dibatalkan!')) {
      if (onDeleteAllData) {
        onDeleteAllData();
      } else if (onUpdateOrders) {
        onUpdateOrders([]);
      }
      setSyncMessage({ type: 'success', text: 'Seluruh data pesanan lokal berhasil dihapus bersih.' });
    }
  };


  // Test connection
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnStatus(null);
    const res = await testSupabaseConnection();
    setConnStatus(res);
    setTestingConnection(false);
  };

  // Upload orders
  const handleUploadOrders = async () => {
    if (!orders || orders.length === 0) {
      setSyncMessage({ type: 'error', text: 'Tidak ada data pesanan lokal untuk di-upload' });
      return;
    }
    setUploading(true);
    setSyncMessage(null);
    const res = await pushOrdersToSupabase(orders);
    if (res.success) {
      setSyncMessage({ type: 'success', text: res.message });
    } else {
      setSyncMessage({ type: 'error', text: res.message });
    }
    setUploading(false);
  };

  // Download orders
  const handleDownloadOrders = async () => {
    if (!onUpdateOrders) return;
    setDownloading(true);
    setSyncMessage(null);
    const res = await fetchOrdersFromSupabase();
    if (res.error) {
      setSyncMessage({ type: 'error', text: `Gagal ambil data: ${res.error}` });
    } else if (res.data) {
      onUpdateOrders(res.data);
      setSyncMessage({
        type: 'success',
        text: `Berhasil mengunduh & memperbarui ${res.data.length} pesanan dari Supabase!`,
      });
    }
    setDownloading(false);
  };

  // Copy SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Kitchen Handlers
  const handleAddOrUpdateKitchen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKitchenName.trim()) return;

    if (editingKitchenId) {
      onUpdateKitchens(
        kitchens.map((k) =>
          k.id === editingKitchenId
            ? { ...k, nama: newKitchenName.trim(), lokasi: newKitchenLocation.trim() }
            : k
        )
      );
      setEditingKitchenId(null);
    } else {
      const newKitchen: Kitchen = {
        id: `kt-${Date.now()}`,
        nama: newKitchenName.trim(),
        lokasi: newKitchenLocation.trim() || undefined,
      };
      onUpdateKitchens([...kitchens, newKitchen]);
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
    if (kitchens.length <= 1) {
      alert('Minimal harus ada 1 dapur dalam daftar.');
      return;
    }
    onUpdateKitchens(kitchens.filter((k) => k.id !== id));
  };

  // Store Handlers
  const handleAddOrUpdateStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;

    if (editingStoreId) {
      onUpdateStores(
        stores.map((s) => (s.id === editingStoreId ? { ...s, nama: newStoreName.trim() } : s))
      );
      setEditingStoreId(null);
    } else {
      const newStore: StoreType = {
        id: `st-${Date.now()}`,
        nama: newStoreName.trim(),
      };
      onUpdateStores([...stores, newStore]);
    }

    setNewStoreName('');
  };

  const handleEditStore = (s: StoreType) => {
    setEditingStoreId(s.id);
    setNewStoreName(s.nama);
  };

  const handleDeleteStore = (id: string) => {
    if (stores.length <= 1) {
      alert('Minimal harus ada 1 toko dalam daftar.');
      return;
    }
    onUpdateStores(stores.filter((s) => s.id !== id));
  };

  // Pemasok Handlers
  const handleAddPemasok = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPemasokName.trim()) return;
    if (pemasokList.includes(newPemasokName.trim())) {
      alert('Nama pemasok sudah ada');
      return;
    }
    onUpdatePemasok([...pemasokList, newPemasokName.trim()]);
    setNewPemasokName('');
  };

  const handleDeletePemasok = (nama: string) => {
    if (pemasokList.length <= 1) {
      alert('Minimal harus ada 1 pemasok dalam daftar.');
      return;
    }
    onUpdatePemasok(pemasokList.filter((p) => p !== nama));
  };

  // Custom DOCX Template Handlers
  const handleCopyStorageSql = () => {
    navigator.clipboard.writeText(SUPABASE_STORAGE_RLS_SQL);
    setCopiedStorageSql(true);
    setTimeout(() => setCopiedStorageSql(false), 3000);
  };

  const handleUseLocalDocx = () => {
    if (!selectedTemplateFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCustomTemplateUrl(dataUrl, selectedTemplateFile.name);
        setActiveCustomTemplateUrl(dataUrl);
        setCustomTemplateName(selectedTemplateFile.name);
        setTemplateStatus({
          type: 'success',
          text: `Berhasil menyimpan & mengaktifkan template '${selectedTemplateFile.name}' secara lokal di browser!`,
        });
        setSelectedTemplateFile(null);
      }
    };
    reader.readAsDataURL(selectedTemplateFile);
  };

  const handleUploadCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateFile) {
      setTemplateStatus({ type: 'error', text: 'Silakan pilih file template format .docx terlebih dahulu' });
      return;
    }
    setUploadingTemplate(true);
    setTemplateStatus(null);

    const res = await uploadTemplateToSupabaseBucket(selectedTemplateFile);
    if (res.success && res.publicUrl) {
      setCustomTemplateUrl(res.publicUrl, selectedTemplateFile.name);
      setActiveCustomTemplateUrl(res.publicUrl);
      setCustomTemplateName(selectedTemplateFile.name);
      setTemplateStatus({ type: 'success', text: res.message });
      setSelectedTemplateFile(null);
    } else {
      setTemplateStatus({ type: 'error', text: res.message });
    }
    setUploadingTemplate(false);
  };

  const handleResetCustomTemplate = () => {
    setCustomTemplateUrl(null);
    setActiveCustomTemplateUrl(null);
    setCustomTemplateName(null);
    setTemplateStatus({ type: 'success', text: 'Template kustom berhasil di-reset. Menggunakan template default toko.' });
  };

  const handleTestSampleDocxExport = async () => {
    try {
      const sampleItems: OrderItem[] = orders.length > 0 ? orders.slice(0, 3) : [
        {
          id: 'sample-1',
          namaBarang: 'Beras Premium 5kg',
          qty: 2,
          hargaBeli: 60000,
          hargaJual: 72000,
          toko: stores[0]?.nama || 'HTG',
          tujuanDapur: kitchens[0]?.nama || 'Dapur Utama',
          pemasok: pemasokList[0] || 'Supplier 1',
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs no-print font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              Pengaturan Master Data & Supabase
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20 transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('dapur')}
              className={`flex-1 min-w-[90px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'dapur'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Dapur
            </button>
            <button
              onClick={() => setActiveTab('toko')}
              className={`flex-1 min-w-[90px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'toko'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <StoreIcon className="w-3.5 h-3.5" />
              Toko
            </button>
            <button
              onClick={() => setActiveTab('pemasok')}
              className={`flex-1 min-w-[90px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'pemasok'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Pemasok ({pemasokList.length})
            </button>
            <button
              onClick={() => setActiveTab('template')}
              className={`flex-1 min-w-[125px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'template'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              Template PDF/DOCX
            </button>
            <button
              onClick={() => setActiveTab('supabase')}
              className={`flex-1 min-w-[110px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'supabase'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              Supabase
            </button>
            <button
              onClick={() => setActiveTab('install')}
              className={`flex-1 min-w-[95px] py-3 px-2 flex items-center justify-center gap-1 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'install'
                  ? 'border-indigo-600 text-indigo-700 bg-white font-black'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              Install APK
            </button>
          </div>


          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {/* SUB-TAB 1: KELOLA DAPUR */}
            {activeTab === 'dapur' && (
              <div className="space-y-4">
                <form onSubmit={handleAddOrUpdateKitchen} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase">
                    {editingKitchenId ? 'Edit Data Dapur' : 'Tambah Dapur Baru'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nama Dapur (misal: Dapur Utama)"
                      required
                      value={newKitchenName}
                      onChange={(e) => setNewKitchenName(e.target.value)}
                      className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    />
                    <input
                      type="text"
                      placeholder="Lokasi / Keterangan (Opsional)"
                      value={newKitchenLocation}
                      onChange={(e) => setNewKitchenLocation(e.target.value)}
                      className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    {editingKitchenId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingKitchenId(null);
                          setNewKitchenName('');
                          setNewKitchenLocation('');
                        }}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700"
                    >
                      {editingKitchenId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {editingKitchenId ? 'Simpan' : 'Tambah Dapur'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Daftar Dapur Aktif</label>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {kitchens.map((k) => (
                      <div key={k.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                        <div>
                          <p className="font-bold text-slate-800">{k.nama}</p>
                          {k.lokasi && <p className="text-[11px] text-slate-400">{k.lokasi}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditKitchen(k)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteKitchen(k.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
                <form onSubmit={handleAddOrUpdateStore} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase">
                    {editingStoreId ? 'Edit Nama Toko' : 'Tambah Toko Baru'}
                  </h3>
                  <div className="flex gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nama Toko (misal: Toko 5)"
                      required
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    />
                    {editingStoreId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStoreId(null);
                          setNewStoreName('');
                        }}
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700"
                    >
                      {editingStoreId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {editingStoreId ? 'Simpan' : 'Tambah Toko'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Daftar Toko Aktif</label>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {stores.map((s) => (
                      <div key={s.id} className="p-3 bg-white flex items-center justify-between text-xs hover:bg-slate-50">
                        <span className="font-bold text-slate-800">{s.nama}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditStore(s)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStore(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
                <form onSubmit={handleAddPemasok} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase">Tambah Pemasok Baru</h3>
                  <div className="flex gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Nama Pemasok / Daerah"
                      required
                      value={newPemasokName}
                      onChange={(e) => setNewPemasokName(e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-indigo-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Tambah
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">
                    Daftar Pemasok ({pemasokList.length} Pemasok)
                  </label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                    {pemasokList.map((p, idx) => (
                      <div
                        key={p}
                        className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate">{idx + 1}. {p}</span>
                        <button
                          type="button"
                          onClick={() => handleDeletePemasok(p)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 4: CUSTOM TEMPLATE DOCX / PDF */}
            {activeTab === 'template' && (
              <div className="space-y-5 text-xs text-slate-700 font-sans">
                {/* Supabase Bucket Path Target Info Card */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-sky-400" />
                      <span className="font-extrabold text-sm">Target Storage Supabase Bucket</span>
                    </div>
                    <span className="bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Files &gt; Buckets &gt; content
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    Upload template file <strong>.docx</strong> kustom Anda ke wadah Supabase Storage (<strong>Files &gt; Buckets &gt; content</strong>) untuk pencetakan / export invoice PDF &amp; DOCX dengan format layout khusus.
                  </p>
                </div>

                {/* File Upload Form */}
                <form onSubmit={handleUploadCustomTemplate} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-600" />
                    <span>Upload Template .DOCX Baru</span>
                  </h3>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-slate-600">
                      Pilih File Template (.docx):
                    </label>
                    <input
                      type="file"
                      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setSelectedTemplateFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-700 bg-white border border-slate-300 rounded-xl p-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={uploadingTemplate || !selectedTemplateFile}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer text-xs"
                    >
                      <UploadCloud className={`w-4 h-4 ${uploadingTemplate ? 'animate-bounce' : ''}`} />
                      <span>{uploadingTemplate ? 'Meng-upload ke Supabase...' : 'Upload Ke Bucket Supabase ("content")'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedTemplateFile}
                      onClick={handleUseLocalDocx}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer disabled:opacity-50"
                      title="Gunakan langsung file template ini tanpa tergantung upload Supabase"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Gunakan Langsung (Offline/Lokal)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestSampleDocxExport}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all text-xs cursor-pointer"
                      title="Unduh contoh hasil cetak DOCX dengan data transaksi saat ini"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Uji Export Invoice DOCX</span>
                    </button>
                  </div>

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
                </form>

                {/* Storage RLS Policy Fix Card */}
                <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-amber-950 text-xs">
                        Penyebab Error "new row violates row-level security policy":
                      </h4>
                      <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                        Policy di Supabase Storage Anda saat ini hanya mengizinkan file <strong>JPG</strong> (MIME image/jpeg). Karena file template adalah <strong>.docx</strong>, Supabase otomatis menolaknya.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-[11px] text-slate-800">
                        Solusi 1-Klik: Jalankan SQL Policy Storage di Supabase
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyStorageSql}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-[10px] rounded-lg flex items-center gap-1 transition-all cursor-pointer"
                      >
                        {copiedStorageSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedStorageSql ? 'Tercopy!' : 'Salin SQL Policy'}</span>
                      </button>
                    </div>
                    <pre className="text-[9.5px] font-mono bg-slate-900 text-slate-200 p-2.5 rounded-lg overflow-x-auto leading-normal">
                      {SUPABASE_STORAGE_RLS_SQL}
                    </pre>
                    <p className="text-[10px] text-slate-500 font-medium italic">
                      Atau tekan tombol "Gunakan Langsung (Offline/Lokal)" di atas jika ingin menggunakan template tanpa harus mengubah policy Supabase!
                    </p>
                  </div>
                </div>

                {/* Status Template Aktif & Defaults */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
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
                        Reset ke Template Default Toko
                      </button>
                    )}
                  </div>

                  {activeCustomTemplateUrl ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Menggunakan Template Custom: {customTemplateName || 'Template Custom Supabase'}</span>
                      </div>
                      <a
                        href={activeCustomTemplateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-emerald-700 font-mono underline block truncate hover:text-emerald-900"
                      >
                        {activeCustomTemplateUrl}
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 font-medium">
                        Menggunakan template bawaan default per toko:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                        {Object.entries(INVOICE_TEMPLATES).map(([storeKey, url]) => (
                          <a
                            key={storeKey}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                          >
                            <span className="font-bold text-slate-900">{storeKey}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Template Field / Placeholder Reference Guide */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider block">
                    Daftar Variable / Tag Placeholder (.docx)
                  </span>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Sisipkan tag tag berikut ke dalam file .docx Anda agar otomatis terisi sesuai pesanan dan harga transaksi:
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{dapur}`}</span>
                      <span className="text-slate-500 text-[9px]">Nama Dapur Tujuan</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{toko}`}</span>
                      <span className="text-slate-500 text-[9px]">Nama Toko</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{tanggal}`}</span>
                      <span className="text-slate-500 text-[9px]">Tanggal Transaksi</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{invoiceNumber}`}</span>
                      <span className="text-slate-500 text-[9px]">Nomor Referensi</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{total}`}</span>
                      <span className="text-slate-500 text-[9px]">Total Harga Jual (Rp)</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-indigo-600 font-bold block">{`{bayar}`} &amp; {`{sisa}`}</span>
                      <span className="text-slate-500 text-[9px]">Nominal Bayar &amp; Sisa</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded-xl space-y-1">
                    <p className="font-bold text-white">Loop Tabel Barang ({`{#items}`} ... {`{/items}`}):</p>
                    <p className="text-slate-300">{`{#items}`}</p>
                    <p className="pl-3">{`{no} | {namaBarang} | {banyaknya} | {harga} | {jumlah}`}</p>
                    <p className="text-slate-300">{`{/items}`}</p>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: SUPABASE CLOUD SYNC */}
            {activeTab === 'supabase' && (
              <div className="space-y-5 text-xs text-slate-700">
                {/* Connection Status Card */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="font-extrabold text-sm">Status Supabase Backend</span>
                    </div>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Aktif & Terhubung
                    </span>
                  </div>

                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-slate-400">API URL:</div>
                    <div className="text-emerald-300 font-semibold truncate bg-slate-950 p-2 rounded-lg border border-slate-800">
                      {supabaseUrl}
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all border border-slate-700"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                      <span>{testingConnection ? 'Menguji...' : 'Uji Koneksi DB'}</span>
                    </button>
                  </div>

                  {connStatus && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        connStatus.success
                          ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-800'
                          : 'bg-rose-950/80 text-rose-200 border border-rose-800'
                      }`}
                    >
                      {connStatus.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      )}
                      <span>{connStatus.message}</span>
                    </div>
                  )}
                </div>

                {/* Data Sync Operations */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-wider">
                    Sinkronisasi Pesanan (Database Cloud)
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleUploadOrders}
                      disabled={uploading}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                    >
                      <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-bounce' : ''}`} />
                      <span>{uploading ? 'Meng-upload...' : `Upload ${orders.length} Pesanan`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadOrders}
                      disabled={downloading || !onUpdateOrders}
                      className="p-3 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50"
                    >
                      <DownloadCloud className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                      <span>{downloading ? 'Mengunduh...' : 'Unduh Dari Supabase'}</span>
                    </button>
                  </div>

                  {syncMessage && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        syncMessage.type === 'success'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border border-rose-300'
                      }`}
                    >
                      {syncMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      )}
                      <span>{syncMessage.text}</span>
                    </div>
                  )}
                </div>

                {/* SQL Schema Generator Script */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-[11px] uppercase tracking-wider">
                      SQL Schema Table Generator
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="flex items-center gap-1 text-[11px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin SQL DDL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Jika tabel di Supabase project kamu belum ada, salin script SQL DDL di bawah dan tempelkan di <strong>Supabase SQL Editor</strong>:
                  </p>

                  <pre className="p-3 bg-slate-900 text-emerald-300 font-mono text-[10px] rounded-xl overflow-x-auto max-h-36 leading-relaxed border border-slate-800">
                    {SUPABASE_SQL_SCHEMA}
                  </pre>
                </div>

                {/* DANGER ZONE: DELETE ALL DATA */}
                <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Danger Zone: Hapus Semua Data</span>
                  </div>
                  <p className="text-[11px] text-rose-700/90 font-medium leading-relaxed">
                    Fitur ini akan menghapus seluruh data pesanan lokal di perangkat Anda. Gunakan dengan hati-hati.
                  </p>
                  <button
                    type="button"
                    onClick={handleDeleteAllDataConfirm}
                    className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>HAPUS SEMUA DATA PESANAN</span>
                  </button>
                </div>
              </div>
            )}

            {/* SUB-TAB 5: INSTALL APPLICATION / PWA */}
            {activeTab === 'install' && (
              <div className="space-y-6 text-center py-4 max-w-sm mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative">
                    <div className="absolute -inset-2 bg-indigo-500/20 rounded-3xl blur-md" />
                    <img
                      src={appLogoUrl}
                      alt="Rekap Dapur Pro"
                      className="relative w-24 h-24 object-contain drop-shadow-xl bg-white p-1 rounded-2xl border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      Rekap Dapur Pro
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Pasang aplikasi langsung ke Layar Utama
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleInstallPwa}
                  className="w-full py-3.5 px-5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'Aplikasi Sudah Terpasang' : 'INSTALL REKAP DAPUR PRO'}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

