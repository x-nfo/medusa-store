import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
    ContainerRegistrationKeys,
    MedusaError,
    Modules,
    remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { logger } from "../../../../../services/logger"

type SnapInitiateRequest = {
    cart_id: string
    finish_url?: string
}

// Fields needed for cart with payment collection
const cartFields = [
    "id",
    "email",
    "total",
    "subtotal",
    "shipping_total",
    "currency_code",
    "region_id",
    "items.id",
    "items.title",
    "items.quantity",
    "items.unit_price",
    "items.variant_id",
    "items.variant.title",
    "shipping_address.first_name",
    "shipping_address.last_name",
    "shipping_address.phone",
    "payment_collection.id",
    "payment_collection.payment_sessions.id",
    "payment_collection.payment_sessions.status",
    "payment_collection.payment_sessions.provider_id",
    "payment_collection.payment_sessions.data",
]

const fetchCart = async (
    cartId: string,
    scope: MedusaRequest["scope"]
) => {
    const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const queryObject = remoteQueryObjectFromString({
        entryPoint: "cart",
        variables: { filters: { id: cartId } },
        fields: cartFields,
    })
    const [cart] = await remoteQuery(queryObject)
    return cart
}

/**
 * POST /store/payments/midtrans/snap
 * 
 * This endpoint initializes a Midtrans payment session using Medusa's standard
 * payment flow. It:
 * 1. Creates/gets payment collection for cart
 * 2. Initializes payment session with midtrans provider
 * 3. Returns Snap token from session data
 * 
 * The webhook will be handled by Medusa's standard endpoint:
 * /hooks/payment/midtrans_midtrans
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { cart_id, finish_url } = (req.body ?? {}) as SnapInitiateRequest

    if (!cart_id) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required")
    }

    try {
        // Fetch cart using remoteQuery
        let cart = await fetchCart(cart_id, req.scope)

        if (!cart) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
        }

        if (!cart.items || cart.items.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Cart is empty"
            )
        }

        const paymentModule = req.scope.resolve(Modules.PAYMENT)
        const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)

        // Step 1: Create payment collection if not exists
        let paymentCollectionId = cart.payment_collection?.id

        if (!paymentCollectionId) {
            logger.info("Creating payment collection for cart", { cart_id })

            const { result, errors } = await workflowEngine.run(
                "create-payment-collection-for-cart",
                {
                    input: { cart_id },
                    throwOnError: false,
                }
            )

            if (errors?.length) {
                throw new MedusaError(
                    MedusaError.Types.UNEXPECTED_STATE,
                    `Failed to create payment collection: ${errors[0]?.error?.message || errors[0]?.message}`
                )
            }

            paymentCollectionId = result?.id
            logger.info("Payment collection created", {
                cart_id,
                payment_collection_id: paymentCollectionId
            })

            // Refetch cart to get updated payment collection
            cart = await fetchCart(cart_id, req.scope)
        }

        // Step 2: Check for existing midtrans session
        const existingSessions = cart.payment_collection?.payment_sessions || []
        let midtransSession = existingSessions.find(
            (s: any) => s.provider_id === "pp_midtrans_midtrans" && s.data?.token
        )

        if (midtransSession?.data?.token) {
            // Return existing token
            logger.info("Returning existing Snap token", {
                cart_id,
                session_id: midtransSession.id
            })

            return res.json({
                token: midtransSession.data.token,
                redirect_url: midtransSession.data.redirect_url,
                order_id: midtransSession.data.midtrans_order_id,
                session_id: midtransSession.id,
            })
        }

        // Step 3: Create new payment session with Midtrans provider
        // This triggers initiatePayment() in MidtransPaymentProvider
        const amount = Math.round(cart.total || 0)
        const currencyCode = cart.currency_code || "idr"

        logger.info("Creating payment session with Midtrans", {
            cart_id,
            payment_collection_id: paymentCollectionId,
            amount,
            currency_code: currencyCode,
        })

        // Build context for initiatePayment
        const context = {
            customer: {
                first_name: cart.shipping_address?.first_name || "Customer",
                last_name: cart.shipping_address?.last_name || "",
                email: cart.email || "guest@example.com",
                phone: cart.shipping_address?.phone || "",
            },
            extra: {
                finish_url: finish_url || undefined,
                cart_id: cart_id,
                items: cart.items?.map((item: any) => ({
                    id: item.variant_id || item.id,
                    name: (item.title || item.variant?.title || "Product").substring(0, 50),
                    price: Math.round(item.unit_price || 0),
                    quantity: item.quantity || 1,
                })),
                shipping_total: cart.shipping_total || 0,
            },
        }

        const session = await paymentModule.createPaymentSession(paymentCollectionId, {
            provider_id: "pp_midtrans_midtrans",
            amount: amount,
            currency_code: currencyCode,
            context: context as any, // Cast to any for custom fields (customer, extra)
            data: {},
        })

        logger.info("Payment session created", {
            cart_id,
            session_id: session.id,
        })

        // Session data should contain token from initiatePayment()
        const sessionData = session.data as any

        if (!sessionData?.token) {
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                "Failed to get Snap token from payment session"
            )
        }

        res.json({
            token: sessionData.token,
            redirect_url: sessionData.redirect_url,
            order_id: sessionData.midtrans_order_id,
            session_id: session.id,
        })

    } catch (error: any) {
        logger.error("Midtrans Snap initiation error", {
            error: error.message,
            cart_id
        })

        if (error instanceof MedusaError) {
            throw error
        }

        throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Failed to initiate payment: ${error.message || "Unknown error"}`
        )
    }
}
