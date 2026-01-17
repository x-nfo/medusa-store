import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { GmailNotificationService } from "../modules/notification-gmail"

type DeliveryCreatedEvent = {
    id: string
    fulfillment_id: string
    awb?: string
    status?: string
    order_id?: string
    no_notification?: boolean
}

const getCustomerName = (order: any) =>
    order?.shipping_address?.first_name ||
    order?.billing_address?.first_name ||
    order?.customer?.first_name ||
    undefined

const formatOrderRef = (order: any) =>
    order?.display_id ? `#${order.display_id}` : order?.id

const formatDate = (date?: string | Date) => {
    if (!date) return undefined
    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "long",
        timeStyle: "short",
    }).format(new Date(date))
}

/**
 * Subscriber: Handle delivery.created event
 * 
 * Sends delivery confirmation email when a shipment is marked as delivered.
 */
export default async function deliveryCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<DeliveryCreatedEvent>) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const gmailNotificationService = new GmailNotificationService()

    if (data?.no_notification) {
        logger.info(
            `Delivery confirmation email skipped (no_notification) for fulfillment ${data.id}`
        )
        return
    }

    try {
        // Fetch fulfillment with order details
        const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: [
                "id",
                "data",
                "labels",
                "delivered_at",
                "order.id",
                "order.display_id",
                "order.email",
                "order.shipping_address.first_name",
                "order.billing_address.first_name",
                "order.customer.first_name",
            ],
            filters: { id: data.fulfillment_id || data.id },
        })

        const fulfillment = fulfillments?.[0]
        const order = fulfillment?.order

        if (!order?.email) {
            logger.warn(
                `Delivery confirmation email skipped: missing order/email for fulfillment ${data.id}`
            )
            return
        }

        // Get AWB from event data or fulfillment
        const awb =
            data.awb ||
            (fulfillment.data as any)?.awb ||
            fulfillment.labels?.[0]?.tracking_number

        if (!awb) {
            logger.warn(
                `Delivery confirmation email skipped: missing AWB for fulfillment ${data.id}`
            )
            return
        }

        const orderRef = formatOrderRef(order)
        const customerName = getCustomerName(order)
        const deliveryDate = formatDate(fulfillment.delivered_at || new Date())

        logger.info(
            `Delivery confirmation email queued for ${order.email} (order ${orderRef})`
        )

        await gmailNotificationService.sendDeliveryConfirmed(order.email, {
            order_id: orderRef,
            awb,
            customer_name: customerName,
            delivery_date: deliveryDate,
        })
    } catch (error) {
        logger.error("Failed to send delivery confirmation email", error)
    }
}

export const config: SubscriberConfig = {
    event: "delivery.created",
}
