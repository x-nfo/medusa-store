import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "../../../../modules/fulfillment-rajaongkir"

type ShippingQuoteRequest = {
  origin?: string
  origin_city_id?: string
  destination?: string
  destination_city_id?: string
  destination_district_id?: string // Added for V2 support
  destination_subdistrict_id?: string // Added for V2 support (Kelurahan)
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
    destination_district_id,
    destination_subdistrict_id,
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

  // 1. Fetch Enabled Shipping Options from Medusa Admin
  const fulfillmentModule = req.scope.resolve("fulfillment")

  // Fetch all options for our provider
  // We grab a bit more to ensure we catch everything
  const allOptions = await fulfillmentModule.listShippingOptions({}, {
    take: 100
  })

  const rajaOngkirOptions = allOptions.filter((opt: any) =>
    opt.provider_id?.includes("rajaongkir") && !opt.is_return
  )

  // 2. Identify allowed Services and Couriers
  const validServiceIds = new Set<string>()
  const couriersToFetch = new Set<string>()

  // Map option ID (e.g. "jne-reg") to the Option Object ID (e.g. "so_123")
  const serviceIdToOptionIdMap = new Map<string, string>()
  const serviceIdToOptionNameMap = new Map<string, string>()

  if (rajaOngkirOptions.length > 0) {
    // Dynamic Mode: Use only configured options
    for (const opt of rajaOngkirOptions) {
      const serviceId = opt.data?.id as string
      // @ts-ignore - SERVICES is static but TS might complain about index signature
      if (serviceId && RajaOngkirFulfillmentService.SERVICES[serviceId]) {
        validServiceIds.add(serviceId)
        serviceIdToOptionIdMap.set(serviceId, opt.id)
        serviceIdToOptionNameMap.set(serviceId, opt.name)

        // Add courier to fetch list
        // @ts-ignore
        const conf = RajaOngkirFulfillmentService.SERVICES[serviceId]
        if (conf.courier) {
          conf.courier.split(":").forEach((c: string) => couriersToFetch.add(c))
        }
      }
    }
  } else {
    // Fallback if NO options configured
  }

  if (couriersToFetch.size === 0) {
    return res.json({ options: [] })
  }

  // 3. Call Service
  const service = new RajaOngkirFulfillmentService({}, {})
  const rawOptions = await service.quoteRates({
    origin_city_id: originCityId,
    destination_city_id: destinationCityId,
    destination_district_id: destination_district_id,
    destination_subdistrict_id: destination_subdistrict_id,
    weight_grams: parsedWeight,
    couriers: Array.from(couriersToFetch),
  })

  // 4. Filter and Map Results
  // We only return results that match an enabled Service ID
  const filteredOptions = rawOptions.flatMap(opt => {
    // Find matching definition
    // We need to look up which key in SERVICES matches this courier+service
    const matchEntry = Object.entries(RajaOngkirFulfillmentService.SERVICES).find(([key, val]) => {
      // Check courier match (case insensitive)
      const cMatch = val.courier.toLowerCase() === opt.courier.toLowerCase()
      // Check service match (val.service might be "REG", opt.service might be "REG" or "CTC")
      // Strict match for safety
      const sMatch = val.service.toLowerCase() === opt.service.toLowerCase()
      return cMatch && sMatch
    })

    if (!matchEntry) return []

    const [serviceId, config] = matchEntry

    // Check if this ID is enabled in Admin
    if (!validServiceIds.has(serviceId)) return []

    // It is enabled! Map it.
    return {
      ...opt,
      id: serviceIdToOptionIdMap.get(serviceId), // Use the actual Shipping Option ID from DB
      name: serviceIdToOptionNameMap.get(serviceId) || config.name, // Use Admin title if possible
      amount: opt.price
    }
  })

  res.json({
    options: filteredOptions,
  })
}
