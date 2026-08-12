/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';
import { OrderItem, Kitchen, Store } from '../types';

// Default Supabase configuration provided by user
const DEFAULT_SUPABASE_URL = 'https://vkrgybebgnnaxzzcfjpn.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrcmd5YmViZ25uYXh6emNmanBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxNzM5NDUsImV4cCI6MjEwMTc0OTk0NX0.vB-MqP1JNV-JGRFJsN3MYKzerDEnmyGejwEOsgl91VY';

export const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string) || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SQL Schema DDL script for Supabase SQL Editor
 */
export const SUPABASE_SQL_SCHEMA = `-- Jalankan SQL ini di Supabase SQL Editor jika tabel belum dibuat:

-- 1. Tabel Orders (Pesanan)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  qty NUMERIC NOT NULL DEFAULT 1,
  harga_beli NUMERIC NOT NULL DEFAULT 0,
  harga_jual NUMERIC NOT NULL DEFAULT 0,
  toko TEXT NOT NULL DEFAULT '',
  tujuan_dapur TEXT NOT NULL DEFAULT '',
  pemasok TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  tanggal DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  catatan TEXT
);

-- 2. Tabel Kitchens (Dapur)
CREATE TABLE IF NOT EXISTS public.kitchens (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  lokasi TEXT,
  penanggung_jawab TEXT
);

-- 3. Tabel Stores (Toko)
CREATE TABLE IF NOT EXISTS public.stores (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  lokasi TEXT
);

-- 4. Tabel Pemasok (Supplier)
CREATE TABLE IF NOT EXISTS public.pemasok (
  id SERIAL PRIMARY KEY,
  nama TEXT UNIQUE NOT NULL
);

-- Enable RLS & Allow public access (atau atur sesuai kebutuhan)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pemasok ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read/write orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write kitchens" ON public.kitchens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read/write pemasok" ON public.pemasok FOR ALL USING (true) WITH CHECK (true);
`;

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('orders').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('does not exist') || error.message.includes('relation')) {
        return {
          success: true,
          message: 'Terhubung ke Supabase! (Tabel database belum dibuat, gunakan SQL Schema yang disediakan).',
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase error: ${error.message} (${error.code || ''})`,
      };
    }
    return {
      success: true,
      message: 'Berhasil terhubung ke Supabase Database & Tabel Orders!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal terhubung ke Supabase',
    };
  }
}

/**
 * Sync / Fetch Orders from Supabase
 */
export async function fetchOrdersFromSupabase(): Promise<{ data: OrderItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase.from('orders').select('*').order('tanggal', { ascending: false });
    if (error) return { data: null, error: error.message };
    
    const mapped: OrderItem[] = (data || []).map((row: any) => ({
      id: row.id,
      namaBarang: row.nama_barang,
      qty: Number(row.qty) || 0,
      hargaBeli: Number(row.harga_beli) || 0,
      hargaJual: Number(row.harga_jual) || 0,
      toko: row.toko || '',
      tujuanDapur: row.tujuan_dapur || '',
      pemasok: row.pemasok || '',
      status: row.status || 'pending',
      tanggal: row.tanggal,
      createdAt: row.created_at,
      catatan: row.catatan || '',
    }));

    return { data: mapped, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Gagal mengambil data pesanan' };
  }
}

/**
 * Push / Upsert Orders to Supabase
 */
export async function pushOrdersToSupabase(orders: OrderItem[]): Promise<{ success: boolean; message: string }> {
  if (!orders || orders.length === 0) {
    return { success: true, message: 'Tidak ada data pesanan untuk di-upload' };
  }

  try {
    const payload = orders.map((item) => ({
      id: item.id,
      nama_barang: item.namaBarang,
      qty: item.qty,
      harga_beli: item.hargaBeli,
      harga_jual: item.hargaJual,
      toko: item.toko,
      tujuan_dapur: item.tujuanDapur,
      pemasok: item.pemasok,
      status: item.status,
      tanggal: item.tanggal,
      catatan: item.catatan || null,
    }));

    const { error } = await supabase.from('orders').upsert(payload, { onConflict: 'id' });
    if (error) {
      return { success: false, message: `Gagal upload pesanan: ${error.message}` };
    }
    return { success: true, message: `Berhasil sinkronisasi ${orders.length} pesanan ke Supabase!` };
  } catch (err: any) {
    return { success: false, message: err.message || 'Error uploading to Supabase' };
  }
}

export const SUPABASE_STORAGE_RLS_SQL = `-- SQL RLS Policy Supabase Storage Bucket 'content' untuk mengizinkan upload & download file DOCX/PDF/Images:

-- 1. Pastikan bucket 'content' dibuat & Public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content', 'content', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Beri akses penuh (SELECT, INSERT, UPDATE, DELETE) untuk publik/anonim di bucket 'content'
DROP POLICY IF EXISTS "Allow public access on content bucket" ON storage.objects;

CREATE POLICY "Allow public access on content bucket" 
ON storage.objects FOR ALL 
TO public 
USING (bucket_id = 'content') 
WITH CHECK (bucket_id = 'content');
`;

/**
 * Upload DOCX / PDF template file to Supabase Storage Bucket 'content'
 * Target bucket path: Files > Buckets > content
 */
export async function uploadTemplateToSupabaseBucket(file: File, customFileName?: string): Promise<{ success: boolean; publicUrl?: string; message: string }> {
  try {
    const fileName = customFileName || `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `templates/${fileName}`;

    // Upload file to bucket 'content'
    const { data, error } = await supabase.storage.from('content').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      return {
        success: false,
        message: `Gagal upload ke bucket 'content': ${error.message}. Penyebab: Kebijakan RLS Supabase saat ini dikunci hanya untuk gambar/JPG. Jalankan SQL Policy perbaikan di bawah.`,
      };
    }

    const { data: urlData } = supabase.storage.from('content').getPublicUrl(filePath);
    return {
      success: true,
      publicUrl: urlData.publicUrl,
      message: `Berhasil meng-upload template '${file.name}' ke Supabase Storage Bucket 'content'!`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Terjadi kesalahan saat upload ke Supabase Storage',
    };
  }
}
