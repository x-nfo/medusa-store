import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
type ShipmentCreatedEvent = {
  id: string
  no_notification?: boolean
}

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationModuleService = container.resolve(Modules.NOTIFICATION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  if (data?.no_notification) {
    logger.info(
      `Shipment created email skipped (no_notification) for fulfillment ${data.id}`
    )
    return
  }

  try {
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "data",
        "labels",
        "order.id",
        "order.display_id",
        "order.email",
        "order.total",
        "order.currency_code",
      ],
      filters: { id: data.id },
    })

    const fulfillment = fulfillments?.[0]
    const order = fulfillment?.order

    if (!order?.email) {
      logger.warn(
        `Shipment created email skipped: missing order/email for fulfillment ${data.id}`
      )
      return
    }

    const trackingNumbers = new Set<string>()
    if (fulfillment?.data?.awb) {
      trackingNumbers.add(String(fulfillment.data.awb))
    }
    for (const label of fulfillment?.labels || []) {
      if (label?.tracking_number) {
        trackingNumbers.add(String(label.tracking_number))
      }
    }

    logger.info(
      `Shipment created email queued for ${order.email} (order ${order.id})`
    )

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order.shipment_created",
      data: {
        id: order.id,
        display_id: order.display_id,
        total: order.total,
        currency_code: order.currency_code,
        fulfillment: {
          id: fulfillment?.id,
          tracking_numbers: Array.from(trackingNumbers),
        },
      },
      trigger_type: "shipment.created",
      resource_id: order.id,
      resource_type: "order",
    })
  } catch (error) {
    logger.error("Failed to send shipment created email", error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
