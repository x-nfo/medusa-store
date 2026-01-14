API Contracts (minimal yang agent perlu)

Storefront

POST /store/shipping/quote

POST /store/payments/midtrans/snap

GET /store/payment/return

Webhooks

POST /webhooks/midtrans

Admin

POST /admin/shipments/:fulfillment_id/create

POST /admin/payments/:order_id/status-sync (opsional)

Idempotency

Storefront wajib kirim Idempotency-Key pada place order.