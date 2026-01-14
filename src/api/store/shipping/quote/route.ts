import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"

type ShippingQuoteRequest = {
  cart_id?: string
  destination?: {
    city_id?: string
  }
  couriers?: string[] | string
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id, destination, couriers } = (req.body ?? {}) as ShippingQuoteRequest

  if (!cart_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cart_id is required")
  }

  const destinationCityId = destination?.city_id
  if (!destinationCityId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "destination.city_id is required"
    )
  }

  const cartModuleService = req.scope.resolve(Modules.CART)
  const cart = await cartModuleService.retrieveCart(cart_id, {
    relations: ["items", "items.variant"],
  })

  const rajaOngkirService = req.scope.resolve("rajaongkir")
  const weight = rajaOngkirService.calculateWeightFromItems(cart.items || [])
  const courierList = Array.isArray(couriers)
    ? couriers
    : couriers
      ? [couriers]
      : []

  if (!courierList.length) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "couriers is required")
  }

  const quotes = await rajaOngkirService.quoteShippingOptions({
    destinationCityId,
    weight,
    couriers: courierList,
  })

  res.json({
    weight,
    quotes,
  })
}
