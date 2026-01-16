import { AbstractPaymentProvider, BigNumber } from "@medusajs/framework/utils"
import {
    AuthorizePaymentInput,
    AuthorizePaymentOutput,
    CancelPaymentInput,
    CancelPaymentOutput,
    CapturePaymentInput,
    CapturePaymentOutput,
    DeletePaymentInput,
    DeletePaymentOutput,
    GetPaymentStatusInput,
    GetPaymentStatusOutput,
    InitiatePaymentInput,
    InitiatePaymentOutput,
    PaymentSessionStatus,
    ProviderWebhookPayload,
    RefundPaymentInput,
    RefundPaymentOutput,
    RetrievePaymentInput,
    RetrievePaymentOutput,
    UpdatePaymentInput,
    UpdatePaymentOutput,
    WebhookActionResult,
} from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { MidtransClient } from "./client"
import { MidtransOptions, MidtransNotification } from "./types"

type InjectedDependencies = {
    logger: any
}

export class MidtransPaymentProvider extends AbstractPaymentProvider<MidtransOptions> {
    static identifier = "midtrans"

    protected logger: any
    protected client: MidtransClient
    protected options_: MidtransOptions

    constructor(container: InjectedDependencies, options: MidtransOptions) {
        super(container, options)
        this.logger = container.logger
        this.options_ = options
        this.client = new MidtransClient(options)
    }

    static validateOptions(options: Record<any, any>): void | never {
        if (!options.serverKey) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Midtrans serverKey is required"
            )
        }
        if (!options.clientKey) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Midtrans clientKey is required"
            )
        }
    }

    /**
     * Initialize payment - Generate Snap token
     * 
     * IMPORTANT: Medusa passes session_id in input.data.session_id
     * We use this as our Midtrans order_id so webhook can return correct session_id
     */
    async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
        const { amount, currency_code, context, data } = input

        // Medusa passes the payment session ID in data.session_id
        // We use this as Midtrans order_id so webhook can match correctly
        const sessionId = (data as any)?.session_id as string

        // Use session_id as Midtrans order_id if available
        const orderId = sessionId || `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        // Build item details from context if available
        const extra = (context as any)?.extra || {}
        const itemDetails = extra.items?.map((item: any) => ({
            id: item.id || "item",
            price: Math.round(item.price || 0),
            quantity: item.quantity || 1,
            name: (item.name || "Product").substring(0, 50),
        })) || []

        // Add shipping as item if present
        if (extra.shipping_total > 0) {
            itemDetails.push({
                id: "SHIPPING",
                price: Math.round(extra.shipping_total),
                quantity: 1,
                name: "Ongkos Kirim",
            })
        }

        try {
            const snapResult = await this.client.createSnapTransaction({
                transaction_details: {
                    order_id: orderId,
                    gross_amount: Math.round(Number(amount)),
                },
                customer_details: context?.customer ? {
                    first_name: (context.customer as any).first_name || "Customer",
                    last_name: (context.customer as any).last_name || "",
                    email: (context.customer as any).email || "",
                    phone: (context.customer as any).phone || "",
                } : undefined,
                item_details: itemDetails.length > 0 ? itemDetails : undefined,
                callbacks: extra.finish_url ? {
                    finish: extra.finish_url as string,
                } : undefined,
            })

            this.logger?.info("Midtrans payment initiated", {
                session_id: sessionId,
                midtrans_order_id: orderId,
                amount,
                currency_code,
            })

            return {
                id: orderId,
                data: {
                    midtrans_order_id: orderId,
                    medusa_session_id: sessionId,
                    token: snapResult.token,
                    redirect_url: snapResult.redirect_url,
                    amount: Number(amount),
                    currency_code,
                    status: "pending",
                },
            }
        } catch (error: any) {
            this.logger?.error("Failed to initiate Midtrans payment", { error: error.message })
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                `Failed to initiate Midtrans payment: ${error.message}`
            )
        }
    }

    /**
     * Authorize payment - Verify payment was successful
     * Note: If payment was confirmed via webhook, we skip the API call
     */
    async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string
        const existingStatus = input.data?.transaction_status as string

        // If session already has transaction_status from webhook, handle accordingly
        if (existingStatus === "settlement" || existingStatus === "capture") {
            this.logger?.info("Payment already authorized via webhook", {
                order_id: midtransOrderId,
                status: existingStatus,
            })
            return {
                status: "authorized" as PaymentSessionStatus,
                data: {
                    ...input.data,
                    authorized_at: new Date().toISOString(),
                    authorized_via: "webhook",
                },
            }
        }

        // For pending payments (Bank Transfer, etc.), return pending status
        // Order will be created when settlement webhook arrives
        if (existingStatus === "pending" || existingStatus === "authorize") {
            this.logger?.info("Payment pending, waiting for settlement", {
                order_id: midtransOrderId,
                status: existingStatus,
            })
            return {
                status: "pending" as PaymentSessionStatus,
                data: {
                    ...input.data,
                    pending_reason: "Menunggu pembayaran diselesaikan",
                },
            }
        }

        if (!midtransOrderId) {
            // If no order ID, assume authorization will come via webhook
            return {
                status: "pending" as PaymentSessionStatus,
                data: input.data,
            }
        }

        try {
            const status = await this.client.getTransactionStatus(midtransOrderId)
            const parsed = this.client.parseTransactionStatus(status.transaction_status)

            if (parsed.isPaid) {
                this.logger?.info("Midtrans payment authorized", {
                    order_id: midtransOrderId,
                    status: status.transaction_status,
                })

                return {
                    status: "authorized" as PaymentSessionStatus,
                    data: {
                        ...input.data,
                        transaction_id: status.transaction_id,
                        transaction_status: status.transaction_status,
                        payment_type: status.payment_type,
                        authorized_at: new Date().toISOString(),
                    },
                }
            } else if (parsed.isPending) {
                return {
                    status: "pending" as PaymentSessionStatus,
                    data: input.data,
                }
            } else {
                return {
                    status: "error" as PaymentSessionStatus,
                    data: {
                        ...input.data,
                        error: `Payment failed with status: ${status.transaction_status}`,
                    },
                }
            }
        } catch (error: any) {
            this.logger?.error("Failed to authorize Midtrans payment", { error: error.message })
            return {
                status: "error" as PaymentSessionStatus,
                data: {
                    ...input.data,
                    error: error.message,
                },
            }
        }
    }

    /**
     * Capture payment - For bank transfer, payment is auto-captured on settlement
     */
    async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
        // For Midtrans bank transfer, payment is already captured when settled
        // Just return the existing data with capture timestamp
        return {
            data: {
                ...input.data,
                captured_at: new Date().toISOString(),
            },
        }
    }

    /**
     * Cancel payment - COMPENSATION FUNCTION
     * Called when order creation fails after payment is authorized
     */
    async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string

        if (!midtransOrderId) {
            this.logger?.warn("Cannot cancel payment: no midtrans_order_id")
            return { data: input.data }
        }

        try {
            // Determine what action to take based on current status
            const action = await this.client.getCompensationAction(midtransOrderId)

            if (action === "cancel") {
                // Transaction is still pending - can cancel
                const result = await this.client.cancelTransaction(midtransOrderId)
                this.logger?.info("Midtrans payment cancelled", {
                    order_id: midtransOrderId,
                    result: result.status_message,
                })

                return {
                    data: {
                        ...input.data,
                        cancelled_at: new Date().toISOString(),
                        cancel_result: result,
                    },
                }
            } else if (action === "refund") {
                // Transaction is settled - must refund
                const amount = Number(input.data?.amount || 0)
                const result = await this.client.refundTransaction(
                    midtransOrderId,
                    amount,
                    "Order creation failed - automatic refund"
                )

                this.logger?.info("Midtrans payment refunded (compensation)", {
                    order_id: midtransOrderId,
                    amount,
                    result: result.status_message,
                })

                return {
                    data: {
                        ...input.data,
                        refunded_at: new Date().toISOString(),
                        refund_result: result,
                    },
                }
            } else {
                this.logger?.info("No compensation needed for payment", {
                    order_id: midtransOrderId,
                })
                return { data: input.data }
            }
        } catch (error: any) {
            this.logger?.error("Failed to cancel/refund Midtrans payment", {
                order_id: midtransOrderId,
                error: error.message,
            })

            // Still return success to not block the workflow
            // Admin will need to handle manually
            return {
                data: {
                    ...input.data,
                    cancel_error: error.message,
                    requires_manual_refund: true,
                },
            }
        }
    }

    /**
     * Delete payment session - Expire pending transaction
     */
    async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string

        if (midtransOrderId) {
            try {
                await this.client.expireTransaction(midtransOrderId)
                this.logger?.info("Midtrans payment session expired", {
                    order_id: midtransOrderId,
                })
            } catch (error: any) {
                // Ignore errors - session might already be completed/expired
                this.logger?.warn("Failed to expire Midtrans session", {
                    order_id: midtransOrderId,
                    error: error.message,
                })
            }
        }

        return { data: input.data }
    }

    /**
     * Refund payment - Manual refund from admin
     */
    async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string
        const amount = Number(input.amount)

        if (!midtransOrderId) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Cannot refund: no midtrans_order_id"
            )
        }

        try {
            const result = await this.client.refundTransaction(
                midtransOrderId,
                amount,
                "Manual refund from admin"
            )

            this.logger?.info("Midtrans payment refunded", {
                order_id: midtransOrderId,
                amount,
                refund_id: result.refund_chargeback_id,
            })

            return {
                data: {
                    ...input.data,
                    refunded_at: new Date().toISOString(),
                    refund_amount: amount,
                    refund_result: result,
                },
            }
        } catch (error: any) {
            this.logger?.error("Failed to refund Midtrans payment", {
                order_id: midtransOrderId,
                error: error.message,
            })
            throw new MedusaError(
                MedusaError.Types.UNEXPECTED_STATE,
                `Refund failed: ${error.message}`
            )
        }
    }

    /**
     * Get payment status from Midtrans
     */
    async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string

        if (!midtransOrderId) {
            return { status: "pending" as PaymentSessionStatus }
        }

        try {
            const status = await this.client.getTransactionStatus(midtransOrderId)
            const parsed = this.client.parseTransactionStatus(status.transaction_status)

            let paymentStatus: PaymentSessionStatus = "pending"
            if (parsed.isPaid) {
                paymentStatus = "authorized"
            } else if (parsed.isFailed || parsed.isCancelled) {
                paymentStatus = "error"
            } else if (parsed.isRefunded) {
                paymentStatus = "canceled"
            }

            return {
                status: paymentStatus,
                data: status,
            }
        } catch (error: any) {
            return {
                status: "error" as PaymentSessionStatus,
                data: { error: error.message },
            }
        }
    }

    /**
     * Retrieve payment data from Midtrans
     */
    async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
        const midtransOrderId = input.data?.midtrans_order_id as string

        if (!midtransOrderId) {
            return { data: input.data }
        }

        try {
            const status = await this.client.getTransactionStatus(midtransOrderId)
            return { data: status }
        } catch (error: any) {
            return { data: input.data }
        }
    }

    /**
     * Update payment - Not commonly used for Midtrans
     */
    async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
        // Midtrans doesn't support updating transactions after creation
        // Just return the existing data
        return { data: input.data }
    }

    /**
     * Handle webhook from Midtrans
     * This is the key method for payment authorization via webhook
     */
    async getWebhookActionAndData(
        payload: ProviderWebhookPayload["payload"]
    ): Promise<WebhookActionResult> {
        const notification = payload.data as unknown as MidtransNotification

        this.logger?.info("Midtrans webhook received", {
            order_id: notification.order_id,
            transaction_status: notification.transaction_status,
            payment_type: notification.payment_type,
        })

        // Verify signature
        if (!this.client.verifySignature(notification)) {
            this.logger?.warn("Midtrans webhook: invalid signature", {
                order_id: notification.order_id,
            })
            return {
                action: "failed",
                data: {
                    session_id: notification.order_id,
                    amount: new BigNumber(0),
                },
            }
        }

        const amount = new BigNumber(parseFloat(notification.gross_amount))

        switch (notification.transaction_status) {
            case "capture":
            case "settlement":
                this.logger?.info("Midtrans payment authorized via webhook", {
                    order_id: notification.order_id,
                    amount: notification.gross_amount,
                })
                return {
                    action: "authorized",
                    data: {
                        session_id: notification.order_id,
                        amount,
                    },
                }

            case "pending":
            case "authorize":
                // For pending payments (Bank Transfer etc.), don't trigger any workflow
                // Order will be created when settlement webhook arrives
                this.logger?.info("Midtrans payment pending, waiting for settlement", {
                    order_id: notification.order_id,
                    status: notification.transaction_status,
                })
                return {
                    action: "not_supported",
                    data: {
                        session_id: notification.order_id,
                        amount,
                    },
                }

            case "deny":
            case "cancel":
            case "expire":
                return {
                    action: "failed",
                    data: {
                        session_id: notification.order_id,
                        amount,
                    },
                }

            case "refund":
            case "partial_refund":
                return {
                    action: "not_supported",
                    data: {
                        session_id: notification.order_id,
                        amount,
                    },
                }

            default:
                return {
                    action: "not_supported",
                    data: {
                        session_id: notification.order_id,
                        amount,
                    },
                }
        }
    }
}
