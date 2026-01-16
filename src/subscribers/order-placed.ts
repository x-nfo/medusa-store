import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { GmailNotificationService } from "../modules/notification-gmail"
import { OrderItem, ShippingAddress } from "../modules/notification-gmail/types"

type OrderPlacedEvent = {
  id: string
}

// Helper to convert BigNumber or any numeric type to number
const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return parseFloat(value) || 0
  // Handle Medusa BigNumber objects
  if (typeof value === "object" && value.numeric !== undefined) {
    return Number(value.numeric) || 0
  }
  if (typeof value === "object" && value.value !== undefined) {
    return Number(value.value) || 0
  }
  return Number(value) || 0
}

const formatCurrency = (amount: any, currency?: string) => {
  const value = toNumber(amount)
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: (currency || "IDR").toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatDate = (date?: string | Date) => {
  if (!date) return undefined
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date))
}

const getCustomerName = (order: any) =>
  order?.shipping_address?.first_name ||
  order?.billing_address?.first_name ||
  undefined

const formatOrderRef = (order: any) =>
  order?.display_id ? `#${order.display_id}` : order?.id

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<OrderPlacedEvent>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModuleService = container.resolve(Modules.ORDER)
  const gmailNotificationService = new GmailNotificationService()

  try {
    const order = await orderModuleService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address", "billing_address", "shipping_methods"],
    })

    // Calculate totals from items if order totals are not available
    const items = order.items || []
    const calculatedSubtotal = items.reduce((sum: number, item: any) => {
      return sum + (toNumber(item.unit_price) * toNumber(item.quantity))
    }, 0)

    // Get shipping total from shipping methods or order
    const shippingMethods = order.shipping_methods || []
    const calculatedShipping = shippingMethods.reduce((sum: number, method: any) => {
      return sum + toNumber(method.amount)
    }, 0)

    // Use order totals if available, otherwise use calculated
    const subtotal = toNumber(order.subtotal) || toNumber(order.item_subtotal) || calculatedSubtotal
    const shippingTotal = toNumber(order.shipping_total) || calculatedShipping
    const taxTotal = toNumber(order.tax_total) || 0
    const discountTotal = toNumber(order.discount_total) || 0
    const total = toNumber(order.total) || (subtotal + shippingTotal + taxTotal - discountTotal)

    logger.info("Order data for email", {
      id: order.id,
      email: order.email,
      rawTotal: order.total,
      calculatedSubtotal,
      calculatedShipping,
      finalTotal: total,
      itemsCount: items.length,
    })

    if (!order?.email) {
      logger.warn(`Order placed email skipped: missing email for order ${data.id}`)
      return
    }

    const currencyCode = order.currency_code || "IDR"
    const customerName = getCustomerName(order)
    const orderRef = formatOrderRef(order)

    // Format order items
    const formattedItems: OrderItem[] = items.map((item: any) => {
      const unitPrice = toNumber(item.unit_price)
      const quantity = toNumber(item.quantity) || 1
      return {
        title: item.title || item.product_title || "Produk",
        quantity,
        unit_price: formatCurrency(unitPrice, currencyCode),
        total: formatCurrency(unitPrice * quantity, currencyCode),
        thumbnail: item.thumbnail,
      }
    })

    // Format shipping address
    const addr = order.shipping_address
    const shippingAddress: ShippingAddress | undefined = addr ? {
      first_name: addr.first_name,
      last_name: addr.last_name,
      address_1: addr.address_1,
      city: addr.city,
      province: addr.province,
      postal_code: addr.postal_code,
      phone: addr.phone,
    } : undefined

    logger.info(`Order placed email queued for ${order.email} (order ${orderRef})`)

    await gmailNotificationService.sendOrderCreated(order.email, {
      order_id: orderRef,
      display_id: order.display_id?.toString(),
      total: formatCurrency(total, currencyCode),
      subtotal: formatCurrency(subtotal, currencyCode),
      shipping_total: formatCurrency(shippingTotal, currencyCode),
      tax_total: taxTotal > 0 ? formatCurrency(taxTotal, currencyCode) : undefined,
      discount_total: discountTotal > 0 ? formatCurrency(discountTotal, currencyCode) : undefined,
      customer_name: customerName,
      customer_email: order.email,
      items: formattedItems,
      shipping_address: shippingAddress,
      payment_method: "Midtrans",
      order_date: formatDate(order.created_at),
    })
  } catch (error: any) {
    logger.error("Failed to send order placed email", {
      message: error.message,
      stack: error.stack,
    })
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
