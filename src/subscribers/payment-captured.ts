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
        "payment_collection.order.items.id",
      ],
      filters: { id: data.id },
    })

    const payment = payments?.[0]
    order = payment?.payment_collection?.order

    if (!order?.id) {
      logger.debug(`Payment captured: order not found for payment ${data.id}`)
    }
  } catch (error) {
    logger.error("Failed to fetch payment order details", error)
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
