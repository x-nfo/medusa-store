import { processPaymentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"

const PROVIDER_ID = "pp_midtrans"

const isDuplicateStatus = (
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>
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
    const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
    const provider = req.scope.resolve(PROVIDER_ID)

    const { payment_session_id } = (req.body ?? {}) as {
        payment_session_id?: string
    }

    if (!payment_session_id) {
        return res.status(400).json({ error: "payment_session_id is required" })
    }

    const session = await paymentModuleService.retrievePaymentSession(payment_session_id)

    if (session.provider_id !== PROVIDER_ID) {
        return res.status(400).json({ error: "payment session is not Midtrans" })
    }

    const status = await provider.getPaymentStatus({
        data: session.data,
        context: session.context ?? {},
    })

    const statusData = (status.data ?? {}) as Record<string, unknown>
    const updatedData = {
        ...(session.data ?? {}),
        ...statusData,
    }

    if (isDuplicateStatus(session.data ?? {}, updatedData)) {
        return res.json({ status: "OK" })
    }

    const action =
        status.status === PaymentSessionStatus.CAPTURED
            ? PaymentActions.SUCCESSFUL
            : status.status === PaymentSessionStatus.PENDING
              ? PaymentActions.PENDING
              : status.status === PaymentSessionStatus.REQUIRES_MORE
                ? PaymentActions.REQUIRES_MORE
                : status.status === PaymentSessionStatus.ERROR ||
                    status.status === PaymentSessionStatus.CANCELED
                  ? PaymentActions.FAILED
                  : PaymentActions.NOT_SUPPORTED

    if (action === PaymentActions.PENDING) {
        await paymentModuleService.updatePaymentSession({
            id: session.id,
            amount: session.amount,
            currency_code: session.currency_code,
            data: updatedData,
            status: PaymentSessionStatus.PENDING,
        })
        return res.json({ status: "OK" })
    }

    if (action === PaymentActions.FAILED || action === PaymentActions.REQUIRES_MORE) {
        await paymentModuleService.updatePaymentSession({
            id: session.id,
            amount: session.amount,
            currency_code: session.currency_code,
            data: updatedData,
            status: PaymentSessionStatus.ERROR,
        })
        return res.json({ status: "OK" })
    }

    if (action === PaymentActions.NOT_SUPPORTED) {
        return res.json({ status: "OK" })
    }

    await paymentModuleService.updatePaymentSession({
        id: session.id,
        amount: session.amount,
        currency_code: session.currency_code,
        data: updatedData,
    })

    await processPaymentWorkflow(req.scope).run({
        input: {
            action,
            data: {
                session_id: session.id,
                amount: session.amount,
            },
        },
    })

    return res.json({ status: "OK" })
}
