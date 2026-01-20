import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { sendNotificationStep } from "./steps/send-notification"
import { transformOrderToEmailDataStep } from "./steps/transform-order-to-email-data"

type OrderPlacedWorkflowInput = {
    id: string
}

export const sendOrderConfirmationWorkflow = createWorkflow(
    "send-order-confirmation",
    (input: OrderPlacedWorkflowInput) => {
        const { data: orders } = useQueryGraphStep({
            entity: "order",
            fields: [
                "id",
                "email",
                "display_id",
                "currency_code",
                "total",
                "subtotal",
                "tax_total",
                "discount_total",
                "shipping_total",
                "created_at",
                "items.*",
                "shipping_address.*",
            ],
            filters: {
                id: input.id,
            },
        })

        const order = orders[0]

        const emailData = transformOrderToEmailDataStep(order)

        sendNotificationStep({
            to: order.email,
            channel: "email",
            template: "order-placed",
            data: emailData,
        })

        return new WorkflowResponse(order)
    }
)
