import { MidtransPaymentService } from "../../../modules/payment-midtrans"
import { logger } from "../../../services/logger"

export default async function handler(req: any, res: any) {
  try {
    const payload = req.body
    const svc = new MidtransPaymentService()

    const ok = svc.verifyWebhook(payload)
    if (!ok) {
      logger.warn("Midtrans webhook signature invalid", { order_id: payload?.order_id })
      return res.status(401).json({ message: "Invalid signature" })
    }

    // TODO: map payload.transaction_status -> update Medusa order/payment status
    // Implement wiring ke order/payment service Medusa setelah kita pastikan template project Anda.
    logger.info("Midtrans webhook received", {
      order_id: payload.order_id,
      status: payload.transaction_status,
    })

    return res.status(200).json({ received: true })
  } catch (e: any) {
    logger.error("midtrans webhook error", e)
    return res.status(500).json({ message: e.message || "Internal error" })
  }
}
