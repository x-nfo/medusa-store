import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createPaymentCollectionForCartWorkflow } from "@medusajs/core-flows"
import { MidtransPaymentService } from "../../../../../modules/payment-midtrans/service"

const PROVIDER_ID = "pp_midtrans"

type SnapRequest = {
  cart_id?: string
  finish_url?: string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id, finish_url } = (req.body ?? {}) as SnapRequest

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const paymentModuleService = req.scope.resolve(Modules.PAYMENT)
  const cartModuleService = req.scope.resolve(Modules.CART)

  // Use service directly instead of resolving from container
  const provider = new MidtransPaymentService({}, {
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  })

  const { data: cartPayments } = await query.graph({
    entity: "cart_payment_collection",
    fields: ["payment_collection_id"],
    filters: { cart_id },
  })

  let paymentCollectionId = cartPayments?.[0]?.payment_collection_id

  // If payment collection doesn't exist, create it using Medusa workflow
  if (!paymentCollectionId) {
    try {
      const { result } = await createPaymentCollectionForCartWorkflow(req.scope).run({
        input: { cart_id },
      })

      paymentCollectionId = result?.id

      if (!paymentCollectionId) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Failed to create payment collection for cart"
        )
      }
    } catch (error: any) {
      console.error("Error creating payment collection:", error)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment collection creation failed: ${error.message || error}`
      )
    }
  }

  const { data: collections } = await query.graph({
    entity: "payment_collection",
    fields: ["id", "amount", "currency_code"],
    filters: { id: paymentCollectionId },
  })

  const paymentCollection = collections?.[0]
  if (!paymentCollection) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "payment collection not found"
    )
  }

  // Validate amount is greater than 0
  const amount = Number(paymentCollection.amount) || 0
  if (amount <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Cart is empty or has no valid total. Please add items to your cart before proceeding to payment."
    )
  }

  const { data: sessions } = await query.graph({
    entity: "payment_session",
    fields: ["id", "amount", "currency_code", "data", "provider_id"],
    filters: {
      payment_collection_id: paymentCollectionId,
      provider_id: PROVIDER_ID,
    },
  })

  let session = sessions?.[0]
  if (!session) {
    session = await paymentModuleService.createPaymentSession(
      paymentCollectionId,
      {
        provider_id: PROVIDER_ID,
        amount: paymentCollection.amount,
        currency_code: paymentCollection.currency_code,
        data: {},
      }
    )
  }

  const existingToken = (session.data as Record<string, unknown> | null)
    ?.midtrans_token as string | undefined
  const existingRedirect = (session.data as Record<string, unknown> | null)
    ?.midtrans_redirect_url as string | undefined

  if (existingToken && existingRedirect) {
    return res.json({ token: existingToken, redirect_url: existingRedirect })
  }

  // Use Query Graph API for Medusa v2 - safer than direct relations
  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "email",
      "items.*",
      "items.variant.*",
      "shipping_address.*",
      "shipping_methods.*",
    ],
    filters: { id: cart_id },
  })

  const cart = carts?.[0]
  if (!cart) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Cart not found")
  }

  // Extract customer name from shipping_address or email
  const customerName =
    [cart.shipping_address?.first_name, cart.shipping_address?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || cart.email || undefined

  // Construct items array including products and shipping
  const items = [
    ...(cart.items ?? []).map((item: any, idx: number) => ({
      id: item.variant?.sku || item.id,
      name: item.title || item.variant?.title || `Item ${idx + 1}`,
      price: Math.round(Number(item.unit_price ?? 0)),
      quantity: Number(item.quantity ?? 1),
    })),
    ...(cart.shipping_methods ?? []).map((method: any) => ({
      id: method.id,
      name: method.name || "Shipping Cost",
      price: Math.round(Number(method.amount ?? 0)),
      quantity: 1,
    })),
  ]

  // Calculate total items calculation to check for differences (tax, rounding, etc)
  const itemsTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const grossAmount = Math.round(Number(session.amount))

  if (itemsTotal !== grossAmount) {
    const diff = grossAmount - itemsTotal
    items.push({
      id: "adjustment",
      name: "Tax / Adjustment",
      price: diff,
      quantity: 1
    })
  }

  const snap = await provider.createSnapSession({
    order_id: session.id,
    gross_amount: grossAmount,
    customer: {
      name: customerName,
      email: cart.email ?? undefined,
      phone: cart.shipping_address?.phone ?? undefined,
    },
    items: items,
    finish_url,
  })

  const updatedData = {
    ...(session.data ?? {}),
    midtrans_order_id: session.id,
    midtrans_token: snap.token,
    midtrans_redirect_url: snap.redirect_url,
  }

  await paymentModuleService.updatePaymentSession({
    id: session.id,
    amount: session.amount,
    currency_code: session.currency_code,
    data: updatedData,
  })

  res.json({ token: snap.token, redirect_url: snap.redirect_url })
}
