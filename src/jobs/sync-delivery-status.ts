import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { RajaOngkirClient } from "../services/rajaongkir-client"
import { logger } from "../services/logger"

export default async function syncDeliveryStatus(container: MedusaContainer) {
    if (process.env.NODE_ENV === "test") {
        return
    }

    logger.info("Starting sync-delivery-status job...")

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const eventBusService = container.resolve(Modules.EVENT_BUS)
    const rajaOngkirClient = new RajaOngkirClient()

    try {
        // Fetch fulfillments that have AWB but are not yet marked as delivered
        const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: [
                "id",
                "data",
                "labels",
                "shipped_at",
                "order.id",
                "order.display_id",
                "order.email",
                "order.shipping_address.first_name",
            ],
            filters: {
                shipped_at: { $ne: null }, // Only shipped fulfillments
            },
        })

        if (!fulfillments || fulfillments.length === 0) {
            logger.info("No shipped fulfillments to check.")
            return
        }

        logger.info(`Found ${fulfillments.length} fulfillments to check tracking.`)

        for (const fulfillment of fulfillments) {
            const fulfillmentData = (fulfillment.data || {}) as Record<string, any>

            // Skip if already marked as delivered
            if (fulfillmentData.delivery_status === "delivered") {
                continue
            }

            // Get tracking number
            const trackingNumber =
                fulfillmentData.awb ||
                fulfillmentData.tracking_number ||
                fulfillment.labels?.[0]?.tracking_number

            if (!trackingNumber) {
                continue
            }

            // Get courier info
            const courier =
                fulfillmentData.courier ||
                fulfillmentData.shipping_code ||
                fulfillmentData.shipping ||
                "JNE"

            logger.info(
                `Checking status for order ${fulfillment.order?.display_id} - AWB: ${trackingNumber} (${courier})`
            )

            try {
                const result = await rajaOngkirClient.track(trackingNumber, courier)
                const latestStatus = result.latest_status.toUpperCase()

                logger.info(`Tracking result for ${trackingNumber}: ${latestStatus}`)

                if (
                    latestStatus === "DELIVERED" ||
                    latestStatus.includes("DELIVERED")
                ) {
                    // Update fulfillment metadata
                    const updatedData = {
                        ...fulfillmentData,
                        delivery_status: "delivered",
                        delivered_at: new Date().toISOString(),
                        rajaongkir_last_status: latestStatus,
                    }

                    await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
                        data: updatedData,
                    })

                    logger.info(
                        `Fulfillment ${fulfillment.id} marked as delivered. Emitting event...`
                    )

                    // Emit shipment.delivered event for email notification
                    await eventBusService.emit({
                        name: "shipment.delivered",
                        data: {
                            fulfillment_id: fulfillment.id,
                            order_id: fulfillment.order?.id,
                            display_id: fulfillment.order?.display_id,
                            email: fulfillment.order?.email,
                            customer_name: fulfillment.order?.shipping_address?.first_name,
                            awb: trackingNumber,
                            courier: courier,
                            delivery_date: new Date().toLocaleDateString("id-ID"),
                        },
                    })

                    logger.info(
                        `Order ${fulfillment.order?.display_id} is DELIVERED. Email event emitted.`
                    )
                }
            } catch (err) {
                logger.error(`Failed to track ${trackingNumber}: ${err}`)
            }
        }
    } catch (error) {
        logger.error(`Error in sync-delivery-status job: ${error}`)
    }
}

export const config = {
    name: "sync-delivery-status",
    schedule: "0 * * * *", // Every hour
}
