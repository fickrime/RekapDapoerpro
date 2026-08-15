import React, { useState } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { 
  OrderItem, 
  Kitchen, 
  Store as StoreType, 
  InvoiceRecord, 
  TextParseResult,
  PaymentStatus,
  DeliveryStatus,
  ExportHistoryItem
} from './types';
import { 
  INITIAL_KITCHENS, 
  INITIAL_STORES, 
  INITIAL_PEMASOK, 
  INITIAL_ORDERS 
} from './constants/initialData';
import { HeaderBanner } from './components/HeaderBanner';
import { BottomNav, TabType } from './components/BottomNav';
import { DashboardView } from './components/DashboardView';
import { TransactionsView } from './components/TransactionsView';
import { OrderModal } from './components/OrderModal';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoiceFormModal } from './components/InvoiceFormModal';
import { TextImportModal } from './components/TextImportModal';
import { ExportModal } from './components/ExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ConfirmModal } from './components/ConfirmModal';
import { ExportHistorySheet } from './components/ExportHistorySheet';
import { SyncBottomSheet } from './components/SyncBottomSheet';
import { Toast, ToastMessage, ToastType } from './components/Toast';
import { SplashScreen } from './components/SplashScreen';
import { generateInvoiceNumber, parseIndonesianNumber } from './lib/formatters';
import { 
  addRow, 
  fetchSheetData, 
  mapRawOrder, 
  mapRawInvoice, 
  buildPesananPayload, 
  buildTransaksiPayload 
} from './lib/googleSheets';
import { exportInvoicePdf, downloadDocxInvoice } from './lib/docxTemplate';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState(true);

  // Persistent State
  const [orders, setOrders] = useLocalStorage<OrderItem[]>('dapur_tracker_orders_v4', INITIAL_ORDERS);
  const [kitchens, setKitchens] = useLocalStorage<Kitchen[]>('dapur_tracker_kitchens_v4', INITIAL_KITCHENS);
  const [stores, setStores] = useLocalStorage<StoreType[]>('dapur_tracker_stores_v4', INITIAL_STORES);
  const [pemasokList, setPemasokList] = useLocalStorage<string[]>('dapur_tracker_pemasok_v4', INITIAL_PEMASOK);
  const [invoices, setInvoices] = useLocalStorage<InvoiceRecord[]>('dapur_tracker_invoices_v4', []);
  const [exportHistory, setExportHistory] = useLocalStorage<ExportHistoryItem[]>('dapur_export_history_v1', []);

  // Google Sheets Sync State
  const [isSyncingGas, setIsSyncingGas] = useState(false);
  const [gasError, setGasError] = useState<string | null>(null);

  // Export background tracking state
  const [isExportingActive, setIsExportingActive] = useState(false);
  const [isExportHistoryOpen, setIsExportHistoryOpen] = useState(false);
  const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ id: `toast-${Date.now()}`, message, type });
  };

  // Fetch sheet data
  const loadSpreadsheetData = async (showToastNotice = false) => {
    setIsSyncingGas(true);
    setGasError(null);
    try {
      const [pesananRes, transaksiRes] = await Promise.all([
        fetchSheetData<any>('pesanan'),
        fetchSheetData<any>('transaksi'),
      ]);

      if (pesananRes.error || transaksiRes.error) {
        const errText = pesananRes.error || transaksiRes.error || 'Gagal koneksi ke Google Sheets';
        console.warn('[GoogleSheets Sync] Skipped local data overwrite:', errText);
        setGasError(errText);
        if (showToastNotice) {
          showToast(`Sinkronisasi Google Sheets Gagal: ${errText}`, 'error');
        }
        return;
      }

      const mappedOrders = (pesananRes.data || []).map(mapRawOrder);
      const mappedInvoices = (transaksiRes.data || []).map(mapRawInvoice);

      if (mappedOrders.length > 0) {
        setOrders(mappedOrders);
      }
      if (mappedInvoices.length > 0) {
        setInvoices(mappedInvoices);
      }

      if (showToastNotice) {
        showToast('Data berhasil disinkronkan dari Google Sheets', 'success');
      }
    } catch (err: any) {
      console.warn('Gagal mengambil data spreadsheet (menggunakan mode data lokal HP):', err);
      setGasError(err?.message || 'Gagal koneksi ke Google Sheets');
    } finally {
      setIsSyncingGas(false);
    }
  };

  React.useEffect(() => {
    loadSpreadsheetData();
  }, []);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Data Sanitization / Migration Effect
  React.useEffect(() => {
    if (stores.some((s) => s.nama.startsWith('Toko '))) {
      setStores(INITIAL_STORES);
    }
    if (pemasokList.some((p) => ['HTG', 'PROHE', 'LUWENG BOGA', 'ADIFRUITA'].includes(p))) {
      setPemasokList(INITIAL_PEMASOK);
    }

    let needUpdate = false;
    const updatedOrders = orders.map((o) => {
      let toko = o.toko;
      let pemasok = o.pemasok;
      let itemChanged = false;

      if (['HTG', 'PROHE', 'LUWENG BOGA', 'ADIFRUITA'].includes(o.pemasok)) {
        toko = o.pemasok;
        pemasok = 'Pemasok 1';
        itemChanged = true;
      }
      if (['Toko 1', 'Toko 2', 'Toko 3', 'Toko 4'].includes(o.toko)) {
        toko = 'HTG';
        itemChanged = true;
      }
      if (['Toko 1', 'Toko 2', 'Toko 3', 'Toko 4'].includes(o.pemasok)) {
        pemasok = 'Pemasok 1';
        itemChanged = true;
      }

      if (itemChanged) {
        needUpdate = true;
        return { ...o, toko, pemasok };
      }
      return o;
    });

    if (needUpdate) {
      setOrders(updatedOrders);
    }
  }, []);

  // Navigation State
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Modal States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [prefilledKitchen, setPrefilledKitchen] = useState<string | undefined>();

  // Invoice Form (Step 1 Confirmation) & Invoice Modal (Step 2 Preview) States
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [invoiceFormItems, setInvoiceFormItems] = useState<OrderItem[]>([]);
  const [invoiceFormKitchen, setInvoiceFormKitchen] = useState<string | undefined>();
  const [invoiceFormStore, setInvoiceFormStore] = useState<string | undefined>();

  const [invoiceRecipientName, setInvoiceRecipientName] = useState('');
  const [invoiceRecipientAddress, setInvoiceRecipientAddress] = useState('');
  const [invoiceRecipientPhone, setInvoiceRecipientPhone] = useState('');
  const [invoiceBayar, setInvoiceBayar] = useState<number>(0);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceTargetKitchen, setInvoiceTargetKitchen] = useState<string | undefined>();
  const [invoiceTargetStore, setInvoiceTargetStore] = useState<string | undefined>();

  const [isTextImportOpen, setIsTextImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Handlers for Order CRUD
  const handleToggleStatus = (id: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, status: o.status === 'pending' ? 'selesai' : 'pending' } : o
      )
    );
  };

  const handleUpdatePaymentStatus = (id: string, paymentStatus: PaymentStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const delStatus = o.deliveryStatus || (o.status === 'selesai' ? 'DONE' : 'PENDING');
        return {
          ...o,
          paymentStatus,
          status: paymentStatus === 'PAID' && delStatus === 'DONE' ? 'selesai' : 'pending',
        };
      })
    );
  };

  const handleUpdateDeliveryStatus = (id: string, deliveryStatus: DeliveryStatus) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const payStatus = o.paymentStatus || (o.status === 'selesai' ? 'PAID' : 'UNPAID');
        return {
          ...o,
          deliveryStatus,
          status: payStatus === 'PAID' && deliveryStatus === 'DONE' ? 'selesai' : 'pending',
        };
      })
    );
  };

  const handleDuplicateOrder = async (item: OrderItem) => {
    const duplicated: OrderItem = {
      ...item,
      id: `ord-dup-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };

    // Always preserve data locally
    setOrders((prev) => [duplicated, ...prev]);

    setIsSyncingGas(true);
    const res = await addRow('pesanan', buildPesananPayload(duplicated));
    setIsSyncingGas(false);

    if (res.success) {
      showToast('Pesanan berhasil diduplikasi & tersimpan ke Google Sheets', 'success');
    } else {
      setGasError(res.error || 'Gagal tersambung ke Google Sheets');
      showToast(`Pesanan diduplikasi di HP/Lokal! (Gagal sync Google Sheets: ${res.error || '404 Error'})`, 'error');
    }
  };

  const handleToggleBatchStatus = (targetName: string, date: string, targetStatus: 'pending' | 'selesai') => {
    setOrders((prev) =>
      prev.map((o) =>
        (o.toko === targetName || o.tujuanDapur === targetName) && o.tanggal === date
          ? { ...o, status: targetStatus }
          : o
      )
    );
  };

  const handleSaveOrder = async (
    orderData: Omit<OrderItem, 'id' | 'createdAt'> | Array<Omit<OrderItem, 'id' | 'createdAt'>>,
    editId?: string
  ) => {
    if (editId && !Array.isArray(orderData)) {
      setOrders((prev) =>
        prev.map((o) => (o.id === editId ? { ...o, ...orderData } : o))
      );
      showToast('Pesanan berhasil diperbarui', 'edit');
      return;
    }

    const itemsToAdd = Array.isArray(orderData) ? orderData : [orderData];
    const createdDate = new Date().toISOString();

    const newOrdersAdded: OrderItem[] = itemsToAdd.map((item, idx) => ({
      ...item,
      id: `ord-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      createdAt: createdDate,
    }));

    // Local-First: ALWAYS save new orders to local state & localStorage immediately
    setOrders((prev) => [...newOrdersAdded, ...prev]);

    setIsSyncingGas(true);
    let successCount = 0;
    let lastError = '';

    for (let idx = 0; idx < newOrdersAdded.length; idx++) {
      const newOrderItem = newOrdersAdded[idx];
      const res = await addRow('pesanan', buildPesananPayload(newOrderItem));

      if (res.success) {
        successCount++;
      } else {
        lastError = res.error || 'Gagal menyimpan ke Google Sheets';
      }
    }

    setIsSyncingGas(false);

    if (successCount === newOrdersAdded.length) {
      showToast(`${successCount} pesanan berhasil ditambahkan & tersimpan ke Google Sheets`, 'success');
    } else if (successCount > 0) {
      setGasError(lastError);
      showToast(`Tersimpan lokal. ${successCount}/${newOrdersAdded.length} terkirim ke Sheets (${lastError})`, 'error');
    } else {
      setGasError(lastError);
      showToast(`Pesanan TERSIMPAN DI HP/LOKAL! (Gagal sync Google Sheets: ${lastError})`, 'error');
    }
  };

  const handleDeleteOrder = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Konfirmasi Hapus Pesanan',
      message: 'Apakah Anda yakin ingin menghapus barang ini dari daftar pesanan?',
      onConfirm: () => {
        setOrders((prev) => prev.filter((o) => o.id !== id));
        setConfirmState(null);
        showToast('Pesanan berhasil dihapus', 'delete');
      },
    });
  };

  const handleDeleteKitchenOrders = (targetName: string, date: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Semua Pesanan',
      message: `Hapus semua pesanan untuk ${targetName} pada tanggal ${date}?`,
      onConfirm: () => {
        setOrders((prev) => prev.filter((o) => !((o.toko === targetName || o.tujuanDapur === targetName) && o.tanggal === date)));
        setConfirmState(null);
        showToast('Semua pesanan berhasil dihapus', 'delete');
      },
    });
  };

  const handleOpenEditOrder = (item: OrderItem) => {
    setEditingOrder(item);
    setPrefilledKitchen(item.tujuanDapur);
    setIsOrderModalOpen(true);
  };

  const handleOpenAddModal = (kitchenName?: string) => {
    setEditingOrder(null);
    setPrefilledKitchen(kitchenName);
    setIsOrderModalOpen(true);
  };

  // Handlers for Invoice
  // Step 1: Open Confirmation Form Modal when print icon (🖨) is clicked
  const handleStartInvoiceFlow = (
    items: OrderItem[],
    kitchenName?: string,
    storeName?: string,
    _dateStr?: string
  ) => {
    if (items.length === 0) {
      alert('Tidak ada item untuk dibuatkan invoice');
      return;
    }

    const mainKitchen = kitchenName || items[0]?.tujuanDapur;
    const mainStore = storeName || items[0]?.toko;
    const mainDate = _dateStr || items[0]?.tanggal;

    const normStore = (mainStore || '').trim().toLowerCase();
    const normKitchen = (mainKitchen || '').trim().toLowerCase();

    // Strict filter for store + kitchen + date
    const scopedItems = items.filter((item) => {
      const matchStore = !normStore || item.toko.trim().toLowerCase() === normStore;
      const matchKitchen = !normKitchen || item.tujuanDapur.trim().toLowerCase() === normKitchen;
      const matchDate = !mainDate || item.tanggal === mainDate;
      return matchStore && matchKitchen && matchDate;
    });

    const finalItems = scopedItems.length > 0 ? scopedItems : items;

    setInvoiceFormItems(finalItems);
    setInvoiceFormKitchen(mainKitchen);
    setInvoiceFormStore(mainStore);
    setIsInvoiceFormOpen(true);
  };

  // Step 2: Confirmed form, proceed to Preview Invoice Modal
  const handleConfirmInvoiceForm = (data: {
    items: OrderItem[];
    kitchenName: string;
    storeName: string;
    recipientName: string;
    address: string;
    phone: string;
    bayar: number;
  }) => {
    setIsInvoiceFormOpen(false);

    setInvoiceRecipientName(data.recipientName);
    setInvoiceRecipientAddress(data.address);
    setInvoiceRecipientPhone(data.phone);
    setInvoiceBayar(data.bayar);

    const invNum = generateInvoiceNumber(data.kitchenName);

    setInvoiceItems(data.items);
    setInvoiceNumber(invNum);
    setInvoiceTargetKitchen(data.kitchenName);
    setInvoiceTargetStore(data.storeName);
    setIsInvoiceModalOpen(true);
  };

  const handleSaveInvoiceRecord = async () => {
    if (invoices.some((inv) => inv.invoiceNumber === invoiceNumber)) return;

    const totalBeli = invoiceItems.reduce((s, i) => s + i.qty * (i.hargaBeli || 0), 0);
    const totalJual = invoiceItems.reduce((s, i) => s + i.qty * (i.hargaJual || i.hargaBeli || 0), 0);
    const newRecord: InvoiceRecord = {
      id: `inv-rec-${Date.now()}`,
      invoiceNumber,
      tanggalPrint: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      createdAt: new Date().toISOString(),
      tujuanDapur: invoiceTargetKitchen || invoiceItems[0]?.tujuanDapur || 'Dapur',
      toko: invoiceTargetStore || invoiceItems[0]?.toko || 'HTG',
      items: invoiceItems,
      totalBeli,
      totalJual,
      totalProfit: totalJual - totalBeli,
    };

    setIsSyncingGas(true);
    const txData = buildTransaksiPayload(newRecord);
    const res = await addRow('transaksi', txData);
    setIsSyncingGas(false);

    // ALWAYS save invoice record locally so data is never lost
    setInvoices((prev) => [newRecord, ...prev]);

    if (res.success) {
      showToast('Invoice & Transaksi tersimpan ke Google Sheets', 'success');
    } else {
      setGasError(res.error || 'Gagal koneksi ke Google Sheets');
      showToast(`Invoice TERSIMPAN DI HP/LOKAL! (Gagal sync Google Sheets: ${res.error || 'Error'})`, 'error');
    }
  };

  // Background Export Handler (Requirement #4)
  const handleTriggerBackgroundExport = async (options: {
    storeName: string;
    kitchenName: string;
    items: OrderItem[];
    invoiceNumber: string;
    bayar: number;
    customNama: string;
    customAlamat: string;
    customNomor: string;
    type: 'pdf' | 'docx';
  }) => {
    setIsExportingActive(true);

    const totalAmount = options.items.reduce(
      (sum, item) => sum + parseIndonesianNumber(item.qty) * parseIndonesianNumber(item.hargaJual || item.hargaBeli || 0),
      0
    );

    try {
      if (options.type === 'pdf') {
        const res = await exportInvoicePdf({
          storeName: options.storeName,
          kitchenName: options.kitchenName,
          items: options.items,
          invoiceNumber: options.invoiceNumber,
          bayar: options.bayar,
          customNama: options.customNama,
          customAlamat: options.customAlamat,
          customNomor: options.customNomor,
        });

        if (res && res.pdfUrl) {
          const newHistoryItem: ExportHistoryItem = {
            id: `exp-${Date.now()}`,
            invoiceNumber: options.invoiceNumber,
            toko: options.storeName,
            tujuanDapur: options.kitchenName,
            totalAmount,
            totalJual: totalAmount,
            itemCount: options.items.length,
            tanggal: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            fileName: res.fileName,
            fileUrl: res.pdfUrl,
            pdfUrl: res.pdfUrl,
            type: 'pdf',
            fileType: 'pdf',
          };

          setExportHistory((prev) => [newHistoryItem, ...prev]);
          showToast(`Invoice ${options.invoiceNumber} berhasil dicetak! Klik ikon Download di atas untuk melihat/unduh.`, 'success');
        }
      } else {
        await downloadDocxInvoice({
          storeName: options.storeName,
          kitchenName: options.kitchenName,
          items: options.items,
          invoiceNumber: options.invoiceNumber,
          bayar: options.bayar,
          customNama: options.customNama,
          customAlamat: options.customAlamat,
          customNomor: options.customNomor,
        });

        const newHistoryItem: ExportHistoryItem = {
          id: `exp-${Date.now()}`,
          invoiceNumber: options.invoiceNumber,
          toko: options.storeName,
          tujuanDapur: options.kitchenName,
          totalAmount,
          totalJual: totalAmount,
          itemCount: options.items.length,
          tanggal: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          fileName: `Invoice_${options.invoiceNumber}.docx`,
          type: 'docx',
          fileType: 'docx',
        };

        setExportHistory((prev) => [newHistoryItem, ...prev]);
        showToast(`File Word Invoice ${options.invoiceNumber} siap!`, 'success');
      }
    } catch (err: any) {
      console.error('Background Export Error:', err);
      showToast(`Gagal export: ${err?.message || err}`, 'error');
    } finally {
      setIsExportingActive(false);
    }
  };

  const handleDeleteInvoice = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Riwayat Invoice',
      message: 'Apakah Anda yakin ingin menghapus riwayat invoice ini?',
      onConfirm: () => {
        setInvoices((prev) => prev.filter((inv) => inv.id !== id));
        setConfirmState(null);
        showToast('Riwayat invoice dihapus', 'delete');
      },
    });
  };

  const handleDeleteAllData = () => {
    setOrders([]);
    setInvoices([]);
    setExportHistory([]);
    showToast('Seluruh data pesanan berhasil dihapus bersih', 'delete');
  };

  // Handlers for WhatsApp Text Import
  const handleImportParsedItems = async (parsedResults: TextParseResult[], targetDate: string) => {
    const newOrdersAdded: OrderItem[] = parsedResults.map((res, index) => ({
      id: `ord-imp-${Date.now()}-${index}`,
      namaBarang: res.namaBarang,
      qty: res.qty,
      hargaBeli: res.hargaBeli,
      hargaJual: res.hargaJual,
      toko: res.toko || stores[0]?.nama || 'HTG',
      tujuanDapur: res.tujuanDapur || kitchens[0]?.nama || 'Dapur',
      pemasok: res.pemasok || pemasokList[0] || 'Pemasok 1',
      status: 'pending',
      tanggal: targetDate || selectedDate,
      createdAt: new Date().toISOString(),
    }));

    // Local-First: ALWAYS save imported items locally first
    setOrders((prev) => [...newOrdersAdded, ...prev]);

    setIsSyncingGas(true);
    let successCount = 0;
    let lastError = '';

    for (let index = 0; index < newOrdersAdded.length; index++) {
      const newOrderItem = newOrdersAdded[index];
      const saveRes = await addRow('pesanan', buildPesananPayload(newOrderItem));

      if (saveRes.success) {
        successCount++;
      } else {
        lastError = saveRes.error || 'Gagal menyimpan ke Google Sheets';
      }
    }

    setIsSyncingGas(false);

    if (successCount === newOrdersAdded.length) {
      showToast(`${successCount} item import berhasil tersimpan ke Google Sheets`, 'success');
    } else {
      setGasError(lastError);
      showToast(`${newOrdersAdded.length} item TERSIMPAN DI HP/LOKAL! (${successCount}/${newOrdersAdded.length} sync Sheets: ${lastError})`, 'error');
    }
  };

  // Horizontal Swipe Gesture threshold logic
  const handleDragEnd = (_: any, info: { offset: { x: number; y: number }; velocity: { x: number } }) => {
    const swipeThreshold = 60;
    if (Math.abs(info.offset.x) > Math.abs(info.offset.y)) {
      if (info.offset.x < -swipeThreshold && activeTab === 'dashboard') {
        setActiveTab('transaksi');
      } else if (info.offset.x > swipeThreshold && activeTab === 'transaksi') {
        setActiveTab('dashboard');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white pb-28">
      {/* Top Header Banner with Live Stats, Download Icon & Sync Bottom Sheet Trigger */}
      <HeaderBanner
        orders={orders}
        selectedDate={selectedDate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenExportHistory={() => setIsExportHistoryOpen(true)}
        onOpenSyncSheet={() => setIsSyncSheetOpen(true)}
        isSyncingGas={isSyncingGas}
        isExportingActive={isExportingActive}
        exportHistoryCount={exportHistory.length}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-4 py-2">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          className="w-full touch-pan-y"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <DashboardView
                  orders={orders}
                  kitchens={kitchens}
                  stores={stores}
                  pemasokList={pemasokList}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  onToggleStatus={handleToggleStatus}
                  onUpdatePaymentStatus={handleUpdatePaymentStatus}
                  onUpdateDeliveryStatus={handleUpdateDeliveryStatus}
                  onEditOrder={handleOpenEditOrder}
                  onDuplicateOrder={handleDuplicateOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onOpenInvoiceModal={handleStartInvoiceFlow}
                  onOpenTextImport={() => setIsTextImportOpen(true)}
                  onOpenExportModal={() => setIsExportOpen(true)}
                  onOpenAddModal={() => handleOpenAddModal()}
                />
              </motion.div>
            ) : (
              <motion.div
                key="transaksi"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TransactionsView
                  invoices={invoices}
                  orders={orders}
                  kitchens={kitchens}
                  onToggleStatus={handleToggleStatus}
                  onUpdatePaymentStatus={handleUpdatePaymentStatus}
                  onToggleBatchStatus={handleToggleBatchStatus}
                  onEditOrder={handleOpenEditOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onDeleteKitchenOrders={handleDeleteKitchenOrders}
                  onOpenInvoiceModal={handleStartInvoiceFlow}
                  onDeleteInvoice={handleDeleteInvoice}
                  onOpenAddModal={handleOpenAddModal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Fixed Sticky Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onOpenAddModal={() => handleOpenAddModal()}
      />

      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Confirm Delete Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* 1. Add / Edit Order Modal */}
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setEditingOrder(null);
          setPrefilledKitchen(undefined);
        }}
        onSave={handleSaveOrder}
        initialData={editingOrder}
        prefilledKitchen={prefilledKitchen}
        kitchens={kitchens}
        stores={stores}
        pemasokList={pemasokList}
        selectedDate={selectedDate}
      />

      {/* 2. Invoice Form (Step 1 Confirmation Bottom Sheet) */}
      <InvoiceFormModal
        isOpen={isInvoiceFormOpen}
        onClose={() => setIsInvoiceFormOpen(false)}
        items={invoiceFormItems}
        kitchenName={invoiceFormKitchen}
        storeName={invoiceFormStore}
        kitchens={kitchens}
        onConfirm={handleConfirmInvoiceForm}
      />

      {/* 3. Invoice Preview & Export (Step 2 Bottom Sheet) */}
      <InvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        invoiceNumber={invoiceNumber}
        items={invoiceItems}
        tujuanDapur={invoiceTargetKitchen}
        toko={invoiceTargetStore}
        recipientName={invoiceRecipientName}
        recipientAddress={invoiceRecipientAddress}
        recipientPhone={invoiceRecipientPhone}
        bayarAmount={invoiceBayar}
        onTriggerBackgroundExport={handleTriggerBackgroundExport}
        onSaveInvoiceRecord={handleSaveInvoiceRecord}
      />

      {/* 4. Text Import (WhatsApp Parser) Modal */}
      <TextImportModal
        isOpen={isTextImportOpen}
        onClose={() => setIsTextImportOpen(false)}
        onImportItems={handleImportParsedItems}
        kitchens={kitchens}
        stores={stores}
        pemasokList={pemasokList}
        selectedDate={selectedDate}
      />

      {/* 5. Export Spreadsheet (.xlsx & .csv) Bottom Sheet */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        orders={orders}
        selectedDate={selectedDate}
        onExportSuccess={(fileName) => {
          showToast(`Laporan ${fileName} berhasil diunduh!`, 'success');
        }}
      />

      {/* 6. Export History & Download Bottom Sheet */}
      <ExportHistorySheet
        isOpen={isExportHistoryOpen}
        onClose={() => setIsExportHistoryOpen(false)}
        history={exportHistory}
        onDeleteHistoryItem={(id) => {
          setExportHistory((prev) => prev.filter((item) => item.id !== id));
          showToast('Riwayat item dihapus', 'delete');
        }}
        onClearHistory={() => {
          setExportHistory([]);
          showToast('Riwayat export berhasil dibersihkan', 'success');
        }}
        isExportingActive={isExportingActive}
      />

      {/* 7. Google Sheets Sync Bottom Sheet */}
      <SyncBottomSheet
        isOpen={isSyncSheetOpen}
        onClose={() => setIsSyncSheetOpen(false)}
        ordersCount={orders.length}
        invoicesCount={invoices.length}
        onTriggerSync={() => loadSpreadsheetData(true)}
        isSyncing={isSyncingGas}
        syncError={gasError}
        onOpenSettings={() => {
          setIsSyncSheetOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      {/* 8. Settings Bottom Sheet */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        kitchens={kitchens}
        onUpdateKitchens={setKitchens}
        stores={stores}
        onUpdateStores={setStores}
        pemasokList={pemasokList}
        onUpdatePemasok={setPemasokList}
        orders={orders}
        onUpdateOrders={setOrders}
        onDeleteAllData={handleDeleteAllData}
      />

      {/* Animated Initial Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      </AnimatePresence>
    </div>
  );
}
