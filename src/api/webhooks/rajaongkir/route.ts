import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IEventBusModuleService } from "@medusajs/framework/types"
import { RajaOngkirWebhookPayload, RajaOngkirWebhookResponse } from "./types"

/**
 * RajaOngkir Webhook Handler
 * 
 * Receives tracking status updates from RajaOngkir callback.
 * Updates fulfillment status and emits appropriate events.
 * 
 * Endpoint: POST /webhooks/rajaongkir
 */
export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse<RajaOngkirWebhookResponse>
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const eventBus: IEventBusModuleService = req.scope.resolve(Modules.EVENT_BUS)
  const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const payload = req.body as RajaOngkirWebhookPayload

  try {
    if (!payload) {
      logger.warn("[RajaOngkir Webhook] Received empty body")
      return res.status(400).json({
        received: false,
        error: "Request body is empty",
      })
    }

    logger.info(`[RajaOngkir Webhook] Received callback - AWB: ${payload.awb || payload.tracking_number}, Status: ${payload.status}, OrderID: ${payload.order_id}`)

    // Get AWB from payload
    const awb = payload.awb || payload.tracking_number
    if (!awb) {
      logger.warn("[RajaOngkir Webhook] Missing AWB/tracking_number")
      return res.status(400).json({
        received: false,
        error: "awb or tracking_number is required",
      })
    }

    // Find fulfillment by AWB using query graph
    // Fulfillment data is stored in the `data` field or `labels`
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "data",
        "labels",
        "shipped_at",
        "order.id",
        "order.email",
        "order.display_id",
      ],
      filters: {},
    })

    // Search for fulfillment with matching AWB
    const fulfillment = fulfillments?.find((f: any) => {
      // Check in data.awb
      if (f.data?.awb === awb) return true
      // Check in data.tracking_number
      if (f.data?.tracking_number === awb) return true
      // Check in labels
      if (f.labels?.some((label: any) => label.tracking_number === awb)) return true
      return false
    })

    if (!fulfillment) {
      logger.warn(`[RajaOngkir Webhook] Fulfillment not found for AWB: ${awb}`)
      return res.status(404).json({
        received: false,
        error: `Fulfillment not found for AWB: ${awb}`,
      })
    }

    logger.info(`[RajaOngkir Webhook] Found fulfillment ${fulfillment.id} for order ${fulfillment.order?.id}, status: ${payload.status}`)

    // Map RajaOngkir status to Medusa fulfillment actions
    const status = payload.status?.toUpperCase()

    // Update fulfillment data with latest status
    const updatedData = {
      ...(fulfillment.data as Record<string, unknown>),
      rajaongkir_status: payload.status,
      rajaongkir_status_description: payload.status_description,
      rajaongkir_last_update: payload.timestamp || new Date().toISOString(),
    }

    await fulfillmentModuleService.updateFulfillment(fulfillment.id, {
      data: updatedData,
    })

    // Emit events based on status
    if (status === "DELIVERED") {
      logger.info(`[RajaOngkir Webhook] Shipment delivered, emitting event for fulfillment ${fulfillment.id}`)

      await eventBus.emit({
        name: "delivery.created",
        data: {
          id: fulfillment.id,
          fulfillment_id: fulfillment.id,
          awb,
          status: payload.status,
          order_id: fulfillment.order?.id,
        },
      })
    } else if (status === "FAILED" || status === "RETURNED") {
      logger.warn(`[RajaOngkir Webhook] Shipment failed/returned for fulfillment ${fulfillment.id}, status: ${status}`)

      await eventBus.emit({
        name: "fulfillment.shipment_failed",
        data: {
          id: fulfillment.id,
          fulfillment_id: fulfillment.id,
          awb,
          status: payload.status,
          reason: payload.status_description,
        },
      })
    } else {
      // For other statuses (IN_TRANSIT, OUT_FOR_DELIVERY, etc.)
      await eventBus.emit({
        name: "fulfillment.updated",
        data: {
          id: fulfillment.id,
          fulfillment_id: fulfillment.id,
          awb,
          status: payload.status,
        },
      })
    }

    logger.info(`[RajaOngkir Webhook] Processed successfully for fulfillment ${fulfillment.id}, status: ${payload.status}`)

    return res.json({
      received: true,
      message: `Status updated for fulfillment ${fulfillment.id}`,
    })
  } catch (err: unknown) {
    const error = err as Error
    logger.error(`[RajaOngkir Webhook] Error: ${error.message}, AWB: ${payload?.awb}`)

    return res.status(500).json({
      received: false,
      error: error.message || "Internal server error",
    })
  }
}
