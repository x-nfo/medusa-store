import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
  PaymentActions,
  PaymentWebhookEvents,
} from "@medusajs/framework/utils"

type PaymentWebhookEvent = {
  payload: Record<string, unknown>
}

export default async function paymentFailedReleaseReservationHandler({
  event: { data },
  container,
}: SubscriberArgs<PaymentWebhookEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const paymentService = container.resolve(Modules.PAYMENT)
  const inventoryService = container.resolve(Modules.INVENTORY)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const input = data as any
    if (input?.payload?.rawData?.type === "Buffer") {
      input.payload.rawData = Buffer.from(input.payload.rawData.data)
    }

    const processed = await paymentService.getWebhookActionAndData(input)
    const action = processed?.action
    const sessionId = processed?.data?.session_id as string | undefined

    if (!sessionId) {
      return
    }

    if (![PaymentActions.FAILED, PaymentActions.CANCELED].includes(action)) {
      return
    }

    const { data: paymentSessions } = await query.graph({
      entity: "payment_session",
      fields: ["payment_collection_id"],
      filters: { id: sessionId },
    })

    const paymentCollectionId = paymentSessions?.[0]?.payment_collection_id
    if (!paymentCollectionId) {
      return
    }

    const { data: cartPayments } = await query.graph({
      entity: "cart_payment_collection",
      fields: ["cart_id"],
      filters: { payment_collection_id: paymentCollectionId },
    })

    const cartId = cartPayments?.[0]?.cart_id
    if (!cartId) {
      return
    }

    const { data: cartOrders } = await query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id: cartId },
    })

    const orderId = cartOrders?.[0]?.order_id
    if (!orderId) {
      return
    }

    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "items.id"],
      filters: { id: orderId },
    })

    const lineItemIds =
      orders?.[0]?.items?.map((item: { id: string }) => item.id) ?? []

    if (!lineItemIds.length) {
      return
    }

    await inventoryService.deleteReservationItemsByLineItem(lineItemIds)
    logger.info(`Released reservations for failed payment session ${sessionId}`)
  } catch (error) {
    logger.error("Failed to release reservations for failed payment", error)
  }
}

export const config: SubscriberConfig = {
  event: PaymentWebhookEvents.WebhookReceived,
}
