import { sendEmail } from "../../services/email-service"
import { logger } from "../../services/logger"
import { orderCreatedTemplate, paymentConfirmedTemplate, awbCreatedTemplate } from "./templates"

export class GmailNotificationService {
  static readonly identifier = "np_gmail"

  async sendOrderCreated(to: string, payload: { order_id: string; total: string }) {
    const tpl = orderCreatedTemplate(payload)
    logger.info("sendOrderCreated", { to, order_id: payload.order_id })
    return sendEmail({ to, subject: tpl.subject, html: tpl.html })
  }

  async sendPaymentConfirmed(to: string, payload: { order_id: string }) {
    const tpl = paymentConfirmedTemplate(payload)
    logger.info("sendPaymentConfirmed", { to, order_id: payload.order_id })
    return sendEmail({ to, subject: tpl.subject, html: tpl.html })
  }

  async sendAwbCreated(to: string, payload: { order_id: string; awb: string; tracking_url?: string }) {
    const tpl = awbCreatedTemplate(payload)
    logger.info("sendAwbCreated", { to, order_id: payload.order_id })
    return sendEmail({ to, subject: tpl.subject, html: tpl.html })
  }
}
