import Midtrans from "midtrans-client"
import { createHash } from "crypto"
import {
    MidtransOptions,
    MidtransSnapParams,
    MidtransSnapResult,
    MidtransStatusResponse,
    MidtransCancelResponse,
    MidtransRefundResponse,
    MidtransExpireResponse,
    MidtransNotification,
} from "./types"

export class MidtransClient {
    private snap: Midtrans.Snap
    private core: Midtrans.CoreApi
    private serverKey: string
    private isProduction: boolean

    constructor(options: MidtransOptions) {
        this.serverKey = options.serverKey
        this.isProduction = options.isProduction ?? false

        this.snap = new Midtrans.Snap({
            isProduction: this.isProduction,
            serverKey: options.serverKey,
            clientKey: options.clientKey,
        })

        this.core = new Midtrans.CoreApi({
            isProduction: this.isProduction,
            serverKey: options.serverKey,
            clientKey: options.clientKey,
        })
    }

    /**
     * Create Snap transaction and return token
     */
    async createSnapTransaction(params: MidtransSnapParams): Promise<MidtransSnapResult> {
        const parameter: Record<string, any> = {
            transaction_details: params.transaction_details,
            credit_card: { secure: true },
        }

        if (params.customer_details) {
            parameter.customer_details = params.customer_details
        }

        if (params.item_details) {
            parameter.item_details = params.item_details
        }

        if (params.enabled_payments) {
            parameter.enabled_payments = params.enabled_payments
        }

        if (params.callbacks) {
            parameter.callbacks = params.callbacks
        }

        const transaction = await this.snap.createTransaction(parameter)

        return {
            token: transaction.token,
            redirect_url: transaction.redirect_url,
        }
    }

    /**
     * Get transaction status from Midtrans
     */
    async getTransactionStatus(orderId: string): Promise<MidtransStatusResponse> {
        const response = await this.core.transaction.status(orderId)
        return response as MidtransStatusResponse
    }

    /**
     * Cancel a pending/authorized transaction
     * Only works if transaction is still pending or authorized (not yet settled)
     */
    async cancelTransaction(orderId: string): Promise<MidtransCancelResponse> {
        const response = await this.core.transaction.cancel(orderId)
        return response as MidtransCancelResponse
    }

    /**
     * Expire a pending transaction
     * Used to immediately end a payment session that's waiting
     */
    async expireTransaction(orderId: string): Promise<MidtransExpireResponse> {
        const response = await this.core.transaction.expire(orderId)
        return response as MidtransExpireResponse
    }

    /**
     * Refund a settled transaction
     * Only works for transactions that are already settled
     */
    async refundTransaction(
        orderId: string,
        amount: number,
        reason?: string
    ): Promise<MidtransRefundResponse> {
        const refundKey = `refund-${orderId}-${Date.now()}`

        const response = await this.core.transaction.refund(orderId, {
            refund_key: refundKey,
            amount: amount,
            reason: reason || "Order creation failed - automatic refund",
        })

        return response as MidtransRefundResponse
    }

    /**
     * Verify webhook notification signature
     */
    verifySignature(notification: MidtransNotification): boolean {
        const { order_id, status_code, gross_amount, signature_key } = notification

        const expectedSignature = createHash("sha512")
            .update(`${order_id}${status_code}${gross_amount}${this.serverKey}`)
            .digest("hex")

        return expectedSignature === signature_key
    }

    /**
     * Parse transaction status into boolean flags
     */
    parseTransactionStatus(status: string): {
        isPaid: boolean
        isPending: boolean
        isFailed: boolean
        isCancelled: boolean
        isRefunded: boolean
    } {
        return {
            isPaid: status === "capture" || status === "settlement",
            isPending: status === "pending" || status === "authorize",
            isFailed: status === "deny",
            isCancelled: status === "cancel" || status === "expire",
            isRefunded: status === "refund" || status === "partial_refund",
        }
    }

    /**
     * Determine compensation action based on transaction status
     */
    async getCompensationAction(orderId: string): Promise<"cancel" | "refund" | "none"> {
        try {
            const status = await this.getTransactionStatus(orderId)
            const parsed = this.parseTransactionStatus(status.transaction_status)

            if (parsed.isPending) {
                return "cancel" // Can cancel pending transactions
            } else if (parsed.isPaid) {
                return "refund" // Must refund settled transactions
            } else {
                return "none" // Already cancelled/failed/refunded
            }
        } catch (error) {
            console.error("Failed to get transaction status for compensation:", error)
            return "none"
        }
    }
}
