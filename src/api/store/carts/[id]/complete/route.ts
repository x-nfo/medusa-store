import { prepareRetrieveQuery } from "@medusajs/framework"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { completeOrderWithReservationWorkflowId } from "../../../../../workflows/complete-order-with-reservation"

const defaultStoreCartFields = [
  "id",
  "currency_code",
  "email",
  "region_id",
  "created_at",
  "updated_at",
  "completed_at",
  "total",
  "subtotal",
  "tax_total",
  "discount_total",
  "item_total",
  "item_subtotal",
  "shipping_total",
  "metadata",
  "items.id",
  "items.title",
  "items.quantity",
  "items.unit_price",
  "items.variant_id",
  "customer.id",
  "customer.email",
  "shipping_address.id",
  "shipping_address.metadata",
  "billing_address.id",
  "region.id",
  "region.currency_code",
  "*payment_collection",
  "*payment_collection.payment_sessions",
]

const refetchCart = async (
  id: string,
  scope: MedusaRequest["scope"],
  fields: string[]
) => {
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const queryObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id } },
    fields,
  })
  const [cart] = await remoteQuery(queryObject)
  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id '${id}' not found`
    )
  }
  return cart
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const idempotencyKey = Array.isArray(req.headers["idempotency-key"])
    ? req.headers["idempotency-key"][0]
    : req.headers["idempotency-key"]

  if (!idempotencyKey) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Idempotency-Key is required"
    )
  }

  const cartId = req.params.id
  const workflowEngine = req.scope.resolve(Modules.WORKFLOW_ENGINE)
  const { errors, result, transaction } = await workflowEngine.run(
    completeOrderWithReservationWorkflowId,
    {
      input: { cart_id: cartId, idempotency_key: idempotencyKey },
      throwOnError: false,
    }
  )

  if (!transaction.hasFinished()) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Cart is already being completed by another request"
    )
  }

  if (errors?.[0]) {
    const error = errors[0].error
    const statusOKErrors = [
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
    ]

    const cart = await refetchCart(
      cartId,
      req.scope,
      prepareRetrieveQuery(
        {},
        {
          defaults: defaultStoreCartFields,
        }
      ).remoteQueryConfig.fields
    )

    if (!statusOKErrors.includes(error?.type)) {
      throw error
    }

    res.status(200).json({
      type: "cart",
      cart,
      error: {
        message: error.message,
        name: error.name,
        type: error.type,
      },
    })
    return
  }

  res.status(200).json({
    type: "reservation",
    data: result,
  })
}
