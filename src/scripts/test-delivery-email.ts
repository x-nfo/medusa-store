/**
 * Mock test script for delivery notification
 * Bypasses RajaOngkir API and simulates DELIVERED status
 * 
 * Run with: npx medusa exec src/scripts/test-delivery-email.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { logger } from "../services/logger"

export default async function testDeliveryEmail({ container }: ExecArgs) {
    logger.info("=== Mock Test: Delivery Email Notification ===")
    logger.info("This test bypasses RajaOngkir API and simulates DELIVERED status")

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const eventBusService = container.resolve(Modules.EVENT_BUS)

    try {
        // Fetch fulfillments
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
                shipped_at: { $ne: null },
            },
        })

        if (!fulfillments || fulfillments.length === 0) {
            logger.info("No shipped fulfillments found.")

            // Try to find any fulfillment for testing
            const { data: allFulfillments } = await query.graph({
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
                filters: {},
            })

            if (!allFulfillments || allFulfillments.length === 0) {
                logger.error("No fulfillments found at all. Please create an order first.")
                return
            }

            logger.info(`Found ${allFulfillments.length} fulfillments (not shipped). Using first one for test.`)
            fulfillments.push(allFulfillments[0])
        }

        // Use the first fulfillment for testing
        const fulfillment = fulfillments[0]
        const fulfillmentData = (fulfillment.data || {}) as Record<string, any>

        logger.info(`\n--- Testing with Fulfillment ${fulfillment.id} ---`)
        logger.info(`Order: #${fulfillment.order?.display_id || fulfillment.order?.id}`)
        logger.info(`Email: ${fulfillment.order?.email}`)
        logger.info(`Customer: ${fulfillment.order?.shipping_address?.first_name || "Unknown"}`)

        // Check if already tested
        if (fulfillmentData.mock_delivery_tested) {
            logger.warn("⚠️ This fulfillment has already been mock-tested.")
            logger.info("To re-test, manually remove 'mock_delivery_tested' from fulfillment metadata.")
            return
        }

        // Generate a mock AWB for testing
        const mockAwb = `MOCK-${Date.now()}`
        const mockCourier = "JNE"

        logger.info(`\n📦 Mock AWB: ${mockAwb}`)
        logger.info(`📦 Mock Courier: ${mockCourier}`)
        logger.info(`📦 Mock Status: DELIVERED`)

        // Update fulfillment metadata
        const updatedData = {
            ...fulfillmentData,
            delivery_status: "delivered",
            delivered_at: new Date().toISOString(),
            rajaongkir_last_status: "DELIVERED (MOCK)",
            awb: mockAwb,
            courier: mockCourier,
            mock_delivery_tested: true,
        }

        await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
            data: updatedData,
        })

        logger.info("✅ Fulfillment metadata updated.")

        // Emit shipment.delivered event
        const eventData = {
            fulfillment_id: fulfillment.id,
            order_id: fulfillment.order?.id,
            display_id: fulfillment.order?.display_id,
            email: fulfillment.order?.email,
            customer_name: fulfillment.order?.shipping_address?.first_name || "Pelanggan",
            awb: mockAwb,
            courier: mockCourier,
            delivery_date: new Date().toLocaleDateString("id-ID"),
        }

        logger.info("\n📧 Emitting 'shipment.delivered' event with data:")
        logger.info(JSON.stringify(eventData, null, 2))

        await eventBusService.emit({
            name: "shipment.delivered",
            data: eventData,
        })

        logger.info("\n✅ Event emitted successfully!")
        logger.info(`📬 Email should be sent to: ${fulfillment.order?.email}`)
        logger.info("\n=== Test Complete ===")
        logger.info("Check your email inbox or Resend dashboard for the delivery notification.")

    } catch (error) {
        logger.error(`Error in mock test: ${error}`)
    }
}
