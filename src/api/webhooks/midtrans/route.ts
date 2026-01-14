import { processPaymentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"

const PROVIDER_ID = "pp_midtrans"

const buildMidtransData = (payload: Record<string, unknown>) => ({
    midtrans_order_id: payload.order_id,
    transaction_id: payload.transaction_id,
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

    if (incoming.transaction_id && existing.transaction_id) {
        return (
            existing.transaction_id === incoming.transaction_id &&
            existing.midtrans_transaction_status === incoming.midtrans_transaction_status &&
            existing.midtrans_fraud_status === incoming.midtrans_fraud_status
        )
    }

    return false
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
    const logger = req.scope.resolve("logger")
    try {
        const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
        const payload = {
            provider: PROVIDER_ID,
            payload: {
                data: req.body as Record<string, unknown>,
                rawData: req.rawBody ?? JSON.stringify(req.body ?? {}),
                headers: req.headers as Record<string, unknown>,
            },
        }

        const actionAndData = await paymentModuleService.getWebhookActionAndData(payload)

        if (!actionAndData.data) {
            return res.json({ status: "OK" })
        }

        const sessionId = actionAndData.data.session_id
        const session = await paymentModuleService.retrievePaymentSession(sessionId)
        const payloadData = req.body as Record<string, unknown>
        const midtransData = buildMidtransData(payloadData)
        const updatedData = {
            ...(session.data ?? {}),
            ...midtransData,
        }

        if (isDuplicateWebhook(session.data ?? {}, midtransData)) {
            return res.json({ status: "OK" })
        }

        if (
            actionAndData.action === PaymentActions.FAILED ||
            actionAndData.action === PaymentActions.REQUIRES_MORE
        ) {
            await paymentModuleService.updatePaymentSession({
                id: sessionId,
                amount: session.amount,
                currency_code: session.currency_code,
                data: updatedData,
                status: PaymentSessionStatus.ERROR,
            })

            return res.json({ status: "OK" })
        }

        if (actionAndData.action === PaymentActions.PENDING) {
            await paymentModuleService.updatePaymentSession({
                id: sessionId,
                amount: session.amount,
                currency_code: session.currency_code,
                data: updatedData,
                status: PaymentSessionStatus.PENDING,
            })

            return res.json({ status: "OK" })
        }

        if (actionAndData.action === PaymentActions.NOT_SUPPORTED) {
            return res.json({ status: "OK" })
        }

        await paymentModuleService.updatePaymentSession({
            id: sessionId,
            amount: session.amount,
            currency_code: session.currency_code,
            data: updatedData,
        })

        await processPaymentWorkflow(req.scope).run({ input: actionAndData })

        res.json({ status: "OK" })
    } catch (err: any) {
        logger.error("Midtrans Webhook Error", err)
        res.status(400).json({ error: err.message })
    }
}
