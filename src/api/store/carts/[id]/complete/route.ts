import { prepareRetrieveQuery } from "@medusajs/framework"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { refetchCart } from "@medusajs/medusa/dist/api/store/carts/helpers"
import { defaultStoreCartFields } from "@medusajs/medusa/dist/api/store/carts/query-config"
import { completeOrderWithReservationWorkflowId } from "../../../../../workflows/complete-order-with-reservation"

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
      input: { id: cartId },
      throwOnError: false,
    }
  )

  if (!transaction.hasFinished()) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Cart is already being completed by another request"
    )
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

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

  const { data } = await query.graph({
    entity: "order",
    fields: req.queryConfig.fields,
    filters: { id: result.id },
  })

  res.status(200).json({
    type: "order",
    order: data[0],
  })
}
