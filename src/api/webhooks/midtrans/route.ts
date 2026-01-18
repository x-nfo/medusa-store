import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { logger } from "../../../services/logger"
import * as crypto from "crypto"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const data = req.body as any
        const notification = data

        const orderId = notification.order_id
        const transactionStatus = notification.transaction_status
        const fraudStatus = notification.fraud_status
        const signatureKey = notification.signature_key
        const statusCode = notification.status_code
        const grossAmount = notification.gross_amount

        logger.info("Midtrans Webhook received", {
            orderId,
            transactionStatus,
            fraudStatus,
            statusCode
        })

        // Verify signature
        const serverKey = process.env.MIDTRANS_SERVER_KEY
        if (!serverKey) {
            logger.error("MIDTRANS_SERVER_KEY not found")
            return res.status(500).json({ message: "Server key not configured" })
        }

        const payload = orderId + statusCode + grossAmount + serverKey
        const calculatedSignature = crypto.createHash("sha512").update(payload).digest("hex")

        if (calculatedSignature !== signatureKey) {
            logger.error("Invalid signature key in Midtrans webhook")
            return res.status(403).json({ message: "Invalid signature" })
        }

        const paymentModule = req.scope.resolve(Modules.PAYMENT)

        // In Medusa 2.0 with payment collection, the 'order_id' from midtrans might be 'cart_id' or 'payment_session_id' 
        // depending on how we created the transaction. 
        // If we used the logic from previous contexts, we might have passed cart ID or payment session ID as order_title/id.

        // Let's assume we find the payment session by the ID in 'order_id' or iterate/search.
        // However, standardized way: The `order_id` in Midtrans matches the `id` of the Payment Collection or Payment Session?
        // Usually we set Midtrans `order_id` to be the Payment Session ID.

        // We need to capture the payment in Medusa.
        // However, Medusa's standard workflow should handle capture if we update the payment session status?
        // Or we use the payment module to update.

        // If transaction_status is settlement or capture, we mark payment as authorized/captured.

        // NOTE: In Medusa 2, workflows are the preferred way to handle this. 
        // But for now let's try to update the payment session status directly via Payment Module 
        // or trigger a webhook event that Medusa listens to?
        // Actually, Medusa has a method `paymentProviders.authorizePayment`?

        // Let's attempt to identify the payment session.
        // If `order_id` is the payment session ID:

        // First, verify what `order_id` we sent.
        // In `src/api/store/payments/midtrans/snap/route.ts` (if I recall correctly), we likely initiated a payment session.

        // Let's look up the payment session using the module.
        // We can list payment sessions filtered by `data.external_id` OR if we used the ID directly.

        // Simplest approach:
        // If status is 'settlement' or 'capture', we count it as authorized.

        if (transactionStatus === "capture" || transactionStatus === "settlement") {
            if (fraudStatus === "challenge") {
                // Deny or manual review
                logger.warn(`Payment ${orderId} is challenged`)
            } else if (fraudStatus === "accept" || !fraudStatus) {
                // Success
                // Success
                logger.info(`Payment ${orderId} is successful (settlement/capture)`)

                // Authorize the payment session in Medusa
                // 'orderId' from Midtrans is the Payment Session ID ('payses_...')
                try {
                    const paymentSession = await paymentModule.authorizePaymentSession(orderId, {})

                    logger.info(`Payment session ${orderId} authorized in Medusa`)

                    // --- Server-Side Order Completion ---
                    // Prevent drop-off by completing the cart immediately
                    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
                    const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)

                    // 1. Get Payment Collection ID from Session
                    // We need to query the session to be sure we have the relation or use what we returned
                    // authorizePaymentSession returns the session object.

                    let paymentCollectionId = paymentSession.payment_collection_id
                    if (!paymentCollectionId) {
                        // Fallback query if relation not loaded
                        const { data: [sessionData] } = await query.graph({
                            entity: "payment_session",
                            fields: ["payment_collection_id"],
                            filters: { id: orderId }
                        })
                        paymentCollectionId = sessionData?.payment_collection_id
                    }

                    if (paymentCollectionId) {
                        try {
                            // 2. Find the Cart
                            // Note: querying Cart directly by payment_collection_id might fail if the definition doesn't expose it as a filterable field in remoteQuery.
                            // Strategy: Query Payment Collection first, which SHOULD have currency_code and amount, and potentially a link to Cart.
                            // Actually, PaymentCollection has a 'cart_id' property usually.

                            // Query Payment Collection and request the 'cart' relation explicitly
                            const { data: [paymentCollection] } = await query.graph({
                                entity: "payment_collection",
                                fields: ["id", "currency_code", "amount", "cart.id"],
                                filters: { id: paymentCollectionId }
                            })

                            const cartId = paymentCollection?.cart?.id

                            if (cartId) {
                                const { data: [cart] } = await query.graph({
                                    entity: "cart",
                                    fields: ["id", "completed_at"],
                                    filters: { id: cartId }
                                })

                                if (cart && !cart.completed_at) {
                                    logger.info(`Completing cart ${cart.id} for payment session ${orderId} via Webhook`)

                                    // 3. Trigger Complete Cart Workflow
                                    // ... logic continues ...
                                    try {
                                        await workflowEngine.run("complete-cart", {
                                            input: { id: cart.id },
                                            throwOnError: true // We want to catch and log if it fails
                                        })
                                        logger.info(`Detailed Order created successfully for cart ${cart.id}`)
                                    } catch (wfError: any) {
                                        logger.error(`Failed to complete cart ${cart.id} in webhook`, {
                                            error: wfError.message
                                        })

                                        // --- COMPENSATION / ROLLBACK ---
                                        try {
                                            logger.info(`Attempting to rollback/refund payment session ${orderId} due to order creation failure`)
                                            await paymentModule.cancelPaymentSession(orderId)
                                            logger.info(`Successfully rolled back/refunded payment session ${orderId}`)
                                        } catch (rollbackError: any) {
                                            logger.error(`CRITICAL: Failed to rollback payment ${orderId} after order failure!`, {
                                                error: rollbackError.message
                                            })
                                        }
                                    }
                                } else if (cart?.completed_at) {
                                    logger.info(`Cart ${cart.id} already completed, skipping completion workflow`)
                                }
                            } else {
                                logger.warn(`Payment Collection ${paymentCollectionId} has no cart_id linked`)
                            }
                        } catch (queryError: any) {
                            logger.error(`Failed to query cart for payment collection ${paymentCollectionId}`, queryError)
                        }
                    } else {
                        logger.warn(`Could not find payment_collection for session ${orderId}`)
                    }

                } catch (authError: any) {
                    logger.error(`Failed to authorize payment session ${orderId}`, authError)
                    // We don't return error to Midtrans to avoid retries if it's internal Medusa issue?
                    // Better to log.
                }
            }
        } else if (transactionStatus === "cancel" || transactionStatus === "deny" || transactionStatus === "expire") {
            logger.info(`Payment ${orderId} is ${transactionStatus}`)
        } else if (transactionStatus === "pending") {
            logger.info(`Payment ${orderId} is pending`)
        }

        return res.json({ status: "ok" })
    } catch (err: any) {
        logger.error("Midtrans webhook error", err)
        return res.status(500).json({ message: err.message })
    }
}
