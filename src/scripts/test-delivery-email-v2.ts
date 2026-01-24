/**
 * Fresh mock test for delivery notification with reset
 * 
 * Run with: npx medusa exec src/scripts/test-delivery-email-v2.ts
 */
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { logger } from "../services/logger"

export default async function testDeliveryEmailV2({ container }: ExecArgs) {
    logger.info("=== Mock Test V2: Delivery Email Notification ===")

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    try {
        // Fetch any fulfillment
        const { data: fulfillments } = await query.graph({
            entity: "fulfillment",
            fields: [
                "id",
                "data",
                "order.id",
                "order.display_id",
                "order.email",
                "order.shipping_address.first_name",
            ],
            filters: {},
        })

        if (!fulfillments || fulfillments.length === 0) {
            logger.error("No fulfillments found. Please create an order first.")
            return
        }

        // Find second fulfillment if available (to test a fresh one)
        const fulfillment = fulfillments.length > 1 ? fulfillments[1] : fulfillments[0]
        const fulfillmentData = (fulfillment.data || {}) as Record<string, any>

        logger.info(`\n--- Testing with Fulfillment ${fulfillment.id} ---`)
        logger.info(`Order: #${fulfillment.order?.display_id || fulfillment.order?.id}`)
        logger.info(`Email: ${fulfillment.order?.email}`)
        logger.info(`Customer: ${fulfillment.order?.shipping_address?.first_name || "Unknown"}`)

        // Clear previous mock test flag
        const clearedData = {
            ...fulfillmentData,
            mock_delivery_tested: false,
        }
        await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
            data: clearedData,
        })

        // Generate mock AWB
        const mockAwb = `MOCK-${Date.now()}`
        const mockCourier = "JNE"

        logger.info(`\n📦 Mock AWB: ${mockAwb}`)
        logger.info(`📦 Mock Courier: ${mockCourier}`)

        // First update fulfillment metadata
        const updatedData = {
            ...clearedData,
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

        // Directly call notification service to test
        logger.info("\n📧 Sending email via notificationService.createNotifications()...")

        const notificationPayload = {
            to: fulfillment.order?.email || "test@example.com",
            channel: "email",
            template: "delivery-confirmed",
            data: {
                order_id: fulfillment.order?.id,
                display_id: fulfillment.order?.display_id || "TEST",
                customer_name: fulfillment.order?.shipping_address?.first_name || "Pelanggan",
                awb: mockAwb,
                courier: mockCourier,
                delivery_date: new Date().toLocaleDateString("id-ID"),
            },
        }

        logger.info(`Notification payload: ${JSON.stringify(notificationPayload, null, 2)}`)

        try {
            const result = await notificationService.createNotifications(notificationPayload)
            logger.info(`✅ Notification service returned: ${JSON.stringify(result)}`)
        } catch (notifError: any) {
            logger.error(`❌ Notification service error: ${notifError.message}`)
            logger.error(`Stack: ${notifError.stack}`)
        }

        logger.info("\n=== Test Complete ===")
        logger.info("Check the logs above for [Resend] messages to see what happened.")

    } catch (error: any) {
        logger.error(`Error in test: ${error.message}`)
        logger.error(`Stack: ${error.stack}`)
    }
}
