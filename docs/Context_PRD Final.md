Context Pack: PRD Final (ringkas untuk agent)

Gunakan PRD Final yang sudah kita buat sebelumnya sebagai dokumen utama. Untuk agent, tambahkan “rules of engagement” berikut:

Rules (untuk agent)

Jangan implement fitur out-of-scope (PO, COD, marketplace sync).

Semua endpoint kritikal harus idempotent:

complete cart / place order

generate resi

Semua status payment harus di-drive oleh webhook Midtrans (source of truth).

Shipping/Resi harus memakai RajaOngkir Enterprise Delivery/Order.

V1 notifikasi hanya email Gmail; WA tidak dibuat