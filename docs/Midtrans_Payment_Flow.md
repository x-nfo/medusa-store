# Panduan Alur Pembayaran Midtrans & Testing

Dokumen ini menjelaskan secara detail siklus hidup pembayaran (Payment Lifecycle) di Midtrans dan bagaimana hubungannya dengan sistem Medusa Anda.

## 1. Kamus Istilah (Terminologi)

### Status di Midtrans vs Medusa

| Midtrans Status | Medusa Status | Artinya | Uang Dimana? |
| :--- | :--- | :--- | :--- |
| **Pending** | `Pending` | Customer sudah dapat Virtual Account / QRIS, tapi **BELUM BAYAR**. | Masih di dompet Customer. |
| **Settlement** | `Authorized` | Customer **SUDAH BAYAR**. Transaksi sukses. Untuk VA/QRIS/E-Wallet, ini otomatis "Captured". | Sudah masuk ke Midtrans (siap dicairkan ke Merchant). |
| **Capture** | `Captured` | Khusus Kartu Kredit (CC). Merchant sudah mengklaim uangnya. | Sah milik Merchant. |
| **Deny** | `Canceled` | Kartu kredit ditolak bank atau terdeteksi Fraud (penipuan). | Tidak ada uang keluar dari Customer. |
| **Expire** | `Canceled` | Customer tidak membayar dalam batas waktu (default 24 jam). | Transaksi batal otomatis. |
| **Cancel** | `Canceled` | Merchant membatalkan transaksi yang *belum* settled/captured. | Transaksi batal. |
| **Refund** | `Requires Action` | Merchant mengembalikan uang yang *sudah* settled ke Customer. | Uang kembali ke Customer. |

---

## 2. Deep Dive: Authorized vs Captured

Ini konsep paling penting, terutama jika Anda menerima **Kartu Kredit**.

### A. Authorized (Otorisasi)

* **Analogi:** Seperti booking hotel. Hotel "menahan" limit kartu kredit Anda untuk jaminan, tapi uangnya belum ditarik dari rekening Anda. Limit Anda berkurang, tapi tagihan belum dicetak.
* **Di Midtrans:** Status `authorize` (untuk CC) atau `settlement` (untuk VA/QRIS). Sistem Medusa akan menandai order sebagai **Authorized**.
* **Kapan Terjadi:** Detik itu juga saat Customer sukses input OTP / Scan QR.

### B. Captured (Pencairan)

* **Analogi:** Saat Anda checkout dari hotel. Resepsionis memproses kartu, dan uang benar-benar pindah dari bank Anda ke rekening hotel.
* **Di Midtrans:** Status `capture`.
* **Kapan Terjadi:**
  * **Kartu Kredit:** Bisa diatur **Otomatis** (langsung saat authorized) atau **Manual** (Admin harus klik tombol di dashboard Midtrans/Medusa dalam 7 hari). Jika manual dan lupa diklik, uang kembali ke customer.
  * **VA / QRIS / E-Wallet:** Selalu **Otomatis Captured** (Instant Settlement). Anda tidak perlu klik apa-apa.

> **Rekomendasi:** Untuk toko retail biasa, gunakan setting **Automatic Capture** agar tidak repot klik-klik tombol.

---

## 3. Skenario Testing (UAT)

Gunakan skenario ini untuk memastikan sistem berjalan semestinya.

### Skenario 1: Normal Flow (QRIS / Virtual Account)

1. **Action:** Customer checkout, pilih QRIS, scan QR code dummy (di Simulator Midtrans).
2. **Expectation:**
    * Midtrans Webhook mengirim status `settlement`.
    * Medusa Order Status berubah jadi `Pending` (Processing).
    * Medusa Payment Status berubah jadi `Authorized`.
    * **Tidak perlu action Capture manual** (karena QRIS instant settlement).

### Skenario 2: Credit Card (Manual Capture)

*Hanya jika Anda setting `automatic_capture: false`*

1. **Action:** Customer checkout pakai Kartu Kredit no-cvv (Testing).
2. **Expectation:**
    * Medusa Payment Status: `Authorized`.
    * Uang belum masuk saldo Midtrans (masih "On Hold").
3. **Action Admin:** Di Medusa Admin -> Buka Order -> Scroll ke Payment -> Klik **"Capture Payment"**.
4. **Result:** Payment Status berubah jadi `Captured`. Saldo masuk.

### Skenario 3: Transaksi Ditinggalkan (Expire)

1. **Action:** Customer checkout, dapat Virtual Account, lalu diamkan (jangan dibayar).
2. **Expectation:**
    * Setelah batas waktu (misal 5 menit custom expiry untuk test), Midtrans kirim webhook `expire`.
    * Medusa membatalkan Order (Status: `Canceled`).

### Skenario 4: Refund (Pengembalian Dana)

*Kasus: Barang kosong setelah customer bayar.*

1. **Action:** Order Status `Processing`, Payment `Captured`.
2. **Action Admin:** Di Medusa Admin -> Klik **"Refund"** (biasanya di menu Payment atau Return).
3. **Result:**
    * Sistem memanggil API Refund Midtrans.
    * Uang customer dikembalikan (butuh 7-14 hari kerja bank).
    * **Warning:** Refund via API di mode Sandbox mungkin simulasi saja. Di Production, saldo Midtrans Anda harus cukup.

### Skenario 5: Challenge (Potensi Fraud)

*Kasus: Transaksi mencurigakan (nominal besar, IP beda negara).*

1. **Action:** Midtrans memberi status `challenge`.
2. **Action Admin:**
    * Cek dashboard Midtrans.
    * Pilih **Accept** (terima) atau **Deny** (tolak).
    * Jika Accept -> Masuk ke flow Authorized/Captured.
    * Jika Deny -> Masuk flow Cancel.

---

## 4. Troubleshooting Umum

* **"Order saya statusnya Authorized terus, duitnya masuk gak?"**
  * Jika VA/QRIS: **Ya, sudah masuk.** Istilah "Authorized" di Medusa untuk metode ini setara dengan "Lunas".
  * Jika Kartu Kredit: **Belum tentu.** Cek apakah butuh Capture manual.
* **"Kenapa tombol Refund error?"**
  * Refund hanya bisa dilakukan jika status uang sudah `Settlement` di bank (biasanya H+1 untuk CC).
  * Saldo di dashboard Midtrans (Merchant) harus ada isinya.

---

## 5. Konfigurasi Metode Pembayaran (Restriction)

Anda dapat membatasi metode pembayaran yang muncul di Snap (misal: mematikan Kartu Kredit) tanpa mengubah kode.

**Caranya:**
Cukup tambahkan variable `MIDTRANS_ENABLED_PAYMENTS` di file .env backend.

**Contoh:**

```env
# Hanya menampilkan BNI VA dan Mandiri Bill
MIDTRANS_ENABLED_PAYMENTS=bni_va,mandiri_bill,echannel

# Mematikan Kartu Kredit (Credit Card) - Hanya tampilkan Bank Transfer & E-Wallet
MIDTRANS_ENABLED_PAYMENTS=bca_va,bni_va,bri_va,cimb_clicks,echannel,gopay,shopeepay
```

Jika variable ini dihapus atau dikosongkan, semua metode pembayaran yang aktif di Dashboard Midtrans akan muncul.
