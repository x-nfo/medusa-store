export type MidtransOptions = {
    serverKey: string
    clientKey: string
    isProduction?: boolean
    merchantId?: string
}

export type MidtransTransactionDetails = {
    order_id: string
    gross_amount: number
}

export type MidtransCustomerDetails = {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
}

export type MidtransItemDetail = {
    id: string
    price: number
    quantity: number
    name: string
}

export type MidtransSnapParams = {
    transaction_details: MidtransTransactionDetails
    customer_details?: MidtransCustomerDetails
    item_details?: MidtransItemDetail[]
    callbacks?: {
        finish?: string
    }
}

export type MidtransSnapResult = {
    token: string
    redirect_url: string
}

export type MidtransTransactionStatus =
    | "capture"
    | "settlement"
    | "pending"
    | "deny"
    | "cancel"
    | "expire"
    | "refund"
    | "partial_refund"
    | "authorize"

export type MidtransNotification = {
    order_id: string
    transaction_id: string
    transaction_status: MidtransTransactionStatus
    status_code: string
    gross_amount: string
    payment_type: string
    signature_key: string
    fraud_status?: string
    status_message?: string
}

export type MidtransStatusResponse = {
    order_id: string
    transaction_id: string
    transaction_status: MidtransTransactionStatus
    status_code: string
    gross_amount: string
    payment_type: string
    fraud_status?: string
}

export type MidtransCancelResponse = {
    status_code: string
    status_message: string
    transaction_id: string
    order_id: string
    transaction_status: string
}

export type MidtransRefundResponse = {
    status_code: string
    status_message: string
    transaction_id: string
    order_id: string
    refund_chargeback_id: string
    refund_amount: string
    refund_key: string
}

export type MidtransExpireResponse = {
    status_code: string
    status_message: string
    transaction_id: string
    order_id: string
    transaction_status: string
}
