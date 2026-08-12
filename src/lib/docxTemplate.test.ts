import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTemplateUrlForStore,
  getCustomTemplateUrl,
  setCustomTemplateUrl,
  prepareScopedInvoiceData,
  TEMPLATE_URLS,
} from './docxTemplate';
import { compressDocxImagesClient } from './clientDocxCompressor';
import { generateInvoiceNumber, formatRupiah, parseIndonesianNumber } from './formatters';
import JSZip from 'jszip';

describe('Invoice Processing & Template TDD Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Template URL Resolution (getTemplateUrlForStore)', () => {
    it('should map LUWENG BOGA / LB store variants correctly', () => {
      expect(getTemplateUrlForStore('LUWENG BOGA')).toBe(TEMPLATE_URLS['LUWENG BOGA']);
      expect(getTemplateUrlForStore('Luweng Boga Dapur')).toBe(TEMPLATE_URLS['LUWENG BOGA']);
      expect(getTemplateUrlForStore('LB')).toBe(TEMPLATE_URLS['LUWENG BOGA']);
    });

    it('should map PROHE / PW store variants correctly', () => {
      expect(getTemplateUrlForStore('PROHE')).toBe(TEMPLATE_URLS['PROHE']);
      expect(getTemplateUrlForStore('Prohe PW')).toBe(TEMPLATE_URLS['PROHE']);
    });

    it('should map LUMBUNG ADIFRUTA / LA store variants correctly', () => {
      expect(getTemplateUrlForStore('LUMBUNG ADIFRUTA')).toBe(TEMPLATE_URLS['LUMBUNG ADIFRUTA']);
      expect(getTemplateUrlForStore('LA Adifruita')).toBe(TEMPLATE_URLS['LUMBUNG ADIFRUTA']);
      expect(getTemplateUrlForStore('Lumbung')).toBe(TEMPLATE_URLS['LUMBUNG ADIFRUTA']);
    });

    it('should default to HTG for unrecognized or HTG stores', () => {
      expect(getTemplateUrlForStore('HTG')).toBe(TEMPLATE_URLS['HTG']);
      expect(getTemplateUrlForStore('Toko Sampel')).toBe(TEMPLATE_URLS['HTG']);
    });

    it('should allow setting and clearing custom template URL', () => {
      const customUrl = 'https://docs.google.com/document/d/custom123/export?format=docx';
      setCustomTemplateUrl(customUrl, 'Custom Template');
      expect(getCustomTemplateUrl()).toBe(customUrl);
      expect(getTemplateUrlForStore('HTG')).toBe(customUrl);

      setCustomTemplateUrl(null);
      expect(getCustomTemplateUrl()).toBeNull();
      expect(getTemplateUrlForStore('HTG')).toBe(TEMPLATE_URLS['HTG']);
    });
  });

  describe('Invoice Payload Preparation (prepareScopedInvoiceData)', () => {
    const mockOrderItems = [
      {
        id: '1',
        toko: 'PROHE',
        tujuanDapur: 'Cluring',
        namaBarang: 'Ayam Potong',
        qty: 50,
        hargaJual: 32000,
        hargaBeli: 28000,
        tanggal: '2026-08-11',
        catatan: 'Fresh',
      },
      {
        id: '2',
        toko: 'PROHE',
        tujuanDapur: 'Cluring',
        namaBarang: 'Telur Ayam',
        qty: 100,
        hargaJual: 2000,
        hargaBeli: 1800,
        tanggal: '2026-08-11',
      },
      {
        id: '3',
        toko: 'HTG',
        tujuanDapur: 'Srono',
        namaBarang: 'Bawang Merah',
        qty: 10,
        hargaJual: 25000,
        tanggal: '2026-08-11',
      },
    ];

    it('should correctly filter items by store, kitchen, and date', () => {
      const result = prepareScopedInvoiceData({
        storeName: 'PROHE',
        kitchenName: 'Cluring',
        dateStr: '2026-08-11',
        items: mockOrderItems as any,
        bayar: 1500000,
      });

      expect(result.validItems.length).toBe(2);
      expect(result.validItems[0].namaBarang).toBe('Ayam Potong');
      expect(result.validItems[1].namaBarang).toBe('Telur Ayam');
    });

    it('should calculate grandTotal, payment, and remaining sisa correctly', () => {
      // Item 1: 50 * 32,000 = 1,600,000
      // Item 2: 100 * 2,000 = 200,000
      // Total: 1,800,000
      // Bayar: 1,500,000
      // Sisa: 300,000
      const result = prepareScopedInvoiceData({
        storeName: 'PROHE',
        kitchenName: 'Cluring',
        dateStr: '2026-08-11',
        items: mockOrderItems as any,
        bayar: 1500000,
      });

      expect(result.grandTotal).toBe(1800000);
      expect(result.parsedBayar).toBe(1500000);
      expect(result.sisa).toBe(300000);

      // Check docxtemplater tags
      expect(result.dataContext.TOTAL).toBe(formatRupiah(1800000));
      expect(result.dataContext.BAYAR).toBe(formatRupiah(1500000));
      expect(result.dataContext.SISA).toBe(formatRupiah(300000));
    });

    it('should format item table rows with correct numeric and text attributes', () => {
      const result = prepareScopedInvoiceData({
        storeName: 'PROHE',
        kitchenName: 'Cluring',
        dateStr: '2026-08-11',
        items: mockOrderItems as any,
      });

      const firstItem = result.itemsFormatted[0];
      expect(firstItem.no).toBe(1);
      expect(firstItem.qty).toBe(50);
      expect(firstItem.namaBarang).toBe('Ayam Potong');
      expect(firstItem.harga).toBe(formatRupiah(32000));
      expect(firstItem.jumlah).toBe(formatRupiah(1600000));
    });
  });

  describe('Client DOCX Compressor (compressDocxImagesClient)', () => {
    it('should handle non-image DOCX zip archive gracefully without throwing', async () => {
      const zip = new JSZip();
      zip.file('word/document.xml', '<w:document><w:body/></w:document>');
      const docxArrayBuffer = await zip.generateAsync({ type: 'arraybuffer' });

      const compressedBlob = await compressDocxImagesClient(docxArrayBuffer);
      expect(compressedBlob).toBeDefined();
      expect(compressedBlob.size).toBeGreaterThan(0);
    });
  });

  describe('Invoice Number Auto Generation (generateInvoiceNumber)', () => {
    it('should generate valid invoice number format with date stamp', () => {
      const invNo = generateInvoiceNumber('Cluring');
      expect(invNo).toMatch(/^INV\//);
      expect(invNo).toContain('CLUR');
    });
  });
});
