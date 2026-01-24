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

        // ... Payment collection creation remains above ...

        // Step 2: Initiate Payment with Reservation (New Workflow)
        // This workflow handles: Locking -> Reservation -> Snap Token -> Unlock
        const { result, errors: wfErrors } = await workflowEngine.run(
            "initiate-midtrans-payment",
            {
                input: {
                    cart_id,
                    finish_url
                },
                throwOnError: false
            }
        )

        if (wfErrors.length) {
            const err = wfErrors[0].error || wfErrors[0]
            logger.error("Failed to initiate Midtrans payment workflow", { error: err.message })
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                `Payment initiation failed: ${err.message}`
            )
        }

        return res.json(result)

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
