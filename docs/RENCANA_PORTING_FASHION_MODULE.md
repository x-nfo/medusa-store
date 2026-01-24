# Rencana Porting Modul Fashion (Fitur Import & Linking)

Dokumen ini menjelaskan langkah-langkah untuk memindahkan fitur "Fashion Module" (Material & Warna) dari `fashion-starter-master` ke `mastro-store` agar fitur linking produk dan import berfungsi sama.

## 1. Salin Modul Fashion

Salin seluruh folder module `fashion` dari sumber ke tujuan.

- **Sumber**: `../fashion-starter-master/medusa/src/modules/fashion`
- **Tujuan**: `backend/src/modules/fashion`

Pastikan struktur folder mengandung:

- `index.ts`
- `service.ts`
- `models/` (material.ts, color.ts)
- `migrations/`

## 2. Salin API Route Kustom

Salin route API yang menangani logika linking antara Produk dan Material/Warna.

- **Sumber**: `../fashion-starter-master/medusa/src/api/store/custom/fashion`
- **Tujuan**: `backend/src/api/store/custom/fashion`

Route ini (`[productHandle]/route.ts`) penting karena frontend memanggilnya untuk mendapatkan data varian yang sudah digabungkan dengan warna/material.

## 3. Registrasi Module di Konfigurasi

Edit file `backend/medusa-config.ts` untuk mendaftarkan module baru.

Tambahkan ke array `modules`:

```typescript
// backend/medusa-config.ts

modules: [
  // ... module lain
  {
    resolve: "./src/modules/fashion",
  },
]
```

## 4. Jalankan Migrasi Database

Karena ada model baru (`Material`, `Color`), kita perlu menjalankan migrasi agar tabel terbuat di database.

Jalankan perintah ini di folder `backend`:

```bash
npx medusa db:migrate
```

## 5. Verifikasi

1. **Backend**: Pastikan tidak ada error saat server start (`yarn dev`).
2. **Admin**: Coba import CSV produk yang memiliki Option "Material" dan "Color".
3. **Frontend**: Coba buka halaman produk tersebut, pastikan pilihan warna dan material muncul (ini mungkin butuh penyesuaian di frontend jika komponen UI belum ada, tapi backend logic sudah siap).

## Catatan Tambahan

- Pastikan penamaan Option di CSV atau Admin harus persis "Material" dan "Color" (Case Sensitive) agar logika di API route berjalan, karena sistem ini menggunakan "Loose Coupling" (pencocokan nama string).
