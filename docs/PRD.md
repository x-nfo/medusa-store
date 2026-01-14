PRD Final — Website Toko Baju Muslim (Medusa Self-Host) V1
1) Ringkasan

Project ini membangun website ecommerce untuk toko baju muslim yang sudah memiliki penjualan tinggi via Instagram. Website berfungsi sebagai kanal checkout mandiri yang mengurangi kerja manual (CS/admin), menyediakan ongkir real-time dan otomasi resi, serta mendukung campaign flash sale dengan stok aman.

Stack V1 (keputusan final)

Commerce backend: Medusa (self-host)

Payment: Midtrans Snap

Shipping: RajaOngkir Enterprise (Delivery/Order)

Notifikasi: Email-only via Gmail SMTP (App Password)

Flash sale: aktif (diskon terjadwal + proteksi oversell)

Pre-Order (PO): ditunda (out of scope V1)

2) Tujuan & Definisi Sukses
Tujuan V1

Pembeli bisa checkout dan bayar via website (Midtrans Snap).

Ongkir dihitung real-time berdasarkan alamat & kurir.

Admin bisa generate resi otomatis (AWB) + label dari sistem.

Customer menerima email notifikasi status penting.

Flash sale aman tanpa oversell/double order.

Success Metrics (V1)

Penurunan order yang perlu intervensi manual (alamat/ongkir/resi).

Waktu “paid → resi terbit” lebih cepat dibanding proses IG manual.

Insiden oversell saat flash sale: 0.

Email delivery success (internal logs): ≥ 95%.

3) Persona

Customer IG: ingin cepat checkout, ongkir jelas, dapat resi.

Admin/CS: ingin proses order cepat, generate resi 1 klik, tracking rapi.

Owner: ingin efisiensi operasional dan peningkatan repeat order.

4) Scope
In Scope (V1)

A. Storefront (Customer)

Browse katalog, detail produk, varian (size/warna), stok.

Cart + checkout.

Pilih kurir/service + ongkir real-time.

Pembayaran via Midtrans Snap (redirect/popup).

Halaman status order & informasi resi (AWB + link tracking) setelah dibuat.

B. Admin (Operasional)

Manajemen produk, stok, order (Medusa Admin).

Generate resi (create delivery order) + label.

Menyimpan AWB/label/tracking ke order.

Tracking status update otomatis (polling/opsional webhook).

C. Notifikasi

Email via Gmail SMTP:

Order created

Payment confirmed

Resi terbit (AWB)

(Opsional) Delivered

D. Flash Sale

Diskon terjadwal.

Proteksi oversell via reservation + lock + idempotency.

Out of Scope (Ditunda)

Pre-order (PO) (ETA, split shipment, dll.)

COD

Loyalty/membership

Marketplace sync (Shopee/Tokopedia)

Anti-bot queue system (V2)

5) User Stories & Acceptance
Customer

Bisa memilih varian size/warna dan melihat stok.

Bisa melihat ongkir real-time berdasarkan alamat.

Bisa bayar via Midtrans Snap dan mendapat status order.

Menerima email konfirmasi order dan resi.

Admin

Bisa melihat order masuk dan status pembayaran.

Bisa generate resi + label sekali klik.

Bisa memantau tracking dari dashboard.

6) Requirement Fungsional
6.1 Katalog & Produk

Product variants: size, warna.

Multi image per product.

Collections/categories (gamis, hijab, koko, dll.).

Stok per varian.

6.2 Cart & Checkout

Add/update/remove cart.

Form alamat (nama, alamat, kota, kodepos, no HP).

Pilih shipping option.

Total = subtotal + discount + shipping.

6.3 Payment — Midtrans Snap

Flow

Checkout → request session Midtrans Snap

Dapat token + redirect_url → user bayar

Midtrans kirim webhook status → backend update paid/pending/failed

Email “Payment confirmed” ketika paid

Status mapping (minimum)

Paid: settlement / capture

Pending: pending

Failed: deny / expire / cancel

Wajib

Webhook endpoint untuk menerima notifikasi status.

Validasi notifikasi (signature / status check).

Fallback manual “sync status” (admin) via status API.

6.4 Shipping — RajaOngkir Enterprise (Delivery/Order)

A. Real-time Quote

Endpoint quote ongkir berdasarkan origin, destination, berat/volumetrik, kurir yang aktif.

Return: courier, service, etd, price.

B. Generate Resi (AWB) + Label

Admin action “Generate Resi” untuk fulfillment.

Sistem membuat delivery order dan menyimpan:

external shipment/delivery order id

AWB

label URL/PDF

tracking URL

C. Tracking Sync

Worker polling berkala untuk update status shipment (in transit/delivered).

Mapping status kurir ke status internal order/fulfillment.

(Opsional) webhook tracking; polling tetap jadi fallback.

6.5 Notifikasi Email — Gmail SMTP (V1)

Wajib (minimum)

Order created

Payment confirmed

Resi terbit (AWB)

Opsional

Delivered + ajakan review/testimoni

Ketentuan

Email selalu dikirim (tanpa WhatsApp).

Logging + retry basic.

6.6 Flash Sale (V1)

Tujuan

Diskon terjadwal + tidak oversell saat traffic tinggi.

Mekanisme

Reservation stok sebelum konfirmasi final.

Lock per variant saat proses checkout.

Idempotency key di request place-order untuk mencegah dobel order akibat retry.

7) Requirement Non-Fungsional

Self-host di VPS (2 vCPU, 8GB RAM).

Reliability

Idempotency untuk endpoint kritikal: place order, generate resi.

Worker terpisah (server + worker) untuk background tasks.

Observability

Log: payment webhook, shipment create, tracking sync, email send.

Security

Env secrets (Midtrans keys, RajaOngkir keys, Gmail app password).

Rate limit endpoint checkout.

Performance

Optional caching quote ongkir (TTL pendek) untuk mengurangi call API saat user gonta-ganti alamat.

8) Integrasi & Dependensi

Midtrans (Snap + notifications/webhook + status check)

RajaOngkir Enterprise (quote + delivery/order + tracking)

Gmail SMTP (App Password)

Domain + SSL (untuk webhook & keamanan)

9) User Flow Utama (V1)
9.1 Customer Flow

Browse produk → pilih varian → add to cart

Isi alamat → request shipping quote → pilih kurir/service

Checkout → create Snap token → bayar via Snap

Order status update via webhook

Setelah admin generate resi → email resi berisi AWB + tracking

9.2 Admin Flow

Lihat order paid/pending

Untuk paid: klik “Generate Resi” → AWB/label tersimpan

Print label → serahkan ke kurir

Tracking sync update status otomatis

10) API Contract Ringkas (V1)
Storefront
Endpoint	Method	Tujuan	Output
/store/shipping/quote	POST	Quote ongkir real-time	daftar opsi kurir/service/etd/price
/store/payments/midtrans/snap	POST	Buat Snap token/redirect_url	{ token, redirect_url }
/store/payment/return	GET	Halaman return dari Snap	status view (pending/success/failed)
Webhook
Endpoint	Method	Tujuan
/webhooks/midtrans	POST	Update status pembayaran
/webhooks/rajaongkir	POST	(Opsional) update status tracking
Admin
Endpoint	Method	Tujuan	Output
/admin/shipments/:fulfillment_id/create	POST	Create delivery order + AWB	{ awb, label_url, tracking_url }
/admin/payments/:order_id/status-sync	POST	Manual sync status Midtrans	status terbaru
11) Data Model / Persisted Fields (Minimum)
Lokasi simpan	Field	Kegunaan
Fulfillment metadata	external_shipment_id	referensi RajaOngkir
Fulfillment metadata	courier, service_code, etd	audit & display
Fulfillment metadata	label_url	print label
TrackingLink	tracking_number (AWB), url	tracking customer/admin
Order metadata (opsional)	shipping_cost_snapshot	audit ongkir
Payment metadata	midtrans_order_id, transaction_id	audit payment
12) Acceptance Criteria (V1)

Customer bisa checkout dan melihat ongkir real-time.

Customer bisa bayar via Midtrans Snap (redirect/popup).

Webhook Midtrans mengubah status order menjadi paid/pending/failed.

Admin bisa generate resi: AWB + label tersimpan di order/fulfillment.

Email terkirim untuk: order created, payment confirmed, resi terbit.

Flash sale test concurrency: tidak oversell dan tidak ada double order.

13) Risiko & Mitigasi
Risiko	Dampak	Mitigasi
Webhook Midtrans gagal/terlambat	paid tidak ter-update	manual sync status + retry
RajaOngkir API error	quote/resi gagal	fallback shipping manual + input resi manual
Gmail throttle/limit	email telat/gagal	queue + retry; rencana migrasi SES/Mailgun
Oversell saat flash sale	reputasi turun	lock + reservation + idempotency
Data alamat tidak valid	pengiriman gagal	validasi no HP + format alamat + kodepos
14) Milestones (disarankan)

M1: Katalog + cart + checkout basic

M2: Shipping quote real-time (RajaOngkir)

M3: Midtrans Snap end-to-end + webhook + email paid

M4: Generate resi + label + email resi

M5: Tracking sync worker + status delivered (opsional)

M6: Flash sale hardening + load test

15) RACI (ringkas)
Area	Responsible (R)	Accountable (A)	Consulted (C)	Informed (I)
PRD & prioritas	Product/Owner	Owner	Dev Lead	CS/Admin
Medusa backend	Backend Dev	Dev Lead	Owner	CS/Admin
Storefront UI	Frontend Dev	Dev Lead	Owner	CS/Admin
Payment Midtrans	Backend Dev	Dev Lead	Midtrans docs/support	Owner
RajaOngkir shipping/resi	Backend Dev	Dev Lead	RajaOngkir docs/support	CS/Admin
Email templates	Backend/Frontend	Owner	CS/Admin	—
Ops SOP (resi/packing)	CS/Admin	Owner	Dev Lead	—
16) Assumptions & Open Questions

Assumptions

Anda sudah memiliki akses aktif ke RajaOngkir Enterprise (Delivery/Order).

Anda memiliki akun Midtrans (sandbox & production) dan key.

Gmail SMTP dipakai untuk volume V1 (tidak ekstrem).

Open Questions (untuk dikunci sebelum implementasi)

Storefront: pakai redirect atau Snap.js popup?

Kurir/service yang diaktifkan saat V1 (mis. JNE/J&T/SiCepat)?

Tracking update: polling saja dulu atau plus webhook?

Kapan order boleh “Generate Resi”: hanya setelah paid, atau boleh saat pending (biasanya hanya paid)?

Kalau Anda jawab 4 pertanyaan “Open Questions” itu, saya bisa turunkan PRD ini menjadi dokumen eksekusi: user story per sprint + estimasi effort + definisi payload RajaOngkir & Midtrans (mapping field).