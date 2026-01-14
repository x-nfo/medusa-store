Critical Flows (untuk agent, sangat membantu)
Flow A — Checkout + Pay (Snap)

Customer checkout → backend create Snap transaction

Customer bayar di Snap

Midtrans webhook → backend update status order: paid/pending/failed

Email “payment confirmed” bila paid

Status mapping minimum:

paid: settlement/capture

pending: pending

failed: deny/expire/cancel

Flow B — Shipping Quote

Storefront kirim destination + cart

Backend hitung weight/volumetric

Call RajaOngkir quote → return list opsi shipping

Flow C — Generate Resi

Admin trigger generate resi untuk fulfillment

Backend call RajaOngkir Delivery/Order

Simpan: external shipment id, AWB, label URL, tracking URL

Email “resi terbit”

Flow D — Flash Sale (anti oversell)

Lock per variant saat checkout

Buat reservation sebelum finalisasi

Idempotency untuk complete cart