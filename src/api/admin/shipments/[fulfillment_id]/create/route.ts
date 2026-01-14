import { createShipmentWorkflow } from "@medusajs/core-flows"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

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
  service?: string
  weight?: number
  destination_city_id?: string
  shipper?: ShipperInfo
  payload?: Record<string, unknown>
  payload_format?: "json" | "form"
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { fulfillment_id } = req.params
  const body = (req.body ?? {}) as CreateShipmentRequest

  if (!body.order_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "order_id is required")
  }

  const fulfillmentModuleService = req.scope.resolve(Modules.FULFILLMENT)
  const orderModuleService = req.scope.resolve(Modules.ORDER)
  const rajaOngkirService = req.scope.resolve("rajaongkir")

  const fulfillment = await fulfillmentModuleService.retrieveFulfillment(fulfillment_id, {
    relations: ["labels", "shipping_option", "delivery_address"],
  })

  if (fulfillment.provider_id !== "rajaongkir") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Fulfillment provider is not RajaOngkir"
    )
  }

  const existingData = fulfillment.data || {}
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

  const service =
    body.service ||
    (existingData as any).service ||
    fulfillment.shipping_option?.data?.service ||
    shippingMethod?.data?.service

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
    body.weight ||
    (existingData as any).weight ||
    rajaOngkirService.calculateWeightFromItems(order.items || [])

  const defaultShipper = rajaOngkirService.getOriginDetails()
  const shipper = {
    ...defaultShipper,
    ...body.shipper,
  }

  if (!shipper.name || !shipper.phone || !shipper.address || !shipper.city_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "shipper name, phone, address, and city_id are required"
    )
  }

  const payload =
    body.payload || {
      order_id: order.id,
      origin: defaultShipper.city_id,
      destination: destinationCityId,
      weight,
      courier,
      service,
      shipper,
      receiver: {
        name: `${fulfillment.delivery_address?.first_name || ""} ${
          fulfillment.delivery_address?.last_name || ""
        }`.trim(),
        phone: fulfillment.delivery_address?.phone,
        address: fulfillment.delivery_address?.address_1,
        city_id: destinationCityId,
        postal_code: fulfillment.delivery_address?.postal_code,
      },
      items: (order.items || []).map((item: any) => ({
        name: item.title,
        qty: item.quantity,
      })),
    }

  const payloadFormat = body.payload_format || "json"
  const response = await rajaOngkirService.createDeliveryOrder(
    payload,
    payloadFormat
  )

  const ro = response.rajaongkir || response
  const orderResult = ro.order || ro.data || ro
  const externalShipmentId =
    orderResult.id ||
    orderResult.order_id ||
    ro.order_id ||
    orderResult.external_id ||
    orderResult.external_shipment_id

  if (!externalShipmentId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "RajaOngkir response missing external shipment id"
    )
  }

  const awb =
    orderResult.awb ||
    orderResult.waybill ||
    orderResult.tracking_number ||
    ro.awb

  const labelUrl = orderResult.label_url || orderResult.label?.url || ro.label_url
  const trackingUrl =
    orderResult.tracking_url || orderResult.tracking?.url || ro.tracking_url

  const updatedData = {
    ...(existingData as Record<string, unknown>),
    external_shipment_id: externalShipmentId,
    awb,
    label_url: labelUrl,
    tracking_url: trackingUrl,
    courier,
    service,
    weight,
    response_json: response,
  }

  const labels =
    awb || labelUrl || trackingUrl
      ? [
          {
            tracking_number: awb || externalShipmentId,
            tracking_url: trackingUrl || "",
            label_url: labelUrl || "",
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

  const updated = await fulfillmentModuleService.retrieveFulfillment(
    fulfillment_id,
    {
      relations: ["labels", "shipping_option", "delivery_address"],
    }
  )

  res.json({ fulfillment: updated })
}
