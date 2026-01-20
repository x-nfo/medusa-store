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
  destination_district_id?: string // Added for V2 support
  destination_subdistrict_id?: string // Added for V2 support (Kelurahan)
  weight_grams: number
  couriers: string[]
}

export class RajaOngkirFulfillmentService extends AbstractFulfillmentProviderService {
  static readonly identifier = "rajaongkir"

  private client: RajaOngkirClient
  private options: RajaOngkirOptions
  private static readonly DEFAULT_WEIGHT_GRAMS = 1000 // Default 1kg if missing

  // Mapping of supported couriers and their services
  // Format: [COURIER_CODE]-[SERVICE_CODE]
  private static readonly SERVICES = {
    // Aggregated / Best Price Options
    "std-best": { name: "Standard (Auto Best Price)", courier: "jne:jnt:sicepat:anteraja:pos", service: "REG:EZ:Kilat Khusus", type: "standard", isAggregated: true },
    "exp-best": { name: "Express (Auto Best Price)", courier: "jne:sicepat:anteraja", service: "YES:BEST:ND", type: "express", isAggregated: true },
    "cargo-best": { name: "Cargo (Auto Best Price)", courier: "jne:sicepat", service: "JTR:GOKIL", type: "heavy", isAggregated: true },

    // JNE
    "jne-reg": { name: "JNE REG (Regular)", courier: "jne", service: "REG", type: "standard" },
    "jne-yes": { name: "JNE YES (Next Day)", courier: "jne", service: "YES", type: "express" },
    "jne-jtr": { name: "JNE JTR (Trucking/Cargo)", courier: "jne", service: "JTR", type: "heavy" },

    // J&T
    "jnt-ez": { name: "J&T EZ (Regular)", courier: "jnt", service: "EZ", type: "standard" },
    "jnt-eco": { name: "J&T ECO (Economy)", courier: "jnt", service: "ECO", type: "standard" },

    // Sicepat
    "sicepat-reg": { name: "SiCepat REG (Regular)", courier: "sicepat", service: "REG", type: "standard" },
    "sicepat-best": { name: "SiCepat BEST (Next Day)", courier: "sicepat", service: "BEST", type: "express" },
    "sicepat-gokil": { name: "SiCepat GOKIL (Cargo)", courier: "sicepat", service: "GOKIL", type: "heavy" },

    // POS
    "pos-kilat": { name: "POS Kilat Khusus", courier: "pos", service: "Kilat Khusus", type: "standard" },

    // Anteraja
    "anteraja-reg": { name: "Anteraja Regular", courier: "anteraja", service: "REG", type: "standard" },
    "anteraja-nd": { name: "Anteraja Next Day", courier: "anteraja", service: "ND", type: "express" },

    // Generic/Fallback (if user wants to allow any service from a courier)
    "jne-all": { name: "JNE (All Services)", courier: "jne", service: "", type: "standard" },
    "jnt-all": { name: "J&T (All Services)", courier: "jnt", service: "", type: "standard" },
    "sicepat-all": { name: "SiCepat (All Services)", courier: "sicepat", service: "", type: "standard" },

    // Legacy/Default fallback
    "rajaongkir-standard": { name: "RajaOngkir Standard (JNE REG)", courier: "jne", service: "REG", type: "standard" },
  }

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

  // Helper to resolve aggregated options to a list of potential courier/service pairs
  // Returns array of objects: { courier, service }
  private resolveServiceConfig(optionId: string) {
    const config = RajaOngkirFulfillmentService.SERVICES[optionId]
    if (!config) return []

    // If it's aggregated (colon separated), expand it
    if (config.isAggregated && config.courier.includes(":")) {
      const couriers = config.courier.split(":")
      // Note: Services might not map 1:1 if we are lazy, but usually we define sets
      // For simplicity in this implementation, if aggregated, we check all combinations 
      // OR we hardcode the known pairs for "Standard", "Express" etc.

      // Better approach for robust mapping:
      const candidates: { courier: string, service: string }[] = []

      if (optionId === "std-best") {
        candidates.push({ courier: "jne", service: "REG" })
        candidates.push({ courier: "jnt", service: "EZ" })
        candidates.push({ courier: "sicepat", service: "REG" })
        candidates.push({ courier: "anteraja", service: "REG" })
        candidates.push({ courier: "pos", service: "Kilat Khusus" })
      } else if (optionId === "exp-best") {
        candidates.push({ courier: "jne", service: "YES" })
        candidates.push({ courier: "sicepat", service: "BEST" })
        candidates.push({ courier: "anteraja", service: "ND" })
      } else if (optionId === "cargo-best") {
        candidates.push({ courier: "jne", service: "JTR" })
        candidates.push({ courier: "sicepat", service: "GOKIL" })
      } else {
        // Fallback for simple single courier
        candidates.push({ courier: config.courier, service: config.service })
      }
      return candidates
    }

    return [{ courier: config.courier, service: config.service }]
  }

  async quoteRates(input: QuoteInput): Promise<ShippingQuoteOption[]> {
    const origin = input.origin_city_id || this.ensureOrigin()

    return this.client.quote({
      origin_city_id: origin,
      destination_city_id: input.destination_city_id,
      destination_district_id: input.destination_district_id,
      destination_subdistrict_id: input.destination_subdistrict_id, // Pass to client
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

  // ---- Fulfillment Service Methods ----

  /**
   * Returns list of fulfillment options available for this provider.
   * These appear in Admin > Settings > Shipping Options.
   */
  async getFulfillmentOptions() {
    // Sort so aggregated ones are at top or distinctive
    return Object.entries(RajaOngkirFulfillmentService.SERVICES).map(
      ([id, config]) => ({
        id,
        name: config.name,
        // We can pass metadata here if Medusa supports it in the UI list, 
        // but primarily the ID is what matters.
      })
    )
  }

  async validateFulfillmentData(optionData: any, data: any, _cart: any) {
    logger.info("[RajaOngkir] validateFulfillmentData", {
      optionId: optionData?.id,
      dataId: data?.id,
      optionData
    })

    const selectedId = optionData?.id || data?.id

    // Verify that the selected option exists in our supported services
    if (selectedId && !RajaOngkirFulfillmentService.SERVICES[selectedId]) {
      // It might be a legacy option or "rajaongkir-standard"
      if (selectedId !== "rajaongkir-standard") {
        throw new Error(`Invalid RajaOngkir fulfillment option: ${selectedId}`)
      }
    }

    // Return clean object with ID to ensure canCalculate receives good data
    return { id: selectedId }
  }

  async validateOption(_data: any): Promise<boolean> {
    return true
  }

  async canCalculate(data: any): Promise<boolean> {
    logger.info("[RajaOngkir] canCalculate", { dataId: data?.id })
    // Always return true to unblock generic validation. 
    // Real validation happens in calculatePrice.
    return true
  }

  /**
   * Calculates the price for a specific shipping option.
   * Medusa passes the `optionData` (from the Shipping Option configuration) 
   * and `data` (context, sometimes contains extra info).
   */
  async calculatePrice(optionData: any, data: any, cart: any): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    logger.info("[RajaOngkir] calculatePrice START", {
      optionId: optionData?.id,
      cartId: cart?.id
    })

    try {
      const optionId = optionData?.id || "rajaongkir-standard"

      // 1. Resolve candidates
      let candidates: { courier: string, service: string }[] = []

      if (optionId === "rajaongkir-standard" && data?.courier) {
        // Legacy dynamic way
        candidates.push({ courier: data.courier, service: data.service || "" })
      } else {
        candidates = this.resolveServiceConfig(optionId)
      }

      if (candidates.length === 0) {
        throw new Error(`Unknown fulfillment option: ${optionId}`)
      }

      // 2. Validate Cart and Address
      const metadata = cart?.shipping_address?.metadata ?? {}
      const cityIdValue =
        metadata?.rajaongkir_city_id ??
        metadata?.city_id // Fallback

      if (!cityIdValue) {
        // If address is missing city_id, we can't calculate.
        logger.warn("[RajaOngkir] Missing city_id, returning 0/null allowed?")
        throw new Error("Destination city (rajaongkir_city_id) is missing in address")
      }
      const cityId = String(cityIdValue).trim()

      // 3. Calculate Weight
      const rawWeight = this.calculateWeightFromItems(cart?.items ?? [])
      const safeWeight =
        Number.isFinite(rawWeight) && rawWeight > 0
          ? rawWeight
          : RajaOngkirFulfillmentService.DEFAULT_WEIGHT_GRAMS
      const weight = Math.max(1, Math.round(safeWeight))

      // 4. Calculate Item Value
      const itemValueRaw =
        Number(cart?.subtotal ?? cart?.item_total ?? cart?.total)
      const itemValue = Number.isFinite(itemValueRaw) && itemValueRaw > 0
        ? Math.round(itemValueRaw)
        : 1

      // 5. Call API for all candidates and find lowest
      // Group candidates by courier to minimize calls if client supports it?
      // Our client support multi-courier getCostOptions, but getCost is singular.
      // Optimization: use getCostOptions if multiple couriers.

      let bestPrice = Infinity
      let bestCandidate: { courier: string; service: string } | null = null

      // Collect unique couriers to query
      const uniqueCouriers = [...new Set(candidates.map(c => c.courier))]
      // Use getCostOptions (which supports multi-courier if implemented or loops internally)
      // to fetch ALL available services for these couriers, then filter.

      // Actually, calling getCost loop might be safer given the robust check in client
      // But let's try to be efficient if we have a lot.

      // Since candidates might be cross-courier, let's just loop sequentially or parallel
      const pricePromises = candidates.map(async (cand) => {
        try {
          const p = await this.client.getCost({
            origin: this.ensureOrigin(),
            destination: cityId,
            weight,
            courier: cand.courier,
            service: cand.service,
            itemValue,
            cod: "no",
          })
          return { price: p, candidate: cand }
        } catch (e) {
          return { price: Infinity, candidate: cand }
        }
      })

      const results = await Promise.all(pricePromises)

      for (const res of results) {
        if (res.price < bestPrice && res.price > 0) {
          bestPrice = res.price
          bestCandidate = res.candidate
        }
      }

      if (bestPrice === Infinity || !bestCandidate) {
        throw new Error(`No valid shipping service found for option ${optionId}`)
      }

      logger.info("[RajaOngkir] Price calculated", {
        bestPrice,
        bestCandidate,
        optionId
      })

      return {
        calculated_amount: bestPrice,
        is_calculated_price_tax_inclusive: false,
      }
    } catch (error: any) {
      logger.error("[RajaOngkir] calculatePrice ERROR", { message: error.message })
      throw error
    }
  }

  /**
   * Called when Admin clicks "Create Fulfillment".
   * We should actually book the shipment here.
   */
  async createFulfillment(
    data: any,
    items: any[],
    order: any,
    fulfillment: any
  ) {
    logger.info("[RajaOngkir] createFulfillment called", { orderId: order?.id })

    // If "Manual" fulfillment was desired, data/option might indicate so, 
    // but here we assume if this provider is selected, we want to book it.

    // 1. Prepare Payload
    const optionId = fulfillment?.shipping_option?.data?.id || "rajaongkir-standard"

    // We need to decide which courier to actually use.
    // Since we don't persist the *chosen* sub-courier in the cart line item (usually),
    // we have to re-evaluate best price OR pick a default.
    // Ideally, we re-run the "cheapest" logic.

    // Resolve candidates
    let candidates: { courier: string, service: string }[] = []
    if (optionId === "rajaongkir-standard" && data?.courier) {
      candidates.push({ courier: data.courier, service: data.service || "" })
    } else {
      candidates = this.resolveServiceConfig(optionId)
    }

    const weight = this.calculateWeightFromItems(items)
    const sa = order.shipping_address
    const destinationCityId = sa.metadata?.rajaongkir_city_id || sa.metadata?.city_id

    if (!destinationCityId) {
      throw new Error("Cannot create shipment: shipping address missing city_id")
    }
    const origin = this.getOriginDetails()

    // RE-EVALUATE BEST OPTION logic
    // We need to calculate price again to find the winner
    // Ideally code reuse, but for now duplicate the loop for clarity/safety
    let chosenCandidate: { courier: string, service: string } = candidates[0]

    if (candidates.length > 1) {
      // Need to find cheapest again to ensure we book what was likely quoted
      // Or just book the first one? No, we should book cheap one.
      logger.info("[RajaOngkir] Re-evaluating best courier for fulfillment...", { candidates })

      let bestPrice = Infinity
      // We can just use dummy itemValue calculation
      const itemValueRaw = Number(order.total) || 1

      const pricePromises = candidates.map(async (cand) => {
        try {
          const p = await this.client.getCost({
            origin: this.ensureOrigin(),
            destination: String(destinationCityId),
            weight: weight > 0 ? weight : 1000,
            courier: cand.courier,
            service: cand.service,
            itemValue: itemValueRaw,
            cod: "no",
          })
          return { price: p, candidate: cand }
        } catch (e) {
          return { price: Infinity, candidate: cand }
        }
      })
      const results = await Promise.all(pricePromises)
      for (const res of results) {
        if (res.price < bestPrice && res.price > 0) {
          bestPrice = res.price
          chosenCandidate = res.candidate
        }
      }
    }

    const courier = chosenCandidate.courier
    const serviceCode = chosenCandidate.service

    logger.info("[RajaOngkir] Selected courier for booking", { courier, serviceCode })

    try {
      // Retrieve destination details from metadata
      const districtId = sa.metadata?.rajaongkir_district_id || sa.metadata?.district_id
      const subdistrictId = sa.metadata?.rajaongkir_subdistrict_id || sa.metadata?.subdistrict_id

      // Log Order Payments for Debugging
      logger.info("[RajaOngkir] Order Payments", { payments: order.payments?.map((p: any) => p.provider_id) })

      // Detect COD
      // If any payment provider string contains 'cod' or 'manual' (common for cod), treat as COD.
      // Adjust this logic based on actual payment provider IDs used in the project.
      const codProviders = ["cod", "manual", "system-payment"]
      const isCod = (order.payments || []).some((p: any) =>
        codProviders.some(cp => (p.provider_id || "").toLowerCase().includes(cp))
      )

      const paymentMethod = isCod ? "COD" : "BANK TRANSFER"
      logger.info("[RajaOngkir] Payment Method Detection", { isCod, paymentMethod })

      // Get shipping cost utilized in calculation
      // Medusa shipping_total is usually in smallest unit. For IDR, usually 1 unit = 1 IDR (zero decimal) or 100 if standard.
      // We assume it matches what RajaOngkir expects (IDR integer).
      const orderShippingTotal = (order.shipping_total || 0)
      const shippingCost = orderShippingTotal > 0 ? orderShippingTotal : 0

      const shipmentInput: CreateShipmentInput = {
        order_id: order.display_id ? String(order.display_id) : order.id,
        courier,
        service_code: serviceCode,
        shipping_cost: shippingCost, // Pass estimated cost
        weight_grams: weight > 0 ? weight : 1000,
        sender: {
          name: origin.name || "Store Sender",
          phone: origin.phone || "0000000",
          address: origin.address || "Store Address",
          city_id: origin.city_id,
          postal_code: origin.postal_code,
          email: "admin@store.com" // Needs a valid email
        },
        recipient: {
          name: `${sa.first_name} ${sa.last_name}`.trim(),
          phone: sa.phone || "0000000",
          address: `${sa.address_1} ${sa.address_2 || ""}`.trim(),
          city_id: String(destinationCityId),
          district_id: districtId ? String(districtId) : undefined,
          subdistrict_id: subdistrictId ? String(subdistrictId) : undefined,
          postal_code: sa.postal_code,
          email: order.email // Pass customer email
        },
        items: items.map((i) => ({
          name: i.title || "Product",
          qty: i.quantity,
          price: i.unit_price || 0,
          weight_grams: i.variant?.weight || i.product?.weight || 0,
          variant: i.variant?.title || "Standard",
          width: i.variant?.width,
          height: i.variant?.height,
          length: i.variant?.length
        })),
        payment_method: paymentMethod,
        cod_value: isCod ? (order.total || 0) : 0,
        grand_total: order.total || 0,
        insurance: false
      }

      // 2. Call API (or mock if dev)
      const result = await this.client.createShipment(shipmentInput)

      // 3. Return labels/tracking info
      const trackingUrl = result.tracking_url || ""
      const labelUrl = result.label_url || ""
      const awb = result.awb || ""

      return {
        data: {
          ...data,
          external_shipment_id: result.external_shipment_id,
          awb,
          courier,
          service: serviceCode,
          tracking_url: trackingUrl
        },
        labels: [
          {
            tracking_number: awb,
            tracking_url: trackingUrl,
            label_url: labelUrl
          }
        ]
      }
    } catch (e: any) {
      logger.error("[RajaOngkir] createFulfillment failed", { error: e.message })
      // If we fail here, Medusa will show error in Admin.
      throw e
    }
  }

  async cancelFulfillment(fulfillment: any): Promise<any> {
    // RajaOngkir API might not have a direct cancel, but we should log it
    // or try if Komerce supports it
    logger.info("[RajaOngkir] cancelFulfillment", {
      id: fulfillment.id,
      externalId: fulfillment.data?.external_shipment_id
    })
    return {}
  }

  async createReturnFulfillment(): Promise<any> {
    return { data: {}, labels: [] }
  }

}
