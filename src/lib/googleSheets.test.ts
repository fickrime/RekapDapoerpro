import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mapRawOrder, mapRawInvoice, addRow, buildPesananPayload, buildTransaksiPayload, GAS_TOKEN, GAS_BASE_URL } from './googleSheets';

describe('Google Sheets Integration Tests (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Payload Builders (Exact Google Sheet Header Matching)', () => {
    it('buildPesananPayload should create data object with exact headers for sheet "pesanan"', () => {
      const orderItem = {
        id: 'ord-12345',
        tujuanDapur: 'Dapur Utama',
        namaBarang: 'Beli Cabai Rawit',
        tanggal: '2026-08-09',
        qty: 15,
        toko: 'HTG',
        paymentStatus: 'UNPAID' as const,
        deliveryStatus: 'PENDING' as const,
        hargaJual: 45000,
        hargaBeli: 40000,
        createdAt: '2026-08-09T10:00:00.000Z',
      };

      const payload = buildPesananPayload(orderItem);

      expect(payload).toEqual({
        DAPUR: 'Dapur Utama',
        ITEM: 'Beli Cabai Rawit',
        DATE: '2026-08-09',
        QTY: 15,
        TOKO: 'HTG',
        PAYMENT: 'UNPAID',
        DILEVERY: 'PENDING',
        'H. JUAL': 45000,
        'H. BELI': 40000,
      });

      // Verify internal fields are strictly omitted
      expect((payload as any).id).toBeUndefined();
      expect((payload as any).tanggal).toBeUndefined();
      expect((payload as any).namaBarang).toBeUndefined();
    });

    it('buildTransaksiPayload should create data object with exact headers for sheet "transaksi"', () => {
      const invoiceData = {
        tanggalPrint: '2026-08-09',
        toko: 'Toko Bintang',
        totalBeli: 150000,
        totalJual: 180000,
        items: [
          { namaBarang: 'Bawang Merah', qty: 10, pemasok: 'Pemasok Subur' } as any,
          { namaBarang: 'Bawang Putih', qty: 5, pemasok: 'Pemasok Subur' } as any,
        ],
      };

      const payload = buildTransaksiPayload(invoiceData);

      expect(payload).toEqual({
        TANGGAL: '2026-08-09',
        PEMASOK: 'Pemasok Subur',
        BARANG: 'Bawang Merah (10), Bawang Putih (5)',
        TOKO: 'Toko Bintang',
        QTY: 15,
        'H. BELI': 150000,
        TOTAL: 180000,
        STATUS: 'LUNAS',
      });

      // Verify internal fields are strictly omitted
      expect((payload as any).id).toBeUndefined();
      expect((payload as any).invoiceNumber).toBeUndefined();
      expect((payload as any).items).toBeUndefined();
    });
  });

  describe('mapRawOrder', () => {
    it('should correctly map Google Sheets "pesanan" header keys to OrderItem', () => {
      const rawRow = {
        NO: 'ord-101',
        DAPUR: 'Siliragung',
        ITEM: 'Bawang Merah',
        DATE: '2026-08-09',
        QTY: 50,
        TOKO: 'HTG',
        PEMASOK: 'Pemasok Utama',
        PAYMENT: 'PAID',
        DILEVERY: 'DONE',
        'H. JUAL': 25000,
        'H. BELI': 20000,
        STATUS: 'selesai',
      };

      const mapped = mapRawOrder(rawRow);

      expect(mapped).toEqual({
        id: 'ord-101',
        namaBarang: 'Bawang Merah',
        qty: 50,
        hargaBeli: 20000,
        hargaJual: 25000,
        toko: 'HTG',
        tujuanDapur: 'Siliragung',
        pemasok: 'Pemasok Utama',
        status: 'selesai',
        paymentStatus: 'PAID',
        deliveryStatus: 'DONE',
        tanggal: '2026-08-09',
        createdAt: expect.any(String),
        catatan: '',
      });
    });

    it('should handle alternative field name fallbacks gracefully', () => {
      const rawRow = {
        id: 'ord-102',
        namaBarang: 'Cabe Rawit',
        qty: '10',
        hargaBeli: '30000',
        hargaJual: '35000',
        toko: 'PROHE',
        tujuanDapur: 'Mojoroto',
        status: 'pending',
      };

      const mapped = mapRawOrder(rawRow);

      expect(mapped.namaBarang).toBe('Cabe Rawit');
      expect(mapped.qty).toBe(10);
      expect(mapped.hargaBeli).toBe(30000);
      expect(mapped.hargaJual).toBe(35000);
      expect(mapped.status).toBe('pending');
      expect(mapped.paymentStatus).toBe('UNPAID');
      expect(mapped.deliveryStatus).toBe('PENDING');
    });
  });

  describe('mapRawInvoice', () => {
    it('should correctly map Google Sheets "transaksi" header keys to InvoiceRecord', () => {
      const rawRow = {
        NO: 'INV/2026/08/001',
        TANGGAL: '2026-08-09',
        PEMASOK: 'Pemasok A',
        BARANG: 'Bawang Merah (50)',
        TOKO: 'HTG',
        QTY: 50,
        'H. BELI': 1000000,
        TOTAL: 1250000,
        DAPUR: 'Siliragung',
        STATUS: 'LUNAS',
      };

      const mapped = mapRawInvoice(rawRow);

      expect(mapped.id).toBe('INV/2026/08/001');
      expect(mapped.invoiceNumber).toBe('INV/2026/08/001');
      expect(mapped.tanggalPrint).toBe('2026-08-09');
      expect(mapped.toko).toBe('HTG');
      expect(mapped.tujuanDapur).toBe('Siliragung');
      expect(mapped.totalBeli).toBe(1000000);
      expect(mapped.totalJual).toBe(1250000);
    });
  });

  describe('addRow', () => {
    it('should send the exact token and payload structure in POST request', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ success: true, message: 'Row added' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const orderData = {
        NO: 'ord-200',
        DAPUR: 'Cluring',
        ITEM: 'Ayam Potong',
        DATE: '2026-08-09',
        QTY: 100,
        TOKO: 'PROHE',
        PAYMENT: 'UNPAID',
        DILEVERY: 'PENDING',
        'H. JUAL': 32000,
        'H. BELI': 30000,
      };

      const response = await addRow('pesanan', orderData);

      expect(response.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(GAS_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          token: GAS_TOKEN,
          action: 'add',
          sheet: 'pesanan',
          data: orderData,
        }),
      });
    });
  });
});
