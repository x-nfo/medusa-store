import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
    ContainerRegistrationKeys,
    MedusaError,
    remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import {
    createSnapTransaction,
    SnapTransactionParams,
    ItemDetail,
} from "../../../../../services/midtrans"

type SnapInitiateRequest = {
    cart_id: string
    finish_url?: string
}

// Fields needed for Midtrans transaction
const cartFields = [
    "id",
    "email",
    "total",
    "subtotal",
    "shipping_total",
    "metadata",
    "items.id",
    "items.title",
    "items.quantity",
    "items.unit_price",
    "items.variant_id",
    "items.variant.title",
    "shipping_address.first_name",
    "shipping_address.last_name",
    "shipping_address.phone",
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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const { cart_id, finish_url } = (req.body ?? {}) as SnapInitiateRequest

    if (!cart_id) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required")
    }

    try {
        // Fetch cart using remoteQuery (Medusa v2 pattern)
        const cart = await fetchCart(cart_id, req.scope)

        if (!cart) {
            throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
        }

        if (!cart.items || cart.items.length === 0) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Cart is empty"
            )
        }

        // Calculate totals
        const subtotal = cart.items.reduce((sum: number, item: any) => {
            const unitPrice = item.unit_price || 0
            const quantity = item.quantity || 0
            return sum + unitPrice * quantity
        }, 0)

        // Get shipping total from cart if available
        const shippingTotal = cart.shipping_total || 0
        const grossAmount = cart.total || (subtotal + shippingTotal)

        // Generate unique order ID for Midtrans
        const orderId = `ORDER-${cart_id.substring(0, 8)}-${Date.now()}`

        // Build item details for Midtrans
        const itemDetails: ItemDetail[] = cart.items.map((item: any) => ({
            id: item.variant_id || item.id,
            price: Math.round(item.unit_price || 0),
            quantity: item.quantity || 1,
            name: (item.title || item.variant?.title || "Product").substring(0, 50),
        }))

        // Add shipping as item if present
        if (shippingTotal > 0) {
            itemDetails.push({
                id: "SHIPPING",
                price: Math.round(shippingTotal),
                quantity: 1,
                name: "Ongkos Kirim",
            })
        }

        // Build customer details
        const shippingAddress = cart.shipping_address
        const customerDetails = {
            first_name: shippingAddress?.first_name || "Customer",
            last_name: shippingAddress?.last_name || "",
            email: cart.email || "guest@example.com",
            phone: shippingAddress?.phone || "",
        }

        // Build Snap transaction params
        const snapParams: SnapTransactionParams = {
            transaction_details: {
                order_id: orderId,
                gross_amount: Math.round(grossAmount),
            },
            customer_details: customerDetails,
            item_details: itemDetails,
        }

        // Add finish callback URL if provided
        if (finish_url) {
            snapParams.callbacks = {
                finish: finish_url,
            }
        }

        // Create Snap transaction
        const result = await createSnapTransaction(snapParams)

        // Update cart metadata with midtrans_order_id for webhook to find cart later
        try {
            const cartModule = req.scope.resolve("cart")
            await cartModule.updateCarts([{
                id: cart_id,
                metadata: {
                    ...cart.metadata,
                    midtrans_order_id: orderId,
                },
            }])
        } catch (updateError) {
            console.warn("Failed to update cart metadata with midtrans_order_id:", updateError)
            // Continue anyway - payment can still work, just webhook won't find cart
        }

        res.json({
            token: result.token,
            redirect_url: result.redirect_url,
            order_id: orderId,
        })
    } catch (error: any) {
        console.error("Midtrans Snap initiation error:", error)

        if (error instanceof MedusaError) {
            throw error
        }

        throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            `Failed to initiate payment: ${error.message || "Unknown error"}`
        )
    }
}
