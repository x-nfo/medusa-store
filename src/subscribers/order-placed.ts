import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type OrderPlacedEvent = {
  id: string
}

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)
  const orderModuleService = container.resolve(Modules.ORDER)

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      select: ["id", "display_id", "email", "total", "currency_code"],
    })

    if (!order?.email) {
      logger.warn(`Order placed email skipped: missing email for order ${data.id}`)
      return
    }

    logger.info(
      `Order placed email queued for ${order.email} (order ${order.id})`
    )

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.placed",
      data: {
        id: order.id,
        display_id: order.display_id,
        total: order.total,
        currency_code: order.currency_code,
      },
      trigger_type: "order.placed",
      resource_id: order.id,
      resource_type: "order",
    })
  } catch (error) {
    logger.error("Failed to send order placed email", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
