import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type PaymentCapturedEvent = {
  id: string
}

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentCapturedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)
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
      logger.info(
        `Payment captured email queued for ${order.email} (order ${order.id})`
      )

      await notificationModuleService.createNotifications({
        to: order.email,
        channel: "email",
        template: "order.payment_captured",
        data: {
          id: order.id,
          display_id: order.display_id,
          total: order.total,
          currency_code: order.currency_code,
          payment_id: data.id,
        },
        trigger_type: "payment.captured",
        resource_id: order.id,
        resource_type: "order",
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
