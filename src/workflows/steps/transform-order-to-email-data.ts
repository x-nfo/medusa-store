import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const transformOrderToEmailDataStep = createStep(
    "transform-order-to-email-data",
    async (order: any) => {
        // Helper to format currency
        const formatMoney = (amount: any, currency: string) => {
            const value = Number(amount)
            return new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: currency.toUpperCase(),
                minimumFractionDigits: 0
            }).format(value)
        }

        if (!order) {
            throw new Error("Order not found in transformer step")
        }

        const emailData = {
            order_id: order.id,
            display_id: order.display_id,
            order_date: new Date(order.created_at).toLocaleDateString("id-ID", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            customer_email: order.email,
            customer_name: order.shipping_address?.first_name || "Customer",
            shipping_address: order.shipping_address,
            items: (order.items || []).map((item: any) => ({
                title: item.product_title || item.title,
                quantity: item.quantity,
                unit_price: formatMoney(item.unit_price, order.currency_code),
                total: formatMoney(item.unit_price * item.quantity, order.currency_code),
                thumbnail: item.thumbnail
            })),
            subtotal: formatMoney(order.subtotal, order.currency_code),
            shipping_total: formatMoney(order.shipping_total, order.currency_code),
            tax_total: formatMoney(order.tax_total, order.currency_code),
            discount_total: formatMoney(order.discount_total, order.currency_code),
            total: formatMoney(order.total, order.currency_code),
        }

        return new StepResponse(emailData)
    }
)
