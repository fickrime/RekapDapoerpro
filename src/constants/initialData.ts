import { Kitchen, Store, OrderItem } from '../types';

export const INITIAL_PEMASOK: string[] = [
  "Pemasok 1",
  "Pemasok 2",
  "Pemasok 3",
  "Pemasok 4"
];

export const INITIAL_STORES: Store[] = [
  {
    "id": "st-1",
    "nama": "HTG",
    "lokasi": "CV. HANDAI TOLAN GROUP"
  },
  {
    "id": "st-2",
    "nama": "PROHE",
    "lokasi": "Gudang Protein"
  },
  {
    "id": "st-3",
    "nama": "LUWENG BOGA",
    "lokasi": "Depo Makanan"
  },
  {
    "id": "st-4",
    "nama": "ADIFRUITA",
    "lokasi": "Distributor Buah"
  }
];

export const INITIAL_KITCHENS: Kitchen[] = [
  {
    "id": "kt-1",
    "nama": "Siliragung"
  },
  {
    "id": "kt-2",
    "nama": "Singojuruh"
  },
  {
    "id": "kt-3",
    "nama": "Banjarsari 2"
  },
  {
    "id": "kt-4",
    "nama": "Cluring"
  },
  {
    "id": "kt-5",
    "nama": "Tamansari"
  },
  {
    "id": "kt-6",
    "nama": "Wongsorejo"
  },
  {
    "id": "kt-7",
    "nama": "Wringinputih 2"
  },
  {
    "id": "kt-8",
    "nama": "Wringinputih 4"
  },
  {
    "id": "kt-9",
    "nama": "Sumberagung"
  },
  {
    "id": "kt-10",
    "nama": "Mojoroto"
  },
  {
    "id": "kt-11",
    "nama": "Tapanrejo"
  },
  {
    "id": "kt-12",
    "nama": "Kendalrejo"
  },
  {
    "id": "kt-13",
    "nama": "Gambiran"
  },
  {
    "id": "kt-14",
    "nama": "Pidis"
  },
  {
    "id": "kt-15",
    "nama": "Kesilir 2"
  },
  {
    "id": "kt-16",
    "nama": "Mufid"
  },
  {
    "id": "kt-17",
    "nama": "Rejoagung"
  },
  {
    "id": "kt-18",
    "nama": "Ajeng"
  },
  {
    "id": "kt-19",
    "nama": "Kedayunan"
  },
  {
    "id": "kt-20",
    "nama": "Pesanggaran"
  },
  {
    "id": "kt-21",
    "nama": "Bangorejo"
  }
];

export const DEFAULT_DATE = new Date().toISOString().split('T')[0];

export const INITIAL_ORDERS: OrderItem[] = [];
