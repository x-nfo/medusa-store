import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GmailNotificationService } from "../modules/notification-gmail"
type ShipmentCreatedEvent = {
  id: string
  no_notification?: boolean
}

const getCustomerName = (order: any) =>
  order?.shipping_address?.first_name ||
  order?.billing_address?.first_name ||
  order?.customer?.first_name ||
  undefined

const formatOrderRef = (order: any) =>
  order?.display_id ? `#${order.display_id}` : order?.id

const collectTrackingNumbers = (fulfillment: any) => {
  const trackingNumbers = new Set<string>()
  if (fulfillment?.data?.awb) {
    trackingNumbers.add(String(fulfillment.data.awb))
  }
  if (fulfillment?.data?.tracking_number) {
    trackingNumbers.add(String(fulfillment.data.tracking_number))
  }
  for (const label of fulfillment?.labels || []) {
    if (label?.tracking_number) {
      trackingNumbers.add(String(label.tracking_number))
    }
  }
  return Array.from(trackingNumbers)
}

const resolveTrackingUrl = (fulfillment: any) =>
  fulfillment?.data?.tracking_url ??
  fulfillment?.tracking_links?.[0]?.url ??
  fulfillment?.data?.label_url

export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<ShipmentCreatedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const gmailNotificationService = new GmailNotificationService()

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
        "order.shipping_address.first_name",
        "order.billing_address.first_name",
        "order.customer.first_name",
        "tracking_links.url",
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

    const trackingNumbers = collectTrackingNumbers(fulfillment)
    const awb = trackingNumbers[0]

    if (!awb) {
      logger.warn(
        `Shipment created email skipped: missing AWB for fulfillment ${data.id}`
      )
      return
    }

    const orderRef = formatOrderRef(order)
    const customerName = getCustomerName(order)
    const trackingUrl = resolveTrackingUrl(fulfillment)

    logger.info(
      `Shipment created email queued for ${order.email} (order ${orderRef})`
    )

    await gmailNotificationService.sendAwbCreated(order.email, {
      order_id: orderRef,
      awb,
      tracking_url: trackingUrl,
      customer_name: customerName,
    })
  } catch (error) {
    logger.error("Failed to send shipment created email", error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
