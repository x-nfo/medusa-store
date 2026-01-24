# Analisis Fitur Pembayaran (Stripe) di Fashion Starter Master

Dokumen ini menjelaskan alur kerja pembayaran (khususnya Stripe) yang diterapkan pada `fashion-starter-master`. Implementasi ini menggunakan pendekatan "Custom Route" untuk fleksibilitas lebih tinggi dibanding plugin standar.

## Alur Kerja Utama

### 1. Frontend (Storefront)

- **Komponen**: `storefront/src/modules/checkout/components/payment/index.tsx`
- **Library**: Menggunakan `@stripe/react-stripe-js` untuk merender form input kartu kredit (Stripe Elements).
- **Proses**:
    1. User memasukkan detail kartu.
    2. Stripe Element membuat "Token" atau "Payment Method" secara client-side (langsung ke server Stripe).
    3. Frontend kemudian memanggil API Backend Custom untuk menyimpan token ini ke session cart.
  - **Hook**: `useSetPaymentMethod` di `hooks/cart.ts`.
  - **API Endpoint**: `POST /store/custom/stripe/set-payment-method`.

### 2. Backend (Medusa)

- **Route**: `medusa/src/api/store/custom/stripe/set-payment-method/route.ts`
- **Logika**:
    1. Menerima `session_id` dan `token` dari request body.
    2. Mengambil Payment Session Medusa yang aktif.
    3. Menggunakan Stripe Node.js SDK untuk membuat/mengambil objek `PaymentMethod` dari token yang dikirim.
    4. Mengupdate Stripe Payment Intent dengan metode pembayaran tersebut.
    5. Mengupdate Medusa Payment Session (`payment_method_id`) agar terhubung dengan metode pembayaran yang baru dibuat.

## Perbedaan dengan Standard Plugin

Biasanya, plugin Medusa standar menangani banyak hal ini secara otomatis. Namun, pendekatan custom route ini dipilih kemungkinan untuk:

- **Kontrol Penuh UI**: Memungkinkan developer membuat UI checkout yang sangat spesifik tanpa terikat flow standar plugin.
- **Step-by-Step Validation**: Memisahkan validasi kartu dengan proses otorisasi akhir.

## Relevansi untuk Mastro Store (Midtrans)

- Di `mastro-store`, kita menggunakan Midtrans. Midtrans memiliki flow "Snap" yang menangani UI pembayaran di popup/halaman terpisah.
- Jika kita ingin membuat pembayaran kartu kredit yang *seamless* di dalam halaman checkout kita sendiri (tanpa redirect/popup Snap), kita perlu meniru pola ini:
  - Frontend: Collect card data -> Tokenize ke Midtrans (Core API).
  - Backend: Terima token -> Charge/Authorize via Midtrans Core API -> Update Order.
- Namun, untuk saat ini `mastro-store` lebih fokus menggunakan Snap, sehingga pola "Custom Route" ini belum terlalu dibutuhkan kecuali untuk fitur very advanced.
