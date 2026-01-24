import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function reconcilePayments(container: MedusaContainer) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const paymentModule = container.resolve(Modules.PAYMENT)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const workflowEngine = container.resolve(Modules.WORKFLOW_ENGINE)

    try {
        // 1. Find pending payment sessions older than 5 minutes
        // We add a buffer of 5 minutes to allow for "normal" slow webhooks or user user interaction time
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

        // We limit to 24 hours to avoid scanning ancient history unnecessarily
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

        // Query pending sessions
        const { data: paymentSessions } = await query.graph({
            entity: "payment_session",
            fields: [
                "id",
                "status",
                "data",
                "provider_id",
                "payment_collection.id",
                "payment_collection.cart.id",
                "payment_collection.cart.completed_at",
                "created_at"
            ],
            filters: {
                status: "pending",
                created_at: {
                    $lt: fiveMinutesAgo,
                    $gt: twentyFourHoursAgo
                },
            }
        })

        if (paymentSessions.length > 0) {
            logger.info(`[Reconcile] Found ${paymentSessions.length} pending payment sessions to check...`)
        }

        let fixedCount = 0

        for (const session of paymentSessions) {
            // We only care about Midtrans (or providers that support this flow)
            // The session data must have a midtrans_order_id to be checkable
            const midtransOrderId = (session.data as any)?.midtrans_order_id
            if (!midtransOrderId) {
                continue
            }

            // Skip if cart is already completed (just in case)
            const cart = (session.payment_collection as any)?.cart
            if (cart?.completed_at) {
                continue
            }

            if (!cart?.id) {
                // This is weird, but skip
                continue
            }

            try {
                // 2. Attempt Force Authorization
                // Calling authorizePaymentSession triggers the provider's authorizePayment method.
                // Our Midtrans provider implementation proactively calls getTransactionStatus to verification logic.

                const authorizedSession = await paymentModule.authorizePaymentSession(session.id, {})

                if ((authorizedSession as any).status === "authorized") {
                    logger.info(`[Reconcile] ORPHAN FOUND: Payment ${session.id} (Midtrans: ${midtransOrderId}) is PAID but order missing. Completing cart...`)

                    // 3. Auto-Complete Cart
                    try {
                        // Release pending reservation if exists (Flash Sale Protection)
                        const inventoryService = container.resolve(Modules.INVENTORY)

                        // Get cart line items to find related reservations
                        // Note: metadata filtering not supported, use line_item_id filter
                        const lineItemIds = cart.items?.map((i: any) => i.id) ?? []
                        const reservations = lineItemIds.length > 0
                            ? await inventoryService.listReservationItems({ line_item_id: lineItemIds })
                            : []

                        if (reservations.length > 0) {
                            const ids = reservations.map((r: any) => r.id)
                            await inventoryService.deleteReservationItems(ids)
                        }

                        await workflowEngine.run("complete-cart", {
                            input: { id: cart.id },
                            throwOnError: true
                        })
                        logger.info(`[Reconcile] FIXED: Order created for orphan payment ${session.id}`)
                        fixedCount++
                    } catch (wfError: any) {
                        logger.error(`[Reconcile] FAILED to fix orphan payment ${session.id}: Complete Cart Workflow failed. Error: ${wfError.message}`)
                    }
                } else {
                    // Still pending or cancelled/expired.
                    // We could log this if verbose, but standard log level might be too noisy.
                }

            } catch (err: any) {
                // If authorize fails (e.g. network error), we just skip and try next time
                logger.warn(`[Reconcile] Error checking session ${session.id}. Error: ${err.message}`)
            }
        }

        if (fixedCount > 0) {
            logger.info(`[Reconcile] Job finished. Recovered ${fixedCount} orphan orders.`)
        }

    } catch (error: any) {
        logger.error(`[Reconcile] Critical job failure. Error: ${error.message}`)
    }
}

export const config = {
    name: "reconcile-payments",
    schedule: "0 * * * *", // Run every hour
}
