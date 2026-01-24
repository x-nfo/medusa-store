import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

type ShipmentDeliveredEvent = {
    fulfillment_id: string
    order_id: string
    display_id: string
    email: string
    customer_name?: string
    awb: string
    courier?: string
    delivery_date?: string
}

export default async function shipmentDeliveredHandler({
    event: { data },
    container,
}: SubscriberArgs<ShipmentDeliveredEvent>) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)

    if (!data?.email) {
        logger.warn(
            `Shipment delivered email skipped: missing email for fulfillment ${data?.fulfillment_id}`
        )
        return
    }

    if (!data?.awb) {
        logger.warn(
            `Shipment delivered email skipped: missing AWB for fulfillment ${data?.fulfillment_id}`
        )
        return
    }

    try {
        logger.info(
            `Sending delivery confirmed email to ${data.email} for order ${data.display_id || data.order_id}`
        )

        await notificationModuleService.createNotifications({
            to: data.email,
            channel: "email",
            template: "delivery-confirmed",
            data: {
                order_id: data.order_id,
                display_id: data.display_id || data.order_id,
                customer_name: data.customer_name || "Pelanggan",
                awb: data.awb,
                courier: data.courier,
                delivery_date: data.delivery_date || new Date().toLocaleDateString("id-ID"),
            },
        })

        logger.info(`Delivery confirmed email sent for order ${data.display_id || data.order_id}`)
    } catch (error) {
        logger.error("Failed to send delivery confirmed email", error)
    }
}

export const config: SubscriberConfig = {
    event: "shipment.delivered",
}
