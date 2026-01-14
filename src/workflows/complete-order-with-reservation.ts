/**
 * Placeholder workflow for flash sale safety:
 * - Create inventory reservations pre-payment
 * - Release on failure/expire
 * - Commit stock via Medusa inventory flows (NO manual decrement)
 *
 * Wiring ke Medusa workflow engine akan dilakukan pada tahap integrasi berikutnya.
 */
export async function completeOrderWithReservation(input: {
  cart_id: string
  idempotency_key: string
}) {
  // TODO:
  // 1) lock per variant (future: redis lock)
  // 2) create reservation for each line item
  // 3) initiate payment (midtrans snap)
  // 4) on webhook paid: finalize order + commit inventory via official APIs
  return { ok: true }
}
