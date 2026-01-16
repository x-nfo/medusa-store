import { MidtransPaymentService } from "../../../modules/payment-midtrans"
import { logger } from "../../../services/logger"

export default async function handler(req: any, res: any) {
  try {
    const payload = req.body ?? {}
    const svc =
      req.scope?.resolve?.("pp_midtrans") ?? new MidtransPaymentService({}, {})

    const ok = svc.verifyWebhookSignature(payload)
    if (!ok) {
      logger.warn("Midtrans webhook signature invalid", {
        order_id: payload?.order_id,
      })
      return res.status(401).json({ message: "Invalid signature" })
    }

    const normalized = svc.handleWebhook(payload)
    logger.info("Midtrans webhook received", normalized)

    return res.status(200).json({ received: true })
  } catch (e: any) {
    logger.error("midtrans webhook error", e)
    return res.status(500).json({ message: e.message || "Internal error" })
  }
}
