import { createShipmentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "../../../../../modules/fulfillment-rajaongkir"
import { getOriginWithFallback } from "../../../../../services/stock-location-origin"

type ShipperInfo = {
  name?: string
  phone?: string
  address?: string
  city_id?: string
  postal_code?: string
}

type CreateShipmentRequest = {
  order_id?: string
  courier?: string
  service_code?: string
  weight_grams?: number
  destination_city_id?: string
  shipper?: ShipperInfo
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { fulfillment_id } = req.params
  const body = (req.body ?? {}) as CreateShipmentRequest

  if (!body.order_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "order_id is required")
  }

  const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT)
  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const roService = new RajaOngkirFulfillmentService({}, {})

  const fulfillment = await fulfillmentModuleService.retrieveFulfillment(
    fulfillment_id,
    {
      relations: ["labels", "shipping_option", "delivery_address"],
    }
  )

  const providerId = fulfillment.provider_id
  // Provider ID format: fp_{identifier}_{configId}
  if (!providerId?.includes("rajaongkir")) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Fulfillment provider is not RajaOngkir"
    )
  }

  const existingData = (fulfillment.data as Record<string, unknown>) || {}
  const existingExternalId =
    existingData.external_shipment_id || fulfillment.metadata?.external_shipment_id

  if (existingExternalId) {
    return res.json({ fulfillment })
  }

  const order = await orderModuleService.retrieveOrder(body.order_id, {
    relations: ["items", "shipping_address", "shipping_methods"],
  })

  const shippingMethod =
    order.shipping_methods?.find(
      (method: any) => method.shipping_option_id === fulfillment.shipping_option_id
    ) || order.shipping_methods?.[0]

  const courier =
    body.courier ||
    (existingData as any).courier ||
    fulfillment.shipping_option?.data?.courier ||
    shippingMethod?.data?.courier

  const service_code =
    body.service_code ||
    (existingData as any).service_code ||
    fulfillment.shipping_option?.data?.service_code ||
    shippingMethod?.data?.service_code

  if (!courier) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "courier is required")
  }

  const destinationCityId =
    body.destination_city_id ||
    fulfillment.delivery_address?.metadata?.city_id ||
    order.shipping_address?.metadata?.city_id

  if (!destinationCityId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "destination_city_id is required"
    )
  }

  const weight =
    body.weight_grams ||
    (existingData as any).weight_grams ||
    roService.calculateWeightFromItems(order.items || [])

  // Get origin from Stock Location (Medusa Admin) with fallback to env vars
  const stockLocationOrigin = await getOriginWithFallback(req.scope)
  const origin = {
    ...stockLocationOrigin,
    ...(body.shipper || {}),
  }

  if (!origin.name || !origin.phone || !origin.address || !origin.city_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Origin (store) name, phone, address, and city_id are required. " +
      "Please configure Stock Location in Medusa Admin (Settings > Locations & Shipping) " +
      "with rajaongkir_city_id and phone in metadata."
    )
  }

  const receiver = {
    name: `${fulfillment.delivery_address?.first_name || ""} ${fulfillment.delivery_address?.last_name || ""
      }`.trim(),
    phone: fulfillment.delivery_address?.phone,
    address: fulfillment.delivery_address?.address_1,
    city_id: destinationCityId,
    postal_code: fulfillment.delivery_address?.postal_code,
  }

  if (!receiver.name || !receiver.phone || !receiver.address) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Recipient name, phone, and address are required"
    )
  }

  const shipmentPayload = {
    order_id: order.id,
    courier,
    service_code,
    sender: origin,
    recipient: receiver,
    items: (order.items || []).map((item: any, idx: number) => ({
      name: item.title || `Item ${idx + 1}`,
      qty: item.quantity,
      price: Number(item.unit_price || 0),
    })),
    weight_grams: Number(weight || 0),
  }

  if (!shipmentPayload.weight_grams || shipmentPayload.weight_grams <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "weight_grams must be greater than 0"
    )
  }

  const response = await roService.createShipment(shipmentPayload)

  const updatedData = {
    ...(existingData as Record<string, unknown>),
    external_shipment_id: response.external_shipment_id,
    awb: response.awb,
    label_url: response.label_url,
    tracking_url: response.tracking_url,
    courier,
    service_code,
    weight_grams: shipmentPayload.weight_grams,
    response_json: response.raw_response ?? response,
  }

  const labels =
    response.awb || response.label_url || response.tracking_url
      ? [
        {
          tracking_number: response.awb || response.external_shipment_id,
          tracking_url: response.tracking_url || "",
          label_url: response.label_url || "",
        },
      ]
      : []

  await createShipmentWorkflow(req.scope).run({
    input: {
      id: fulfillment_id,
      labels,
      data: updatedData,
    },
  })

  // Emit shipment.created event for subscribers (email notifications)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS)
  await eventBus.emit({
    name: "shipment.created",
    data: {
      id: fulfillment_id,
      no_notification: false,
    },
  })

  const updated = await fulfillmentModuleService.retrieveFulfillment(
    fulfillment_id,
    {
      relations: ["labels", "shipping_option", "delivery_address"],
    }
  )

  res.json({ fulfillment: updated })
}
