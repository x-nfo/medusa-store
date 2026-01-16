import { processPaymentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { MidtransClient } from "../../../services/midtrans-client"
import { mapMidtransStatus } from "../../../modules/payment-midtrans/service"

const PROVIDER_ID = "pp_midtrans"

const buildMidtransData = (payload: Record<string, unknown>) => ({
    midtrans_order_id: payload.order_id,
    midtrans_transaction_id: payload.transaction_id,
    midtrans_transaction_status: payload.transaction_status,
    midtrans_fraud_status: payload.fraud_status,
    midtrans_status_code: payload.status_code,
    midtrans_status_message: payload.status_message,
    midtrans_transaction_time: payload.transaction_time,
    midtrans_signature_key: payload.signature_key,
})

const isDuplicateWebhook = (
    existing: Record<string, unknown>,
    incoming: ReturnType<typeof buildMidtransData>
) => {
    if (incoming.midtrans_signature_key && existing.midtrans_signature_key) {
        return (
            existing.midtrans_signature_key === incoming.midtrans_signature_key &&
            existing.midtrans_transaction_status === incoming.midtrans_transaction_status &&
            existing.midtrans_fraud_status === incoming.midtrans_fraud_status
        )
    }

    if (incoming.midtrans_transaction_id && existing.midtrans_transaction_id) {
        return (
            existing.midtrans_transaction_id === incoming.midtrans_transaction_id &&
            existing.midtrans_transaction_status === incoming.midtrans_transaction_status &&
            existing.midtrans_fraud_status === incoming.midtrans_fraud_status
        )
    }

    return false
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const logger = req.scope.resolve("logger")
    try {
        const verifier = new MidtransClient()
        const valid = verifier.verifyWebhookSignature(
            (req.body ?? {}) as Record<string, unknown>
        )
        if (!valid) {
            return res.status(401).json({ error: "Invalid Midtrans signature" })
        }

        const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
        const payloadData = req.body as Record<string, unknown>
        const sessionId = String(payloadData.order_id ?? "")
        if (!sessionId) {
            return res.json({ status: "OK" })
        }

        const session = await paymentModuleService.retrievePaymentSession(sessionId)
        if (session.provider_id !== PROVIDER_ID) {
            return res.json({ status: "OK" })
        }

        const midtransData = buildMidtransData(payloadData)
        const updatedData = {
            ...(session.data ?? {}),
            ...midtransData,
        }

        if (isDuplicateWebhook(session.data ?? {}, midtransData)) {
            return res.json({ status: "OK" })
        }

        const mapping = mapMidtransStatus(
            String(payloadData.transaction_status ?? ""),
            String(payloadData.fraud_status ?? "")
        )
        const action = mapping.action

        if (action === PaymentActions.FAILED || action === PaymentActions.REQUIRES_MORE) {
            await paymentModuleService.updatePaymentSession({
                id: sessionId,
                amount: session.amount,
                currency_code: session.currency_code,
                data: updatedData,
                status: PaymentSessionStatus.ERROR,
            })

            return res.json({ status: "OK" })
        }

        if (action === PaymentActions.PENDING) {
            await paymentModuleService.updatePaymentSession({
                id: sessionId,
                amount: session.amount,
                currency_code: session.currency_code,
                data: updatedData,
                status: PaymentSessionStatus.PENDING,
            })

            return res.json({ status: "OK" })
        }

        if (action === PaymentActions.NOT_SUPPORTED) {
            return res.json({ status: "OK" })
        }

        await paymentModuleService.updatePaymentSession({
            id: sessionId,
            amount: session.amount,
            currency_code: session.currency_code,
            data: updatedData,
            status: PaymentSessionStatus.CAPTURED,
        })

        await processPaymentWorkflow(req.scope).run({
            input: {
                action,
                data: {
                    session_id: sessionId,
                    amount: session.amount,
                },
            },
        })

        await paymentModuleService.updatePaymentSession({
            id: sessionId,
            amount: session.amount,
            currency_code: session.currency_code,
            data: updatedData,
            status: PaymentSessionStatus.CAPTURED,
        })

        res.json({ status: "OK" })
    } catch (err: any) {
        logger.error("Midtrans Webhook Error", err)
        res.status(400).json({ error: err.message })
    }
}
