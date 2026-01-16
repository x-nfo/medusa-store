import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  when,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  MathBN,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"
import { acquireLockStep, releaseLockStep } from "@medusajs/core-flows"
import path from "path"


const RESERVATION_TTL_MS = 15 * 60 * 1000

// Bypass package export map to access core-flows utilities needed by the workflow.
// This keeps runtime compatible even though the package only exports the root entry.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const coreFlowsDir = path.dirname(require.resolve("@medusajs/core-flows"))
const resolveCoreFlows = (...segments: string[]) => path.join(coreFlowsDir, ...segments)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { completeCartFields } = require(resolveCoreFlows("cart/utils/fields"))
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prepareConfirmInventoryInput } = require(
  resolveCoreFlows("cart/utils/prepare-confirm-inventory-input")
)

type WorkflowInput = {
  cart_id: string
  idempotency_key: string
}

type SnapResponse = { token: string; redirect_url: string }

const loadCartStep = createStep(
  "load-cart-for-reservation",
  async (input: WorkflowInput, { container }) => {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
    const queryObject = remoteQueryObjectFromString({
      entryPoint: "cart",
      variables: { filters: { id: input.cart_id } },
      fields: completeCartFields,
    })

    const [cart] = await remoteQuery(queryObject)
    if (!cart) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Cart with id '${input.cart_id}' not found`
      )
    }

    return new StepResponse(cart)
  }
)

const checkExistingOrderStep = createStep(
  "check-existing-order",
  async (input: WorkflowInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: "order_cart",
      fields: ["order_id"],
      filters: { cart_id: input.cart_id },
    })

    return new StepResponse(data?.[0]?.order_id ?? null)
  }
)

const buildReservationsInputStep = createStep(
  "build-reservation-input",
  async (
    {
      cart,
      idempotency_key,
    }: { cart: any; idempotency_key: string },
    { container }
  ) => {
    const items =
      cart.items?.map((item: any) => ({
        id: item.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      })) ?? []

    const variants = (cart.items ?? []).map((item: any) => item.variant)

    const prepared = prepareConfirmInventoryInput({
      input: {
        sales_channel_id: cart.sales_channel_id,
        variants,
        items,
      },
    })

    const reservationItems = prepared.items.map((item: any) => {
      const locationId = (item.location_ids ?? [])[0]
      if (!locationId) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `No stock location available for variant ${item.variant_id}`
        )
      }

      return {
        line_item_id: item.id,
        inventory_item_id: item.inventory_item_id,
        location_id: locationId,
        quantity: MathBN.mult(item.required_quantity ?? 1, item.quantity ?? 1),
        allow_backorder: item.allow_backorder,
        description: "checkout:pending",
        metadata: {
          status: "pending",
          cart_id: cart.id,
          variant_id: item.variant_id,
          idempotency_key,
          expires_at: new Date(Date.now() + RESERVATION_TTL_MS).toISOString(),
        },
      }
    })

    return new StepResponse(reservationItems)
  }
)

const createReservationsStep = createStep(
  "create-reservations",
  async (
    {
      cart_id,
      idempotency_key,
      reservations,
    }: { cart_id: string; idempotency_key: string; reservations: any[] },
    { container }
  ) => {
    const inventoryService = container.resolve(Modules.INVENTORY)
    const locking = container.resolve(Modules.LOCKING)

    const lineItemIds = reservations.map((r) => r.line_item_id)
    const existing = await inventoryService.listReservationItems({
      line_item_id: lineItemIds,
    })

    const reuse = existing.filter((r: any) => {
      const metadata = r.metadata ?? {}
      return (
        metadata.cart_id === cart_id &&
        metadata.idempotency_key === idempotency_key &&
        metadata.status === "pending"
      )
    })

    if (reuse.length === reservations.length) {
      return new StepResponse(reuse, {
        reservation_ids: reuse.map((r) => r.id),
        inventory_item_ids: reuse.map((r) => r.inventory_item_id),
      })
    }

    const lockingKeys = Array.from(
      new Set(reservations.map((r) => r.inventory_item_id))
    )

    try {
      const created = await locking.execute(lockingKeys, async () => {
        return inventoryService.createReservationItems(reservations)
      })

      return new StepResponse(created, {
        reservation_ids: created.map((r) => r.id),
        inventory_item_ids: lockingKeys,
      })
    } catch (err: any) {
      const isInventoryError =
        err?.code === MedusaError.Codes.INSUFFICIENT_INVENTORY ||
        err?.type === MedusaError.Types.CONFLICT

      if (isInventoryError) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "OUT_OF_STOCK",
          "OUT_OF_STOCK"
        )
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "RESERVATION_FAILED"
      )
    }
  },
  async (data, { container }) => {
    if (!data?.reservation_ids?.length) {
      return
    }

    const inventoryService = container.resolve(Modules.INVENTORY)
    const locking = container.resolve(Modules.LOCKING)
    const lockingKeys = Array.from(new Set(data.inventory_item_ids ?? []))

    await locking.execute(lockingKeys, async () => {
      await inventoryService.deleteReservationItems(data.reservation_ids)
    })

    return new StepResponse()
  }
)



export const completeOrderWithReservationWorkflowId =
  "complete-order-with-reservation"

export const completeOrderWithReservation = createWorkflow(
  completeOrderWithReservationWorkflowId,
  (input: WorkflowInput) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 30,
      ttl: 120,
    })

    const existingOrder = checkExistingOrderStep(input)
    const cart = loadCartStep(input)
    const createdReservations = when(
      "reserve-when-order-missing",
      { existingOrder },
      ({ existingOrder }) => !existingOrder
    ).then(() => {
      const reservationsInput = buildReservationsInputStep({
        cart,
        idempotency_key: input.idempotency_key,
      })

      return createReservationsStep({
        cart_id: input.cart_id,
        idempotency_key: input.idempotency_key,
        reservations: reservationsInput,
      })
    })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse({
      cart_id: input.cart_id,
      order_id: existingOrder,
      reservations: createdReservations,

    })
  }
)

export default completeOrderWithReservation
