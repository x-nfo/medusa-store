import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "../../../../modules/fulfillment-rajaongkir"

type ShippingQuoteRequest = {
  origin?: string
  origin_city_id?: string
  destination?: string
  destination_city_id?: string
  weight?: number
  weight_grams?: number
  courier?: string
  couriers?: string[] | string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const {
    origin,
    origin_city_id,
    destination,
    destination_city_id,
    weight,
    weight_grams,
    courier,
    couriers,
  } = (req.body ?? {}) as ShippingQuoteRequest

  const destinationCityId = destination ?? destination_city_id
  const originCityId = origin ?? origin_city_id
  const weightValue =
    weight_grams !== undefined && weight_grams !== null ? weight_grams : weight
  const parsedWeight = Number(weightValue)

  if (!destinationCityId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "destination_city_id is required"
    )
  }

  if (!parsedWeight || parsedWeight <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "weight_grams must be greater than 0"
    )
  }

  const couriersValue = couriers ?? courier
  const courierList = Array.isArray(couriersValue)
    ? couriersValue
    : couriersValue
      ? String(couriersValue)
        .split(":")
        .map((value) => value.trim())
        .filter(Boolean)
      : []

  if (!courierList.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "couriers is required")
  }

  const service = new RajaOngkirFulfillmentService({}, {})
  const options = await service.quoteRates({
    origin_city_id: originCityId,
    destination_city_id: destinationCityId,
    weight_grams: parsedWeight,
    couriers: courierList,
  })

  /* 
   * FIX: Fetch the actual Medusa Shipping Option ID for RajaOngkir.
   * The storefront needs this ID to call /carts/{id}/shipping-methods.
   */
  /* 
   * FIX: Fetch the actual Medusa Shipping Option ID for RajaOngkir.
   * The storefront needs this ID to call /carts/{id}/shipping-methods.
   * provider_id is typically "rajaongkir_rajaongkir" (ModuleProviderId_ProviderId).
   */
  const fulfillmentModule = req.scope.resolve("fulfillment")

  // Try finding by specific provider ID first
  let shippingOptions = await fulfillmentModule.listShippingOptions({
    provider_id: "rajaongkir_rajaongkir"
  }, {
    take: 1
  })

  // Fallback: search loosely if exact match fails
  if (!shippingOptions.length) {
    const allOptions = await fulfillmentModule.listShippingOptions({
      // @ts-ignore
      provider_id: ["rajaongkir", "rajaongkir_rajaongkir"]
    }, {
      take: 5
    })
    shippingOptions = allOptions.filter(opt => opt.provider_id.includes("rajaongkir"))
  }

  const shippingOptionId = shippingOptions[0]?.id

  if (!shippingOptionId) {
    console.warn("WARNING: No Shipping Option found for provider 'rajaongkir_rajaongkir'. Please create one in Admin.")
    // Debug log to see what options exist if any
    const debugOpts = await fulfillmentModule.listShippingOptions({}, { take: 5, select: ["id", "provider_id", "name"] })
    console.warn("Available options:", JSON.stringify(debugOpts))
  }

  const optionsWithId = options.map(opt => ({
    ...opt,
    id: shippingOptionId,
    name: `${opt.courier.toUpperCase()} - ${opt.service}`,
    amount: opt.price
  }))

  res.json({
    options: optionsWithId,
  })
}
