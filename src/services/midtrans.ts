import MidtransClient from "midtrans-client"
import { createHash } from "crypto"

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true"
const serverKey = process.env.MIDTRANS_SERVER_KEY || ""
const clientKey = process.env.MIDTRANS_CLIENT_KEY || ""

// Create Snap API instance
const snap = new MidtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
})

export interface TransactionDetails {
    order_id: string
    gross_amount: number
}

export interface CustomerDetails {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
}

export interface ItemDetail {
    id: string
    price: number
    quantity: number
    name: string
}

export interface SnapTransactionParams {
    transaction_details: TransactionDetails
    customer_details?: CustomerDetails
    item_details?: ItemDetail[]
    callbacks?: {
        finish?: string
    }
}

export interface SnapTransactionResult {
    token: string
    redirect_url: string
}

export interface MidtransNotification {
    transaction_time: string
    transaction_status: string
    transaction_id: string
    status_message: string
    status_code: string
    signature_key: string
    order_id: string
    merchant_id: string
    gross_amount: string
    fraud_status?: string
    currency: string
    payment_type?: string
}

/**
 * Create a Snap transaction and get the token for frontend
 */
export async function createSnapTransaction(
    params: SnapTransactionParams
): Promise<SnapTransactionResult> {
    try {
        const parameter: Record<string, any> = {
            transaction_details: params.transaction_details,
            credit_card: {
                secure: true,
            },
        }

        if (params.customer_details) {
            parameter.customer_details = params.customer_details
        }

        if (params.item_details && params.item_details.length > 0) {
            parameter.item_details = params.item_details
        }

        if (params.callbacks?.finish) {
            parameter.callbacks = {
                finish: params.callbacks.finish,
            }
        }

        const transaction = await snap.createTransaction(parameter)

        return {
            token: transaction.token,
            redirect_url: transaction.redirect_url,
        }
    } catch (error: any) {
        console.error("Midtrans createSnapTransaction error:", error)
        throw new Error(
            `Failed to create Midtrans transaction: ${error.message || "Unknown error"}`
        )
    }
}

/**
 * Verify Midtrans notification signature
 * Signature = SHA512(order_id + status_code + gross_amount + serverKey)
 */
export function verifyNotificationSignature(
    notification: MidtransNotification
): boolean {
    const { order_id, status_code, gross_amount, signature_key } = notification

    const expectedSignature = createHash("sha512")
        .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
        .digest("hex")

    return expectedSignature === signature_key
}

/**
 * Get transaction status from Midtrans
 */
export async function getTransactionStatus(orderId: string): Promise<any> {
    try {
        const core = new MidtransClient.CoreApi({
            isProduction,
            serverKey,
            clientKey,
        })

        const status = await core.transaction.status(orderId)
        return status
    } catch (error: any) {
        console.error("Midtrans getTransactionStatus error:", error)
        throw new Error(
            `Failed to get transaction status: ${error.message || "Unknown error"}`
        )
    }
}

/**
 * Parse transaction status to determine payment state
 */
export function parseTransactionStatus(notification: MidtransNotification): {
    isPaid: boolean
    isPending: boolean
    isFailed: boolean
    isCancelled: boolean
    status: string
} {
    const { transaction_status, fraud_status } = notification

    const isPaid =
        transaction_status === "capture" ||
        transaction_status === "settlement"

    // For credit card, check fraud_status
    const isFraudAccepted = fraud_status === "accept" || !fraud_status

    return {
        isPaid: isPaid && isFraudAccepted,
        isPending: transaction_status === "pending",
        isFailed:
            transaction_status === "deny" ||
            (isPaid && fraud_status === "deny"),
        isCancelled:
            transaction_status === "cancel" || transaction_status === "expire",
        status: transaction_status,
    }
}

export default {
    createSnapTransaction,
    verifyNotificationSignature,
    getTransactionStatus,
    parseTransactionStatus,
}
