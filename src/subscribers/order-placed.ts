import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GmailNotificationService } from "../modules/notification-gmail"

type OrderPlacedEvent = {
  id: string
}

const formatCurrency = (amount: number, currency?: string) => {
  const value = Number.isFinite(amount) ? amount / 100 : 0
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: (currency || "IDR").toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const getCustomerName = (order: any) =>
  order?.shipping_address?.first_name ||
  order?.billing_address?.first_name ||
  order?.customer?.first_name ||
  undefined

const formatOrderRef = (order: any) =>
  order?.display_id ? `#${order.display_id}` : order?.id

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModuleService = container.resolve(Modules.ORDER)
  const gmailNotificationService = new GmailNotificationService()

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      select: [
        "id",
        "display_id",
        "email",
        "total",
        "currency_code",
        "shipping_address.first_name",
        "billing_address.first_name",
        "customer.first_name",
      ],
    })

    if (!order?.email) {
      logger.warn(`Order placed email skipped: missing email for order ${data.id}`)
      return
    }

    const totalFormatted = formatCurrency(order.total, order.currency_code)
    const customerName = getCustomerName(order)
    const orderRef = formatOrderRef(order)

    logger.info(`Order placed email queued for ${order.email} (order ${orderRef})`)

    await gmailNotificationService.sendOrderCreated(order.email, {
      order_id: orderRef,
      total: totalFormatted,
      customer_name: customerName,
    })
  } catch (error) {
    logger.error("Failed to send order placed email", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
