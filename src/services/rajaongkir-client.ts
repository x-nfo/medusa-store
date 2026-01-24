import { logger } from "./logger"
import { MOCK_PROVINCES, MOCK_CITIES, MOCK_DISTRICTS, MOCK_SUBDISTRICTS } from "../lib/rajaongkir-mock-data"

export type ShippingQuoteInput = {
  origin_city_id: string
  destination_city_id: string
  destination_district_id?: string
  destination_subdistrict_id?: string
  weight_grams: number // IMPORTANT: Weight must be in GRAMS (not KG)
  couriers: string[]
}

export type ShippingQuoteOption = {
  courier: string
  service: string
  service_code?: string
  etd?: string
  price: number
}

export type CreateShipmentInput = {
  order_id: string
  courier: string
  service_code?: string
  shipping_cost?: number
  sender: {
    name: string
    phone: string
    address: string
    city_id: string
    postal_code?: string
    email?: string
  }
  recipient: {
    name: string
    phone: string
    address: string
    city_id: string
    district_id?: string
    subdistrict_id?: string
    postal_code?: string
    email?: string
  }
  items: Array<{
    name: string
    qty: number
    price: number
    weight_grams: number
    variant?: string
    width?: number
    height?: number
    length?: number
  }>
  weight_grams: number
  insurance?: boolean
  payment_method?: "COD" | "BANK TRANSFER"
  cod_value?: number
  grand_total?: number
}

// Internal type for Komerce Store Order Payload
type KomerceStoreOrderPayload = {
  order_date: string // YYYY-MM-DD HH:mm:ss
  brand_name: string
  shipper_name: string
  shipper_phone: string
  shipper_destination_id: number
  shipper_address: string
  shipper_email: string
  origin_pin_point?: string
  receiver_name: string
  receiver_phone: string
  receiver_destination_id: number
  receiver_address: string
  receiver_email?: string
  destination_pin_point?: string
  shipping: string
  shipping_type: string
  shipping_cost: number
  shipping_cashback: number
  payment_method: "COD" | "BANK TRANSFER"
  service_fee: number
  additional_cost: number
  grand_total: number
  cod_value: number
  insurance_value: number
  order_details: Array<{
    product_name: string
    product_variant_name: string
    product_price: number
    product_weight: number
    product_width: number
    product_height: number
    product_length: number
    qty: number
    subtotal: number
  }>
}

export type CreateShipmentOutput = {
  external_shipment_id: string
  awb: string
  label_url?: string
  tracking_url?: string
  raw_response?: unknown
}

export type RajaOngkirCostInput = {
  origin: string
  destination: string
  weight: number // IMPORTANT: Weight must be in GRAMS (not KG)
  courier: string
  service?: string
  itemValue?: number
  cod?: "yes" | "no"
}

type RajaOngkirClientOptions = {
  apiKey?: string
  baseUrl?: string
  quotePath?: string
  deliveryPath?: string
  costPath?: string
  timeoutMs?: number
  deliveryBaseUrl?: string
  deliveryApiKey?: string
}

type RequestInit = {
  method?: "GET" | "POST"
  body?: unknown
  headers?: Record<string, string>
}

export class RajaOngkirClient {
  private apiKey: string
  private baseUrl: string
  private readonly quotePath: string
  private readonly deliveryPath: string
  private readonly deliveryBaseUrl: string
  private readonly deliveryApiKey?: string
  private readonly costPath: string
  private readonly timeoutMs: number

  constructor(options?: RajaOngkirClientOptions) {
    const key = options?.apiKey ?? process.env.RAJAONGKIR_API_KEY
    if (!key) {
      throw new Error("RAJAONGKIR_API_KEY is required")
    }
    this.apiKey = key

    const baseUrl =
      options?.baseUrl ??
      process.env.RAJAONGKIR_BASE_URL ??
      "https://rajaongkir.komerce.id/api/v1"

    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`

    this.quotePath =
      options?.quotePath ??
      process.env.RAJAONGKIR_QUOTE_PATH ??
      (this.isV2Api(this.baseUrl) ? "calculate" : "quote")
    this.deliveryPath =
      options?.deliveryPath ??
      process.env.RAJAONGKIR_DELIVERY_PATH ??
      "order/api/v1/orders/store" // Komerce Store Order endpoint

    this.deliveryBaseUrl =
      options?.deliveryBaseUrl ??
      process.env.RAJAONGKIR_DELIVERY_BASE_URL ??
      "https://api.collaborator.komerce.id/"

    this.deliveryApiKey = options?.deliveryApiKey ?? process.env.RAJAONGKIR_API_DELIVERY_KEY

    const envCostPath = process.env.RAJAONGKIR_COST_PATH
    this.costPath =
      options?.costPath ??
      envCostPath ??
      (this.isV2Api(this.baseUrl)
        ? "calculate/district/domestic-cost"
        : "cost")

    const timeoutEnv = Number(process.env.RAJAONGKIR_TIMEOUT_MS)
    this.timeoutMs =
      options?.timeoutMs ??
      (Number.isFinite(timeoutEnv) && timeoutEnv > 0 ? timeoutEnv : 15000)
  }

  /**
   * Calculate shipping cost for a single courier
   * @param input - Cost calculation parameters
   * @param input.weight - IMPORTANT: Weight must be in GRAMS (not KG)
   * @returns Shipping cost in IDR
   */
  async getCost(input: RajaOngkirCostInput): Promise<number> {
    if (!input?.origin) {
      throw new Error("RajaOngkir cost requires origin city id")
    }
    if (!input?.destination) {
      throw new Error("RajaOngkir cost requires destination city id")
    }
    if (!input?.courier) {
      throw new Error("RajaOngkir cost requires courier")
    }
    const weight = Math.round(Number(input.weight))
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("RajaOngkir cost requires valid weight in grams")
    }

    try {
      const payload = {
        origin: String(input.origin),
        destination: String(input.destination),
        weight,
        courier: String(input.courier),
      }

      const response = await this.requestCost(payload, input)
      const price = this.normalizeCostResponse(response, input.courier, input.service)

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(`RajaOngkir cost response returned invalid price for ${input.courier} ${input.service || ''}`)
      }
      return price
    } catch (error) {
      logger.error("RajaOngkir getCost failed", { error })
      throw error
    }
  }

  async getCostOptions(input: RajaOngkirCostInput): Promise<ShippingQuoteOption[]> {
    try {
      const response = await this.requestCost({
        origin: input.origin,
        destination: input.destination,
        weight: input.weight,
        courier: input.courier
      }, input)

      return this.normalizeQuoteResponse(response, [input.courier])
    } catch (error) {
      logger.warn(`RajaOngkir getCostOptions failed for ${input.courier}`, { error })
      return []
    }
  }

  /**
   * Get shipping quotes from multiple couriers
   * @param input - Quote request parameters
   * @param input.weight_grams - IMPORTANT: Weight must be in GRAMS (not KG)
   * @returns Array of shipping options
   */
  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
    const promises = input.couriers.map(courier => {
      // Endpoint is calculate/district/domestic-cost, so we must use district_id
      // subdistrict_id might be too granular for this specific endpoint
      const destination = input.destination_district_id || input.destination_city_id || input.destination_subdistrict_id || ""

      return this.getCostOptions({
        origin: input.origin_city_id,
        destination: destination,
        weight: input.weight_grams,
        courier: courier
      })
    })

    try {
      const results = await Promise.all(promises)
      return results.flat()
    } catch (error) {
      logger.warn("RajaOngkir multi-courier quote failed", { error })
      return []
    }
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    // Komerce requires date format YYYY-MM-DD HH:mm:ss
    const now = new Date()
    const orderDate = now.toISOString().slice(0, 19).replace("T", " ")

    // Sanitize phones
    const shipperPhone = this.sanitizePhone(input.sender.phone)
    const receiverPhone = this.sanitizePhone(input.recipient.phone)

    // Determine payment method and values
    const paymentMethod = input.payment_method || "BANK TRANSFER"
    // Calculate total product price
    const totalProductPrice = input.items.reduce((sum, item) => sum + (item.price * item.qty), 0)

    // Calculate grand total: Product Total + Shipping - Cashback
    // Note: Komerce logic implies grand_total includes shipping.
    // Ensure we have a shipping cost. If not provided, should verify or throw?
    // For now assume 0 if missing, but likely passed from checkout
    const shippingCost = Math.round(input.shipping_cost || 0)
    const shippingCashback = 0 // Assuming no cashback logic yet
    const additionalCost = 0
    const insuranceValue = 0 // Modify if insurance logic needed

    // Logic: Use provided grand_total or calculate from items + shipping.
    // For COD, Komerce STRICTLY requires grand_total == cod_value.
    let grandTotal = input.grand_total || (totalProductPrice + shippingCost + additionalCost - shippingCashback)

    if (paymentMethod === "COD" && input.cod_value) {
      grandTotal = input.cod_value
    }

    // If COD, cod_value must equal grand_total
    const codValue = paymentMethod === "COD" ? (input.cod_value || grandTotal) : 0

    // Service fee logic: Komerce expects 2.8% for COD
    let serviceFee = 0
    if (paymentMethod === "COD") {
      serviceFee = Math.round(grandTotal * 0.028)
    }

    // Destination Logic: Use subdistrict if available, else district, else city
    // Komerce V2 requires numeric ID for destination.
    // Try to parse the input IDs which are typically strings in our system
    const shipperDestId = parseInt(input.sender.city_id) // We use RAJAONGKIR_ORIGIN_CITY_ID usually

    // Priority: Subdistrict -> District -> City
    let receiverDestId = 0
    if (input.recipient.subdistrict_id) {
      receiverDestId = parseInt(input.recipient.subdistrict_id)
    } else if (input.recipient.district_id) {
      receiverDestId = parseInt(input.recipient.district_id)
    } else {
      receiverDestId = parseInt(input.recipient.city_id)
    }

    if (isNaN(receiverDestId) || receiverDestId === 0) {
      logger.warn("RajaOngkir createShipment: Invalid receiver destination ID", {
        sub: input.recipient.subdistrict_id,
        dist: input.recipient.district_id,
        city: input.recipient.city_id
      })
      // Fallback or throw? Komerce will reject 0/NaN.
      // throw new Error("Invalid destination ID")
    }

    const payload: KomerceStoreOrderPayload = {
      order_date: orderDate,
      brand_name: "Mastro Store", // Hardcoded or config?
      shipper_name: input.sender.name || "Store Admin",
      shipper_phone: shipperPhone,
      shipper_destination_id: shipperDestId,
      shipper_address: input.sender.address,
      shipper_email: input.sender.email || "admin@example.com",

      receiver_name: input.recipient.name,
      receiver_phone: receiverPhone,
      receiver_destination_id: receiverDestId,
      receiver_address: input.recipient.address,
      receiver_email: input.recipient.email || "",

      shipping: input.courier.toUpperCase(), // e.g., JNE
      shipping_type: input.service_code || "REG", // e.g., REG19, defaults REG
      shipping_cost: shippingCost,
      shipping_cashback: shippingCashback,

      payment_method: paymentMethod,
      service_fee: serviceFee,
      additional_cost: additionalCost,
      grand_total: grandTotal,
      cod_value: codValue,
      insurance_value: insuranceValue,

      order_details: input.items.map(item => ({
        product_name: item.name,
        product_variant_name: item.variant || "Standard",
        product_price: Math.round(item.price),
        product_weight: Math.round(item.weight_grams > 0 ? item.weight_grams : 100), // Ensure > 0
        product_width: item.width || 10,  // Default dimensions
        product_height: item.height || 10,
        product_length: item.length || 10,
        qty: item.qty,
        subtotal: Math.round(item.price * item.qty)
      }))
    }

    logger.info("RajaOngkir createShipment Payload", { payload })

    const response = await this.request(
      "order/api/v1/orders/store", // Explicit path just to be sure
      {
        method: "POST",
        body: payload,
      },
      "createShipment",
      this.deliveryBaseUrl,
      this.deliveryApiKey
    )

    const normalized = this.normalizeShipmentResponse(response)
    return {
      ...normalized,
      raw_response: response,
    }
  }

  private sanitizePhone(phone: string): string {
    // Remove + and non-numeric chars
    let clean = phone.replace(/[^0-9]/g, "")
    // Ensure starts with 62
    if (clean.startsWith("0")) {
      clean = "62" + clean.substring(1)
    } else if (clean.startsWith("8")) {
      // Komerce allows starting with 8 or 62. Let's start with 62 to be safe standard
      clean = "62" + clean
    }
    // If it starts with 62, it's good.
    return clean
  }

  /**
   * Track shipment status
   * @param awb - Airway Bill number
   * @param courier - Courier code (e.g. JNE, SICEPAT)
   */
  async track(awb: string, courier: string): Promise<{ latest_status: string; history: any[]; raw?: any }> {
    try {
      if (!awb || !courier) {
        throw new Error("Tracking requires both AWB and Courier code")
      }

      const shippingCode = courier.toUpperCase()
      const query = new URLSearchParams({
        shipping: shippingCode,
        airway_bill: awb
      })

      const path = `order/api/v1/orders/history-airway-bill?${query.toString()}`

      const response: any = await this.request(
        path,
        { method: "GET" },
        "track",
        this.deliveryBaseUrl,
        this.deliveryApiKey
      )

      const history = response?.data?.history ?? []
      const summary = response?.data?.summary
      const status = summary?.status || (history.length > 0 ? history[history.length - 1].status : "UNKNOWN")

      return {
        latest_status: status,
        history: history,
        raw: response
      }
    } catch (error) {
      logger.warn("RajaOngkir track failed", { awb, courier, error })
      // Return a safe fallback rather than throwing, so the job continues processing other orders
      return { latest_status: "UNKNOWN", history: [] }
    }
  }

  async getProvinces(): Promise<any[]> {
    try {
      const isV2 = this.isV2Api(this.baseUrl)
      const path = isV2 ? "destination/province" : "province"

      const response: any = await this.request(
        path,
        { method: "GET" },
        "getProvinces"
      )
      return this.normalizeLocationResponse(response)
    } catch (error) {
      logger.warn("RajaOngkir getProvinces failed, using mock data", { error })
      return this.normalizeLocationResponse({ results: MOCK_PROVINCES })
    }
  }

  async getCities(provinceId?: string): Promise<any[]> {
    try {
      const isV2 = this.isV2Api(this.baseUrl)

      // V2 uses path parameter: destination/city/{provinceId}
      // Standard uses query parameter: city?province={provinceId}
      let path: string
      if (isV2) {
        path = provinceId ? `destination/city/${provinceId}` : "destination/city"
      } else {
        path = provinceId ? `city?province=${provinceId}` : "city"
      }

      console.log(`[RajaOngkir] Fetching cities, path: ${path}`)

      const response: any = await this.request(
        path,
        { method: "GET" },
        "getCities"
      )

      const cities = this.normalizeLocationResponse(response)
      console.log(`[RajaOngkir] Fetched ${cities.length} cities`)

      return cities
    } catch (error) {
      logger.warn("RajaOngkir getCities failed, using mock data", { error })
      const filtered = provinceId
        ? MOCK_CITIES.filter(c => c.province_id === provinceId)
        : MOCK_CITIES
      return this.normalizeLocationResponse({ results: filtered })
    }
  }

  async getDistricts(cityId: string): Promise<any[]> {
    try {
      const isV2 = this.isV2Api(this.baseUrl)
      const path = isV2
        ? `destination/district/${cityId}`
        : `subdistrict?city=${cityId}`

      console.log(`[RajaOngkir] Fetching districts for city ${cityId}, path: ${path}`)

      const response: any = await this.request(
        path,
        { method: "GET" },
        "getDistricts"
      )

      console.log(`[RajaOngkir] Raw districts response:`, response)

      const districts = this.normalizeLocationResponse(response)

      console.log(`[RajaOngkir] Fetched ${districts.length} districts for city ${cityId}:`,
        districts.slice(0, 3).map(d => d.name || d.subdistrict_name || d.district_name))

      return districts
    } catch (error) {
      logger.warn("RajaOngkir getDistricts failed, using mock data", { error })
      const filtered = MOCK_DISTRICTS.filter(d => d.city_id === cityId)
      return this.normalizeLocationResponse({ results: filtered })
    }
  }

  async getSubdistricts(districtId: string): Promise<any[]> {
    try {
      const isV2 = this.isV2Api(this.baseUrl)
      const path = isV2
        ? `destination/sub-district/${districtId}`
        : `subdistrict/${districtId}`

      console.log(`[RajaOngkir] Fetching subdistricts for district ${districtId}, path: ${path}`)

      const response: any = await this.request(
        path,
        { method: "GET" },
        "getSubdistricts"
      )

      console.log(`[RajaOngkir] Raw subdistricts response:`, response)

      const subdistricts = this.normalizeLocationResponse(response)

      console.log(`[RajaOngkir] Fetched ${subdistricts.length} subdistricts for district ${districtId}:`,
        subdistricts.slice(0, 3).map(s => s.name || s.subdistrict_name))

      return subdistricts
    } catch (error) {
      logger.warn("RajaOngkir getSubdistricts failed, using mock data", { error })
      const filtered = MOCK_SUBDISTRICTS.filter(s => s.district_id === districtId)
      return this.normalizeLocationResponse({ results: filtered })
    }
  }

  async searchCities(
    search?: string,
    limit: number = 20
  ): Promise<Array<{ id: string; name: string; type: string; subdistrict_id?: string; district_id?: string; city_id?: string; province_id?: string; zip_code?: string }>> {
    try {
      const searchTerm = search?.trim() || ""
      const isV2 = this.isV2Api(this.baseUrl)

      if (isV2) {
        const query = new URLSearchParams()
        if (searchTerm) query.set("search", searchTerm)

        const response: any = await this.request(
          `destination/domestic-destination?${query.toString()}`,
          { method: "GET" },
          "searchCities"
        )

        const data = response?.data ?? []

        // Log first item to see structure
        if (data.length > 0) {
          console.log(`[RajaOngkir] Raw first item:`, JSON.stringify(data[0], null, 2))
        }

        const cities = data
          .map((item: any) => {
            // Mapping for Komerce V2 domestic-destination
            // It returns mixed levels: Province, City, District, Subdistrict

            if (item.subdistrict_name) {
              // Level: Subdistrict (Kelurahan)
              return {
                id: String(item.subdistrict_id || item.id), // Use subdistrict_id
                name: `${item.subdistrict_name}, ${item.district_name}, ${item.city_name}, ${item.province_name}`,
                type: "subdistrict",
                // Additional metadata for auto-filling
                subdistrict_id: String(item.subdistrict_id || item.id),
                district_id: String(item.district_id),
                city_id: String(item.city_id),
                province_id: String(item.province_id),
                zip_code: item.zip_code || ""
              }
            }

            if (item.district_name) {
              // Level: District (Kecamatan)
              return {
                id: String(item.district_id || item.id),
                name: `${item.district_name}, ${item.city_name}, ${item.province_name}`,
                type: "district",
                district_id: String(item.district_id || item.id),
                city_id: String(item.city_id),
                province_id: String(item.province_id)
              }
            }

            if (item.city_name) {
              // Level: City (Kota/Kabupaten)
              return {
                id: String(item.city_id || item.id),
                name: `${item.city_name}, ${item.province_name}`,
                type: "city",
                city_id: String(item.city_id || item.id),
                province_id: String(item.province_id)
              }
            }

            return null
          })
          .filter(Boolean) // Remove nulls (provinces or unknown)
          .slice(0, limit)

        console.log(`[RajaOngkir] Search "${searchTerm}" found ${cities.length} locations`)

        return cities
      }

      return []
    } catch (error: any) {
      logger.warn("RajaOngkir searchCities failed", { error: error.message, search })
      return []
    }
  }

  private isV2Api(baseUrl: string): boolean {
    return baseUrl.includes("rajaongkir.komerce.id") || baseUrl.includes("collaborator.komerce.id")
  }

  private normalizeLocationResponse(response: any): any[] {
    const root = response?.data ?? response?.rajaongkir?.results ?? response?.rajaongkir ?? response
    if (Array.isArray(root)) return root
    return root?.results ?? []
  }

  private async requestCost(payload: {
    origin: string
    destination: string
    weight: number
    courier: string
  }, input: RajaOngkirCostInput) {
    if (this.isV2Api(this.baseUrl)) {
      // V2 API menggunakan weight dalam GRAM (bukan KG!)
      const weight = Math.round(payload.weight) // Keep in grams
      const itemValueRaw = Number(input.itemValue)
      const itemValue = Number.isFinite(itemValueRaw) && itemValueRaw > 0
        ? Math.round(itemValueRaw)
        : 10000 // Default item value
      const cod = input.cod ?? "no"

      // V2 uses form data, not query params for cost calculation
      const formData = new URLSearchParams({
        origin: payload.origin,
        destination: payload.destination,
        weight: String(weight), // Weight in grams!
        courier: payload.courier,
      })

      console.log(`[RajaOngkir V2] Calculating cost:`, {
        origin: payload.origin,
        destination: payload.destination,
        weight: `${weight}g`,
        courier: payload.courier
      })

      return this.requestV2Cost(formData)
    }

    // Standard RajaOngkir API
    return this.request(
      this.costPath,
      {
        method: "POST",
        body: payload,
      },
      "getCost"
    )
  }

  private async requestV2Cost(formData: URLSearchParams): Promise<any> {
    const url = this.buildUrl(this.costPath)

    logger.info("RajaOngkir V2 HTTP request", {
      label: "getCost",
      method: "POST",
      url,
      body: Object.fromEntries(formData.entries()),
    })

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "key": this.apiKey,
      },
      body: formData.toString(),
    })

    const textResponse = await response.text()
    const parsed = this.tryParseJSON(textResponse)

    logger.info("RajaOngkir V2 HTTP response", {
      label: "getCost",
      url,
      status: response.status,
      body: parsed,
    })

    if (!response.ok) {
      const errorBody = typeof parsed === "string" ? parsed : JSON.stringify(parsed)
      throw new Error(`RajaOngkir V2 getCost failed (${response.status}): ${errorBody}`)
    }

    return parsed
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    label: string,
    baseUrl?: string,
    apiKey?: string
  ): Promise<T> {
    const url = this.buildUrl(path, baseUrl)
    const headers = this.buildHeaders(init.headers, apiKey)
    const method = init.method ?? "GET"
    const body =
      init.body !== undefined && init.body !== null
        ? JSON.stringify(init.body)
        : undefined

    logger.info("RajaOngkir HTTP request", {
      label,
      method,
      url,
      body: init.body ? init.body : undefined,
    })

    const maxAttempts = 3
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, {
          method,
          headers,
          body: body as any,
        })

        const textResponse = await response.text()
        const parsed = this.tryParseJSON(textResponse)

        logger.info("RajaOngkir HTTP response", {
          label,
          url,
          status: response.status,
          body: parsed,
        })

        if (!response.ok) {
          const errorBody =
            typeof parsed === "string" ? parsed : JSON.stringify(parsed)
          throw new Error(
            `RajaOngkir ${label} request failed (${response.status}): ${errorBody}`
          )
        }

        return parsed as T
      } catch (error) {
        lastError = error
        if (attempt < maxAttempts) {
          logger.warn("RajaOngkir request retry", {
            label,
            attempt,
            error: (error as Error)?.message ?? error,
          })
          await this.delay(200 * attempt)
          continue
        }
        throw error
      }
    }

    throw lastError
  }

  private async fetchWithTimeout(url: string, init: { method?: string; headers: any; body?: any }) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await fetch(url, {
        ...init,
        headers: init.headers,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  private tryParseJSON(text: string) {
    if (!text) {
      return text
    }
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private buildUrl(path: string, baseUrl?: string) {
    return new URL(path, baseUrl ?? this.baseUrl).toString()
  }

  private buildHeaders(initHeaders?: Record<string, string>, apiKey?: string) {
    const headers: Record<string, string> = { ...(initHeaders ?? {}) }
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json"
    }
    const key = apiKey ?? this.apiKey
    headers["key"] = key
    headers["X-API-Key"] = key
    headers["Authorization"] = `Bearer ${key}`
    return headers
  }

  private normalizeCostResponse(
    response: unknown,
    courierFilter?: string,
    serviceFilter?: string
  ): number {
    if (!response || typeof response !== "object") {
      throw new Error("RajaOngkir cost response is empty or invalid")
    }

    if (this.isV2Response(response)) {
      return this.normalizeV2CostResponse(response as any, courierFilter, serviceFilter)
    }

    const root = (response as any).rajaongkir ?? response
    const status = root?.status
    if (!status || typeof status !== "object") {
      throw new Error("RajaOngkir cost response missing status")
    }

    const statusCode = Number((status as any).code)
    if (!Number.isFinite(statusCode)) {
      throw new Error("RajaOngkir cost response missing status code")
    }
    if (statusCode !== 200) {
      const description = (status as any).description ?? "Unknown error"
      throw new Error(
        `RajaOngkir cost response error (${statusCode}): ${description}`
      )
    }

    const results = root?.results ?? root?.data?.results ?? root?.data
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error("RajaOngkir cost response missing results")
    }

    const prices: number[] = []

    const isServiceMatch = (svcName?: string, svcCode?: string) => {
      if (!serviceFilter) return true
      const filter = serviceFilter.toLowerCase().trim()
      const n = (svcName || "").toLowerCase()
      const c = (svcCode || "").toLowerCase()
      return n.includes(filter) || c.includes(filter) || filter.includes(c)
    }

    const pushPrice = (value: unknown) => {
      const parsed = this.parseNumber(value)
      if (parsed !== undefined && parsed > 0) {
        prices.push(parsed)
      }
    }

    for (const result of results) {
      if (!result) {
        continue
      }
      if (Array.isArray(result.costs)) {
        for (const cost of result.costs) {
          if (!isServiceMatch(cost.service, cost.service)) continue

          if (Array.isArray(cost?.cost)) {
            for (const inner of cost.cost) {
              pushPrice(inner?.value ?? inner)
            }
          }
          pushPrice(cost?.value ?? cost?.price ?? cost?.cost)
        }
      }
      if (Array.isArray(result.services)) {
        for (const service of result.services) {
          if (!isServiceMatch(service.service, service.service_code)) continue
          pushPrice(service?.value ?? service?.price ?? service?.cost)
        }
      }
      if (!serviceFilter) {
        pushPrice(result?.cost)
        pushPrice(result?.price)
      }
    }

    if (!prices.length) {
      if (serviceFilter) {
        throw new Error(`RajaOngkir: Service '${serviceFilter}' not found`)
      }
      throw new Error("RajaOngkir cost response missing price")
    }

    return serviceFilter ? prices[0] : Math.min(...prices)
  }

  private isV2Response(response: unknown): boolean {
    return Boolean(
      response &&
      typeof response === "object" &&
      (response as any).meta &&
      typeof (response as any).meta === "object"
    )
  }

  private normalizeV2CostResponse(response: any, courierFilter?: string, serviceFilter?: string): number {
    const meta = response.meta
    const code = Number(meta?.code)
    if (!Number.isFinite(code)) {
      throw new Error("RajaOngkir cost response missing meta code")
    }
    if (code !== 200) {
      const message = meta?.message ?? "Unknown error"
      throw new Error(`RajaOngkir cost response error (${code}): ${message}`)
    }

    const data = response.data
    const normalizedFilter = this.normalizeCourierFilter(courierFilter)
    const prices = this.extractPricesFromV2Data(data, normalizedFilter, serviceFilter)
    if (!prices.length) {
      if (serviceFilter) {
        throw new Error(`RajaOngkir V2: Service '${serviceFilter}' not found for courier '${courierFilter || 'any'}'`)
      }
      throw new Error("RajaOngkir cost response missing price")
    }

    return Math.min(...prices)
  }

  private normalizeQuoteResponse(response: any, couriers: string[]): ShippingQuoteOption[] {
    const options: ShippingQuoteOption[] = []

    const addOption = (courierName: string, serviceName: string, priceVal: any, etdVal?: string) => {
      const price = this.parseNumber(priceVal)
      if (price !== undefined && price > 0) {
        options.push({
          courier: courierName.toLowerCase(),
          service: serviceName,
          price: price,
          etd: etdVal || ""
        })
      }
    }

    if (this.isV2Response(response)) {
      const data = response.data
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          const courier = row.code || row.name || couriers[0] || "POS"
          const service = row.service || row.service_name || "REG"
          addOption(courier, service, row.price || row.cost, row.etd)
        })
      }
      return options
    }

    const results = response?.rajaongkir?.results || response?.results || []
    if (Array.isArray(results)) {
      results.forEach((res: any) => {
        const courier = res.code || res.name || couriers[0]
        if (Array.isArray(res.costs)) {
          res.costs.forEach((cost: any) => {
            const service = cost.service || cost.service_description
            let price = 0
            let etd = ""
            if (Array.isArray(cost.cost)) {
              price = cost.cost[0]?.value
              etd = cost.cost[0]?.etd
            } else if (cost.cost) {
              price = cost.cost
            }
            addOption(courier, service, price, etd)
          })
        }
      })
    }

    return options
  }

  private extractPricesFromV2Data(data: any, courierFilter?: string, serviceFilter?: string): number[] {
    const prices: number[] = []
    if (!Array.isArray(data)) return []

    const isServiceMatch = (svcName?: string) => {
      if (!serviceFilter) return true
      const filter = serviceFilter.toLowerCase().trim()
      const n = (svcName || "").toLowerCase()
      return n.includes(filter) || filter.includes(n)
    }

    for (const row of data) {
      if (courierFilter) {
        const rowCourier = (row.code || row.name || "").toLowerCase()
        if (!rowCourier.includes(courierFilter)) continue
      }

      if (serviceFilter) {
        const rowService = row.service || row.service_name || row.description
        if (!isServiceMatch(rowService)) continue
      }

      const p = this.parseNumber(row.price || row.cost)
      if (p !== undefined && p > 0) {
        prices.push(p)
      }
    }
    return prices
  }

  private normalizeCourierFilter(filter?: string): string | undefined {
    if (!filter) return undefined
    const normalized = this.normalizeCourierName(filter)
    if (!normalized || normalized === "all" || normalized === "any") {
      return undefined
    }
    return normalized
  }

  private normalizeCourierName(name?: string): string {
    if (!name) return ""
    const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!cleaned) return ""
    if (cleaned === "post" || cleaned === "posindonesia") return "pos"
    if (cleaned === "jneexpress") return "jne"
    if (cleaned === "jnt" || cleaned === "jntcargo") return "jnt"
    if (cleaned === "sicpat" || cleaned === "sicepat") return "sicepat"
    if (cleaned === "ninja" || cleaned === "ninjaexpress") return "ninja"
    return cleaned
  }

  private parseNumber(val: any): number | undefined {
    if (val === undefined || val === null) return undefined
    const n = Number(val)
    return Number.isFinite(n) ? n : undefined
  }

  private normalizeShipmentResponse(response: any): CreateShipmentOutput {
    const data = response?.data || response?.rajaongkir?.result || {}
    return {
      external_shipment_id: String(data.id || data.shipment_id || "unknown"),
      awb: String(data.awb || data.waybill || ""),
      label_url: data.label_url || data.label || "",
      tracking_url: data.tracking_url || data.track_url || ""
    }
  }
}
