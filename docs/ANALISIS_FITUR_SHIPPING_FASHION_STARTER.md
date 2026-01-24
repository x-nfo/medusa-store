# Analisis Fitur Pengiriman di Fashion Starter Master

Dokumen ini menjelaskan implementasi fitur pengiriman pada `fashion-starter-master` dan perbandingannya dengan `mastro-store`.

## Temuan Utama

### Fashion Starter Master

- **Tipe Fulfillment**: **Cloud/Manual**.
- **Provider**: Tidak ada provider eksternal (seperti JNE, FedEx, dll) yang terintegrasi secara code.
- **Konfigurasi**: Mengandalkan **Metode Pengiriman Standar Medusa** (Flat Rate, atau Rule-based price) yang diatur via Admin Dashboard.
- **Codebase**: Tidak ditemukan modul custom di `src/modules/fulfillment` atau plugin di `package.json` yang berkaitan dengan logistik.

### Mastro Store (Project Anda)

- **Tipe Fulfillment**: **Dynamic / Third-Party Integrated**.
- **Provider**: **RajaOngkir**.
- **Fitur**:
  - Kalkulasi ongkir real-time berdasarkan berat dan lokasi (Kecamatan/Kota).
  - Sinkronisasi status pengiriman otomatis (Tracking).
  - Pengecekan biaya buffer (safety margin).

## Kesimpulan

Fitur pengiriman di `fashion-starter-master` sangat **sederhana** dan "out-of-the-box" dari Medusa, cocok untuk toko yang menggunakan tarif flat (misal: "Jabodetabek 10rb") atau gratis ongkir.

Sebaliknya, `mastro-store` memiliki sistem logistik yang jauh **lebih canggih** dan disesuaikan untuk pasar Indonesia yang membutuhkan kalkulasi JNE/J&T/Sicepat secara akurat per kecamatan.

**Rekomendasi**: Jangan mem-porting apapun terkait pengiriman dari `fashion-starter-master` karena akan menurunkan fitur (downgrade) sistem yang sudah ada di `mastro-store`.
