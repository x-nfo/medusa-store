import { RajaOngkirFulfillmentService } from "../../../modules/fulfillment-rajaongkir"
import { logger } from "../../../services/logger"

export default async function handler(req: any, res: any) {
  try {
    const { destination_city_id, weight_grams, couriers } = req.body || {}
    if (!destination_city_id || !weight_grams) {
      return res.status(400).json({ message: "destination_city_id and weight_grams are required" })
    }

    const service = new RajaOngkirFulfillmentService()
    const options = await service.quoteRates({
      destination_city_id,
      weight_grams,
      couriers: Array.isArray(couriers) && couriers.length ? couriers : ["jne"],
    })

    return res.json({ options })
  } catch (e: any) {
    logger.error("shipping quote error", e)
    return res.status(500).json({ message: e.message || "Internal error" })
  }
}
