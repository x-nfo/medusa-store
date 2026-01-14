import { RajaOngkirClient } from "../../services/rajaongkir-client"
import { logger } from "../../services/logger"

export class RajaOngkirFulfillmentService {
  static readonly identifier = "fp_rajaongkir"

  private client: RajaOngkirClient

  constructor() {
    this.client = new RajaOngkirClient()
  }

  async quoteRates(input: {
    destination_city_id: string
    weight_grams: number
    couriers: string[]
  }) {
    const origin = process.env.RAJAONGKIR_ORIGIN_CITY_ID
    if (!origin) throw new Error("RAJAONGKIR_ORIGIN_CITY_ID is required")

    return this.client.quote({
      origin_city_id: origin,
      destination_city_id: input.destination_city_id,
      weight_grams: input.weight_grams,
      couriers: input.couriers,
    })
  }

  /**
   * Idempotency: caller wajib cek metadata fulfillment sudah punya external_shipment_id.
   * (Logic cek/simpan akan dilakukan saat wiring endpoint admin generate resi)
   */
  async createShipment(payload: any) {
    logger.info("createShipment", { order_id: payload?.order_id })
    return this.client.createShipment(payload)
  }

  async track(awb: string) {
    return this.client.track(awb)
  }
}
