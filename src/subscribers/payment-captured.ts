import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GmailNotificationService } from "../modules/notification-gmail"

type PaymentCapturedEvent = {
  id: string
}

const getCustomerName = (order: any) =>
  order?.shipping_address?.first_name ||
  order?.billing_address?.first_name ||
  order?.customer?.first_name ||
  undefined

const formatOrderRef = (order: any) =>
  order?.display_id ? `#${order.display_id}` : order?.id

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentCapturedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const gmailNotificationService = new GmailNotificationService()
  const inventoryService = container.resolve(Modules.INVENTORY)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  let order: any

  try {
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: [
        "id",
        "payment_collection_id",
        "payment_collection.order.id",
        "payment_collection.order.display_id",
        "payment_collection.order.email",
        "payment_collection.order.total",
        "payment_collection.order.currency_code",
        "payment_collection.order.items.id",
        "payment_collection.order.shipping_address.first_name",
        "payment_collection.order.billing_address.first_name",
        "payment_collection.order.customer.first_name",
      ],
      filters: { id: data.id },
    })

    const payment = payments?.[0]
    order = payment?.payment_collection?.order

    if (!order?.id) {
      logger.warn(`Payment captured skipped: missing order for payment ${data.id}`)
      return
    }

    if (!order?.email) {
      logger.warn(
        `Payment captured email skipped: missing email for order ${order.id}`
      )
    } else {
      const orderRef = formatOrderRef(order)
      const customerName = getCustomerName(order)

      logger.info(
        `Payment captured email queued for ${order.email} (order ${orderRef})`
      )

      await gmailNotificationService.sendPaymentConfirmed(order.email, {
        order_id: orderRef,
        customer_name: customerName,
      })
    }
  } catch (error) {
    logger.error("Failed to process payment captured notification", error)
    return
  }

  const lineItemIds = order?.items?.map((item: { id: string }) => item.id) ?? []
  if (!lineItemIds.length) {
    return
  }

  try {
    const reservations = await inventoryService.listReservationItems({
      line_item_id: lineItemIds,
    })

    if (!reservations.length) {
      return
    }

    const confirmedAt = new Date().toISOString()
    await inventoryService.updateReservationItems(
      reservations.map((reservation) => ({
        id: reservation.id,
        description: "checkout:confirmed",
        metadata: {
          ...(reservation.metadata ?? {}),
          status: "confirmed",
          confirmed_at: confirmedAt,
          expires_at: null,
        },
      }))
    )
  } catch (error) {
    logger.error("Failed to confirm reservation items after payment capture", error)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
