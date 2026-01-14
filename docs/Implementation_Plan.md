IMPLEMENTATION PLAN (REVISED) - Toko Baju Muslim V1

Principles (WAJIB)
- No manual inventory decrement. Semua perubahan stok melalui Medusa Inventory Module.
- Idempotency wajib untuk: place order / complete cart, generate resi (shipment).
- Payment source of truth = Midtrans webhook. Status sync hanya fallback.
- V1 scope only: no refund, no COD, no preorder, no WhatsApp, no marketplace.

Workstreams + Key Tasks
1) Midtrans Snap (Payment)
- Implement payment module/service for Snap transaction creation.
- Store external ids: transaction_id, order_id, redirect_url/token, raw response.
- Endpoint: POST /store/payments/midtrans/snap (create Snap transaction from cart/payment session).
- Webhook: POST /webhooks/midtrans (update payment/order state; source of truth).
- Optional fallback: POST /admin/payments/:order_id/status-sync.
- Idempotency: if Idempotency-Key repeats, return same Snap response.

2) RajaOngkir Enterprise (Shipping)
- Quote endpoint: POST /store/shipping/quote (weight calc + RajaOngkir quote).
- Shipment creation: POST /admin/shipments/:fulfillment_id/create.
- Store external shipment_id, AWB, label_url, tracking_url, raw payload.
- Tracking sync job (polling or webhook if available).
- Idempotency: shipment creation uses idempotency key + external id check.

3) Gmail SMTP (Notifications)
- Integrate notification module via Gmail SMTP app password.
- Send on: order placed, payment confirmed, shipment created (resi).
- No WhatsApp or other channels in V1.

4) Flash Sale Hardening
- Use Inventory Module reservations for cart checkout flow.
- Per-variant lock during checkout to avoid oversell.
- Ensure release on cart expiration or payment failure.
- Idempotency for complete cart (prevent double decrement).

Data Model/Storage (minimal)
- payment_midtrans: transaction_id, order_id, status, snap_token/redirect_url, response_json.
- shipment_rajaongkir: external_shipment_id, awb, label_url, tracking_url, status, response_json.
- Optional: store external ids in order/fulfillment metadata for quick access.

Idempotency Strategy
- Storefront must send Idempotency-Key for complete cart.
- Admin shipment creation must be idempotent using key + external id check.
- Use Medusa idempotency mechanism to persist request/response.

Milestones / Ticket Plan (V1)
1. Payment: Midtrans Snap create + webhook status update + idempotency.
2. Shipping: quote endpoint + shipment create + idempotency + tracking sync.
3. Notifications: Gmail SMTP integration + templates.
4. Flash sale: reservations + locks + checkout idempotency.
5. Observability: logging + error handling + retries for webhook/shipment.

DoD (per ticket)
- Tests for idempotency and state transitions.
- Logs include external ids (Midtrans + RajaOngkir).
- No scope creep beyond PRD V1.
