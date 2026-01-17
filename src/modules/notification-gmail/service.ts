import { sendEmail } from "../../services/email-service"
import { logger } from "../../services/logger"
import {
  awbCreatedTemplate,
  deliveryConfirmedTemplate,
  orderCreatedTemplate,
  paymentConfirmedTemplate,
} from "./templates"
import {
  AwbCreatedPayload,
  DeliveryConfirmedPayload,
  OrderCreatedPayload,
  PaymentConfirmedPayload,
} from "./types"

export class GmailNotificationService {
  static readonly identifier = "np_gmail"

  private ensureRecipient(to?: string): to is string {
    if (!to) {
      logger.warn("Notification email skipped: recipient missing")
      return false
    }
    return true
  }

  async sendOrderCreated(to: string | undefined, payload: OrderCreatedPayload) {
    if (!this.ensureRecipient(to)) {
      return
    }

    const template = orderCreatedTemplate(payload)
    logger.info("sendOrderCreated", { to, order_id: payload.order_id })
    await sendEmail({ to, subject: template.subject, html: template.html })
  }

  async sendPaymentConfirmed(
    to: string | undefined,
    payload: PaymentConfirmedPayload
  ) {
    if (!this.ensureRecipient(to)) {
      return
    }

    const template = paymentConfirmedTemplate(payload)
    logger.info("sendPaymentConfirmed", { to, order_id: payload.order_id })
    await sendEmail({ to, subject: template.subject, html: template.html })
  }

  async sendAwbCreated(to: string | undefined, payload: AwbCreatedPayload) {
    if (!this.ensureRecipient(to)) {
      return
    }

    const template = awbCreatedTemplate(payload)
    logger.info("sendAwbCreated", { to, order_id: payload.order_id })
    await sendEmail({ to, subject: template.subject, html: template.html })
  }

  async sendDeliveryConfirmed(
    to: string | undefined,
    payload: DeliveryConfirmedPayload
  ) {
    if (!this.ensureRecipient(to)) {
      return
    }

    const template = deliveryConfirmedTemplate(payload)
    logger.info("sendDeliveryConfirmed", { to, order_id: payload.order_id })
    await sendEmail({ to, subject: template.subject, html: template.html })
  }
}
