import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CreateShipmentInput,
  RajaOngkirClient,
  ShippingQuoteOption,
} from "../../services/rajaongkir-client"
import { logger } from "../../services/logger"

type RajaOngkirOptions = {
  apiKey?: string
  baseUrl?: string
  originCityId?: string
  originName?: string
  originPhone?: string
  originAddress?: string
  originPostalCode?: string
  deliveryPath?: string
}

type QuoteInput = {
  origin_city_id?: string
  destination_city_id: string
  weight_grams: number
  couriers: string[]
}

export class RajaOngkirFulfillmentService extends AbstractFulfillmentProviderService {
  static readonly identifier = "rajaongkir"

  private client: RajaOngkirClient
  private options: RajaOngkirOptions
  private static readonly DEFAULT_WEIGHT_GRAMS = 300

  constructor(_container: any = {}, options: RajaOngkirOptions = {}) {
    super()
    this.options = options
    this.client = new RajaOngkirClient({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      deliveryPath: options.deliveryPath,
    })
  }

  private getOriginCityId() {
    return (
      this.options.originCityId ||
      process.env.RAJAONGKIR_ORIGIN_CITY_ID ||
      ""
    )
  }

  private ensureOrigin() {
    const origin = this.getOriginCityId()
    if (!origin) {
      throw new Error("RAJAONGKIR_ORIGIN_CITY_ID is required")
    }
    return origin
  }

  getOriginDetails() {
    const origin_city_id = this.ensureOrigin()
    return {
      name: this.options.originName || process.env.RAJAONGKIR_ORIGIN_NAME || "",
      phone:
        this.options.originPhone || process.env.RAJAONGKIR_ORIGIN_PHONE || "",
      address:
        this.options.originAddress ||
        process.env.RAJAONGKIR_ORIGIN_ADDRESS ||
        "",
      city_id: origin_city_id,
      postal_code:
        this.options.originPostalCode ||
        process.env.RAJAONGKIR_ORIGIN_POSTAL_CODE ||
        undefined,
    }
  }

  async quoteRates(input: QuoteInput): Promise<ShippingQuoteOption[]> {
    const origin = input.origin_city_id || this.ensureOrigin()

    return this.client.quote({
      origin_city_id: origin,
      destination_city_id: input.destination_city_id,
      weight_grams: input.weight_grams,
      couriers: input.couriers,
    })
  }

  async quoteShippingOptions(input: {
    destinationCityId: string
    weight: number
    couriers: string[]
  }) {
    return this.quoteRates({
      destination_city_id: input.destinationCityId,
      weight_grams: input.weight,
      couriers: input.couriers,
    })
  }

  calculateWeightFromItems(
    items: Array<{
      quantity?: number
      variant?: { weight?: number; product?: { metadata?: { weight?: number } } }
      product?: { metadata?: { weight?: number } }
    }>
  ) {
    return (items || []).reduce((acc, item) => {
      const qty = Number(item.quantity ?? 0)
      if (!Number.isFinite(qty) || qty <= 0) {
        return acc
      }

      const variantWeight = Number(item.variant?.weight ?? 0)
      const productWeight = Number(
        item.product?.metadata?.weight ??
        item.variant?.product?.metadata?.weight ??
        0
      )

      const unitWeightCandidate = [variantWeight, productWeight].find(
        (value) => Number.isFinite(value) && value > 0
      )
      const unitWeight =
        unitWeightCandidate ?? RajaOngkirFulfillmentService.DEFAULT_WEIGHT_GRAMS

      return acc + qty * unitWeight
    }, 0)
  }

  /**
   * Idempotency: caller wajib cek metadata fulfillment sudah punya external_shipment_id.
   */
  async createShipment(payload: CreateShipmentInput) {
    logger.info("createShipment", { order_id: payload?.order_id })
    return this.client.createShipment(payload)
  }

  async createDeliveryOrder(payload: CreateShipmentInput) {
    return this.createShipment(payload)
  }

  async track(awb: string) {
    return this.client.track(awb)
  }

  // ---- Minimal fulfillment provider stubs ----
  async getFulfillmentOptions() {
    return [
      {
        id: "rajaongkir-standard",
        name: "RajaOngkir",
      },
    ]
  }

  async validateFulfillmentData(_optionData: any, data: any) {
    return data
  }

  async validateOption(_data: any): Promise<boolean> {
    return true
  }

  async canCalculate(): Promise<boolean> {
    return true
  }

  async calculatePrice(optionData: any, data: any, cart: any): Promise<number> {
    logger.info("[RajaOngkir] calculatePrice START", {
      data: JSON.stringify(data),
      optionData: JSON.stringify(optionData),
      cartId: cart?.id
    })

    try {
      const metadata = cart?.shipping_address?.metadata ?? {}
      const cityIdValue =
        metadata?.rajaongkir_city_id ??
        metadata?.city_id // Fallback

      if (cityIdValue === undefined || cityIdValue === null) {
        logger.error("[RajaOngkir] Destination city id missing in cart metadata", { metadata })
        throw new Error("Destination city id is required")
      }
      const cityId = String(cityIdValue).trim()
      if (!cityId) {
        throw new Error("Destination city id is required")
      }

      const rawWeight = this.calculateWeightFromItems(cart?.items ?? [])
      const fallbackWeight = RajaOngkirFulfillmentService.DEFAULT_WEIGHT_GRAMS
      const safeWeight =
        Number.isFinite(rawWeight) && rawWeight > 0
          ? rawWeight
          : fallbackWeight
      const weight = Math.max(1, Math.round(safeWeight))

      const courier = data?.courier
      const service = data?.service // Get service/service_code

      if (!courier || String(courier).trim() === "") {
        logger.error("[RajaOngkir] Courier missing in data", { data })
        throw new Error("Courier not selected")
      }
      const courierValue = String(courier).trim()

      const itemValueRaw =
        Number(cart?.subtotal ?? cart?.item_total ?? cart?.total)
      const itemValue = Number.isFinite(itemValueRaw) && itemValueRaw > 0
        ? Math.round(itemValueRaw)
        : 1

      // @ts-ignore - Updating signature in next step
      const price = await this.client.getCost({
        origin: this.ensureOrigin(),
        destination: cityId,
        weight,
        courier: courierValue,
        service: service, // Pass service for filtering
        itemValue,
        cod: "no",
      })

      if (!Number.isFinite(price) || price <= 0) {
        logger.error("[RajaOngkir] Invalid price returned", { price })
        throw new Error("RajaOngkir returned invalid price")
      }

      logger.info("[RajaOngkir] calculatePrice SUCCESS", {
        cartId: cart?.id,
        weight,
        cityId,
        price,
        courier: courierValue,
        service
      })

      return {
        calculated_amount: price,
        is_calculated_price_tax_inclusive: false,
      } as any // Cast to any to avoid strict type checks if definition varies
    } catch (error: any) {
      logger.error("[RajaOngkir] calculatePrice ERROR", {
        message: error.message,
        stack: error.stack
      })
      throw new Error("RajaOngkir shipping price calculation failed: " + error.message)
    }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    _items: any,
    _order: any,
    _fulfillment: any
  ) {
    return { data, labels: [] }
  }

  async cancelFulfillment(): Promise<any> {
    return {}
  }

  async createReturnFulfillment(): Promise<any> {
    return { data: {}, labels: [] }
  }
}
