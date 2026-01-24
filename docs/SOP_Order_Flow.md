# SOP: Alur Order, Payment & Shipping (Mastro Store)

Dokumen ini menjelaskan perjalanan Order dari Checkout hingga Selesai, serta tugas Admin (Manual) vs Sistem (Otomatis).

## 1. Konsep Status

### 💰 Status Pembayaran (Payment Status)

Di Medusa, pembayaran memiliki 2 tahap utama:

1. **Authorized (Otorisasi)**
    * **Artinya:** Customer sudah sukses bayar di Midtrans (atau bank). Uang sudah "dikunci" atau dijamin ada, tapi belum tentu cair 100% ke rekening merchant (tergantung kebijakan gateway).
    * **Keadaan:** Order sudah terbentuk (`status: pending`), inventory sudah terpotong.
    * **Otomatis?** **YA**. Terjadi saat Webhook "settlement" diterima dari Midtrans.

2. **Captured (Ditangkap/Dicairkan)**
    * **Artinya:** Merchant mengonfirmasi "Oke, saya terima uang ini dan siap proses barang".
    * **Pentingnya:** Beberapa payment gateway menahan uang di status "Authorized" dan akan mengembalikannya ke customer jika merchant tidak klik "Capture" dalam waktu tertentu (misal 7 hari).
    * **Cara:** Klik tombol "Capture Payment" di Admin Panel.
    * **Otomatis?** **TIDAK** (Default Medusa). Admin harus klik manual untuk konfirmasi.
    * *Note: Jika menggunakan `automatic_capture: true` (belum aktif saat ini), maka ini akan otomatis.*

### 📦 Status Pengiriman (Fulfillment Status)

1. **Not Fulfilled:** Order masuk, belum diproses.
2. **Fulfilled:** Barang sudah dikemas dan ada Resi (AWB).
3. **Shipped:** Barang sudah diserahkan ke kurir.
4. **Delivered:** Barang sampai di customer.

---

## 2. Alur Kerja (Workflow)

Berikut adalah langkah demi langkah dari awal sampai akhir.

| Tahap | Aktivitas | Siapa? | Status Otomatis/Manual |
| :--- | :--- | :--- | :--- |
| **1. Checkout** | Customer memilih produk & bayar via Midtrans Snap. | Customer | **Otomatis** |
| **2. Order Masuk** | Order muncul di Admin Panel. Status Payment: `Authorized`. | Sistem | **Otomatis** (Via Webhook) |
| **3. Cek Fraud** | Admin mengecek apakah order valid (alamat benar, stok aman). | **ADMIN** | **MANUAL** (Analisa Mata) |
| **4. Capture** | Jika order valid, Admin klik **"Capture Payment"** di detail order. | **ADMIN** | **MANUAL** (Klik Tombol) |
| **5. Packing** | Admin menyiapkan barang fisik. | **ADMIN** | **MANUAL** |
| **6. Fulfillment** | Admin klik **"Create Fulfillment"** di Admin Panel. Sistem otomatis booking ke Komerce/RajaOngkir. | **ADMIN** | **MANUAL** (Klik Tombol) |
| **7. Resi (AWB)** | Resi muncul otomatis di detail order setelah fulfillment sukses. | Sistem | **Otomatis** (Dari Komerce) |
| **8. Pick Up** | Kurir menjemput paket / Admin drop off ke gerai. | Kurir | **Manual** (Fisik) |
| **9. Tracking** | Status berubah jadi `Shipped` lalu `Delivered` saat paket bergerak. | Sistem | **Otomatis** (Via Webhook RajaOngkir)* |
| **10. Selesai** | Order dianggap selesai (Complete). | Sistem | **Otomatis** (Jika semua item delivered) |

*\*Syarat Otomatis Tracking: URL Webhook harus publik (Live Domain) atau menggunakan Ngrok saat development. Di Localhost tanpa Ngrok, tracking tidak jalan.*

---

## 3. Notifikasi Email (Resend) - *Status: Debugging* ⚠️

Saat ini integrasi email (Resend) sedang dalam perbaikan.
**Target Ideal:**

* Sistem mengirim email "Order Confirmation" saat Order Masuk.
* Sistem mengirim email "Shipment Created" (isi No Resi) saat Fulfillment dibuat.

**Status Sekarang:**

* Integrasi belum stabil sepenuhnya. Admin mungkin perlu menghubungi customer manual via WhatsApp jika email tidak masuk.

## 4. Troubleshooting Cepat

* **Uang Masuk tapi Order Gak Muncul?**
  * Cek Logs Webhook Midtrans. Pastikan status `settlement` diterima.
* **Gagal "Create Fulfillment" (Error 422/400)?**
  * Cek Saldo Komerce (jika Prepaid).
  * Cek data alamat customer (No HP wajib angka 62/08, Kode Pos wajib ada).
  * *Sandbox Workaround:* Sistem memaksa status COD untuk pembayaran Midtrans di Sandbox agar tidak perlu Topup Saldo.
* **Resi Tidak Update Status?**
  * Pastikan Webhook RajaOngkir terdaftar di Dashboard Komerce dengan URL yang bisa diakses publik (bukan localhost).

---
**Rangkuman untuk Admin:**

1. Pantau Dashboard.
2. Order baru masuk -> **Capture Payment**.
3. Barang siap -> **Create Fulfillment**.
4. Cetak Label (Coming Soon) & Tempel.
5. Serahkan ke Kurir.
6. Selesai. Sisanya sistem yang update.
