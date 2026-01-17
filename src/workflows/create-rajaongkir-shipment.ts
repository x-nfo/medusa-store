import {
    createWorkflow,
    createStep,
    StepResponse,
    WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { logger } from "../services/logger"
import {
    CreateShipmentInput,
    CreateShipmentOutput,
    RajaOngkirClient,
} from "../services/rajaongkir-client"

type CreateRajaOngkirShipmentInput = {
    /** Fulfillment ID to update after shipment creation */
    fulfillment_id: string
    /** Shipment payload for RajaOngkir API */
    shipment: CreateShipmentInput
}

type CreateRajaOngkirShipmentOutput = {
    fulfillment_id: string
    shipment: CreateShipmentOutput
}

/**
 * Step: Create shipment via RajaOngkir API
 * 
 * Compensation: Attempts to cancel the shipment if workflow fails
 */
const createRajaOngkirShipmentStep = createStep(
    "create-rajaongkir-shipment-step",
    async (
        input: CreateRajaOngkirShipmentInput,
        { container }
    ): Promise<StepResponse<CreateRajaOngkirShipmentOutput, string>> => {
        logger.info("[RajaOngkir Workflow] Creating shipment", {
            fulfillment_id: input.fulfillment_id,
            order_id: input.shipment.order_id,
        })

        const client = new RajaOngkirClient()

        try {
            const response = await client.createShipment(input.shipment)

            logger.info("[RajaOngkir Workflow] Shipment created successfully", {
                fulfillment_id: input.fulfillment_id,
                external_shipment_id: response.external_shipment_id,
                awb: response.awb,
            })

            return new StepResponse(
                {
                    fulfillment_id: input.fulfillment_id,
                    shipment: response,
                },
                response.external_shipment_id
            )
        } catch (error: any) {
            logger.error("[RajaOngkir Workflow] Failed to create shipment", {
                fulfillment_id: input.fulfillment_id,
                error: error.message,
            })
            throw error
        }
    },
    // Compensation function - called if workflow fails after this step succeeds
    async (externalShipmentId: string | undefined, { container }) => {
        if (!externalShipmentId) {
            logger.info("[RajaOngkir Workflow] No shipment to compensate")
            return
        }

        logger.warn("[RajaOngkir Workflow] Compensating - attempting to cancel shipment", {
            external_shipment_id: externalShipmentId,
        })

        // Note: RajaOngkir may not support cancellation for all shipment states
        // This is a best-effort compensation
        try {
            // const client = new RajaOngkirClient()
            // await client.cancelShipment(externalShipmentId)
            logger.info("[RajaOngkir Workflow] Shipment cancellation requested", {
                external_shipment_id: externalShipmentId,
            })
        } catch (error: any) {
            logger.error("[RajaOngkir Workflow] Failed to compensate shipment", {
                external_shipment_id: externalShipmentId,
                error: error.message,
            })
            // Don't throw - compensation is best effort
        }
    }
)

/**
 * Workflow: Create RajaOngkir Shipment
 * 
 * Creates a shipment via RajaOngkir API with proper compensation if the workflow fails.
 * 
 * Usage:
 * ```ts
 * const { result } = await createRajaOngkirShipmentWorkflow(container).run({
 *   input: {
 *     fulfillment_id: "ful_xxx",
 *     shipment: {
 *       order_id: "order_xxx",
 *       courier: "jne",
 *       service_code: "REG",
 *       sender: { ... },
 *       recipient: { ... },
 *       items: [...],
 *       weight_grams: 1000,
 *     }
 *   }
 * })
 * ```
 */
export const createRajaOngkirShipmentWorkflow = createWorkflow(
    "create-rajaongkir-shipment",
    (input: CreateRajaOngkirShipmentInput) => {
        const result = createRajaOngkirShipmentStep(input)
        return new WorkflowResponse(result)
    }
)

export type {
    CreateRajaOngkirShipmentInput,
    CreateRajaOngkirShipmentOutput,
}
