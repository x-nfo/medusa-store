import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
    ContainerRegistrationKeys,
    Modules,
    remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
    verifyNotificationSignature,
    parseTransactionStatus,
    MidtransNotification,
} from "../../../services/midtrans"
import { logger } from "../../../services/logger"

/**
 * Find cart by Midtrans order_id stored in cart metadata
 */
async function findCartByMidtransOrderId(
    scope: MedusaRequest["scope"],
    midtransOrderId: string
): Promise<any | null> {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    const queryObject = remoteQueryObjectFromString({
        entryPoint: "cart",
        variables: {
            filters: {
                completed_at: null
            }
        },
        fields: [
            "id",
            "email",
            "total",
            "currency_code",
            "region_id",
            "metadata",
            "completed_at",
            "payment_collection.id",
            "payment_collection.payment_sessions.id",
            "payment_collection.payment_sessions.status",
        ],
    })

    const carts = await remoteQuery(queryObject)

    const matchingCart = carts.find((cart: any) =>
        cart.metadata?.midtrans_order_id === midtransOrderId
    )

    return matchingCart || null
}

/**
 * Get the first available payment provider ID
 */
async function getPaymentProviderId(scope: MedusaRequest["scope"]): Promise<string> {
    try {
        const paymentModule = scope.resolve(Modules.PAYMENT)
        const providers = await paymentModule.listPaymentProviders({})

        // Find a suitable provider - prefer manual/system providers
        const manualProvider = providers.find((p: any) =>
            p.id.includes("manual") || p.id.includes("system")
        )

        if (manualProvider) return manualProvider.id
        if (providers.length > 0) return providers[0].id

        // Fallback to system default if no providers found
        return "pp_system_default"
    } catch (err) {
        logger.warn("Could not list payment providers", { error: (err as Error).message })
        return "pp_system_default"
    }
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const notification = req.body as MidtransNotification

    logger.info("Midtrans webhook received", {
        order_id: notification.order_id,
        transaction_status: notification.transaction_status,
        payment_type: notification.payment_type,
    })

    try {
        // Verify signature
        const isValidSignature = verifyNotificationSignature(notification)

        if (!isValidSignature) {
            logger.warn("Midtrans webhook: Invalid signature", {
                order_id: notification.order_id,
            })
            return res.status(400).json({ error: "Invalid signature" })
        }

        const status = parseTransactionStatus(notification)

        logger.info("Midtrans webhook: Payment status parsed", {
            order_id: notification.order_id,
            ...status,
        })

        if (status.isPaid) {
            logger.info("Payment successful, creating order...", {
                order_id: notification.order_id,
                gross_amount: notification.gross_amount,
                payment_type: notification.payment_type,
            })

            const cart = await findCartByMidtransOrderId(req.scope, notification.order_id)

            if (!cart) {
                logger.warn("Cart not found for Midtrans order_id", {
                    midtrans_order_id: notification.order_id,
                })
                return res.status(200).json({
                    received: true,
                    message: "Cart not found - may already be completed",
                })
            }

            if (cart.completed_at) {
                logger.info("Cart already completed", {
                    cart_id: cart.id,
                    midtrans_order_id: notification.order_id,
                })
                return res.status(200).json({
                    received: true,
                    message: "Cart already completed",
                })
            }

            const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
            const paymentModule = req.scope.resolve(Modules.PAYMENT)

            // Step 1: Create payment collection if not exists
            let paymentCollectionId = cart.payment_collection?.id

            if (!paymentCollectionId) {
                logger.info("Creating payment collection for cart", { cart_id: cart.id })

                try {
                    const { result: paymentCollectionResult, errors: pcErrors } = await workflowEngine.run(
                        "create-payment-collection-for-cart",
                        {
                            input: { cart_id: cart.id },
                            throwOnError: false,
                        }
                    )

                    if (pcErrors?.length) {
                        logger.error("Failed to create payment collection", {
                            cart_id: cart.id,
                            errors: pcErrors.map((e: any) => e.error?.message || e.message),
                        })
                        return res.status(200).json({
                            received: true,
                            error: "Failed to create payment collection",
                            details: pcErrors[0]?.error?.message,
                        })
                    }

                    paymentCollectionId = paymentCollectionResult?.id
                    logger.info("Payment collection created", {
                        cart_id: cart.id,
                        payment_collection_id: paymentCollectionId,
                    })
                } catch (err: any) {
                    logger.error("Error creating payment collection", {
                        cart_id: cart.id,
                        error: err.message,
                    })
                    return res.status(200).json({
                        received: true,
                        error: err.message,
                    })
                }
            }

            // Step 2: Create payment session if not exists
            const existingSessions = cart.payment_collection?.payment_sessions || []

            if (existingSessions.length === 0 && paymentCollectionId) {
                logger.info("Creating payment session", {
                    cart_id: cart.id,
                    payment_collection_id: paymentCollectionId
                })

                try {
                    const providerId = await getPaymentProviderId(req.scope)
                    const amount = parseFloat(notification.gross_amount)

                    const session = await paymentModule.createPaymentSession(paymentCollectionId, {
                        provider_id: providerId,
                        amount: amount,
                        currency_code: cart.currency_code || "idr",
                        data: {
                            midtrans_order_id: notification.order_id,
                            transaction_id: notification.transaction_id,
                            payment_type: notification.payment_type,
                            transaction_status: notification.transaction_status,
                        },
                    })

                    // Mark session as authorized since payment is already confirmed by Midtrans
                    await paymentModule.updatePaymentSession({
                        id: session.id,
                        amount: amount,
                        currency_code: cart.currency_code || "idr",
                        data: session.data,
                        status: "authorized",
                    })

                    logger.info("Payment session created and authorized", {
                        cart_id: cart.id,
                        session_id: session.id,
                    })
                } catch (err: any) {
                    logger.error("Failed to create payment session", {
                        cart_id: cart.id,
                        error: err.message,
                    })
                    // Continue anyway - try to complete cart
                }
            }

            // Step 3: Complete cart to create order
            try {
                const { result, errors } = await workflowEngine.run(
                    "complete-cart",
                    {
                        input: { id: cart.id },
                        throwOnError: false,
                    }
                )

                if (errors?.length) {
                    logger.error("Failed to complete cart workflow", {
                        cart_id: cart.id,
                        errors: errors.map((e: any) => e.error?.message || e.message),
                    })

                    return res.status(200).json({
                        received: true,
                        error: "Failed to complete cart",
                        details: errors[0]?.error?.message,
                    })
                }

                logger.info("Order created successfully via webhook", {
                    cart_id: cart.id,
                    order_id: result?.id,
                    midtrans_order_id: notification.order_id,
                })

                return res.status(200).json({
                    received: true,
                    order_id: result?.id,
                    status: "order_created",
                })
            } catch (workflowError: any) {
                logger.error("Workflow execution error", {
                    cart_id: cart.id,
                    error: workflowError.message,
                })

                return res.status(200).json({
                    received: true,
                    error: workflowError.message,
                })
            }
        } else if (status.isPending) {
            logger.info("Payment pending", { order_id: notification.order_id })
        } else if (status.isFailed || status.isCancelled) {
            logger.info("Payment failed/cancelled", {
                order_id: notification.order_id,
                status: status.status,
            })
        }

        res.status(200).json({
            received: true,
            order_id: notification.order_id,
            status: status.status,
        })
    } catch (error: any) {
        logger.error("Midtrans webhook error", {
            error: error.message,
            order_id: notification.order_id,
        })

        res.status(200).json({
            received: true,
            error: error.message,
        })
    }
}
