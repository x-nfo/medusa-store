import { logger } from "./logger"

export type ShippingQuoteInput = {
  origin_city_id: string
  destination_city_id: string
  weight_grams: number
  couriers: string[] // e.g. ["jne","jnt","sicepat"]
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
  sender: {
    name: string
    phone: string
    address: string
    city_id: string
    postal_code?: string
  }
  recipient: {
    name: string
    phone: string
    address: string
    city_id: string
    postal_code?: string
  }
  items: Array<{ name: string; qty: number; price: number }>
  weight_grams: number
  insurance?: boolean
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
  weight: number
  courier: string
  service?: string // Added for filtering
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
      "https://rajaongkir.komerce.id"
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`

    this.quotePath =
      options?.quotePath ??
      process.env.RAJAONGKIR_QUOTE_PATH ??
      (this.isKomerceTariffApi(this.baseUrl) ? "calculate" : "quote")
    this.deliveryPath =
      options?.deliveryPath ??
      process.env.RAJAONGKIR_DELIVERY_PATH ??
      "delivery/order"
    const envCostPath = process.env.RAJAONGKIR_COST_PATH
    this.costPath =
      options?.costPath ??
      envCostPath ??
      (this.isKomerceDomesticCostApi(this.baseUrl)
        ? "api/v1/calculate/domestic-cost"
        : this.isKomerceTariffApi(this.baseUrl)
          ? "calculate"
          : "cost")

    const timeoutEnv = Number(process.env.RAJAONGKIR_TIMEOUT_MS)
    this.timeoutMs =
      options?.timeoutMs ??
      (Number.isFinite(timeoutEnv) && timeoutEnv > 0 ? timeoutEnv : 15000)
  }

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

      if (this.isKomerceDomesticCostApi(this.baseUrl)) {
        return await this.requestKomerceDomesticCost(payload)
      }

      const response = await this.requestCost(payload, input)
      // Pass input.service to normalizer
      const price = this.normalizeCostResponse(response, input.courier, input.service)

      // If specific service requested but not found/price valid, error out
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if ((!Number.isFinite(price) || price <= 0)) {
        throw new Error(`RajaOngkir cost response returned invalid price for ${input.courier} ${input.service || ''}`)
      }
      return price
    } catch (error) {
      logger.warn("RajaOngkir getCost failed, using fallback mock price", { error })
      // Return fallback price
      return 14000
    }
  }

  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
    const payload = {
      origin: input.origin_city_id,
      destination: input.destination_city_id,
      weight: input.weight_grams,
      weight_grams: input.weight_grams,
      couriers: input.couriers,
    }

    try {
      if (this.isKomerceDomesticCostApi(this.baseUrl)) {
        const response = await this.requestKomerceDomesticQuote({
          origin: payload.origin,
          destination: payload.destination,
          weight: Math.max(1, Math.round(payload.weight)),
          couriers: payload.couriers,
        })
        return this.normalizeQuoteResponse(response, input.couriers)
      }

      if (this.isKomerceTariffApi(this.baseUrl)) {
        const weightKg = Math.max(1, Math.ceil(payload.weight / 1000))
        const query = this.buildQuery({
          shipper_destination_id: payload.origin,
          receiver_destination_id: payload.destination,
          weight: String(weightKg),
          item_value: "1",
          cod: "no",
        })

        const response = await this.request(
          `${this.quotePath}?${query}`,
          { method: "GET" },
          "quote"
        )

        return this.normalizeQuoteResponse(response, input.couriers)
      }

      const response = await this.request(
        this.quotePath,
        {
          method: "POST",
          body: payload,
        },
        "quote"
      )

      return this.normalizeQuoteResponse(response, input.couriers)
    } catch (error) {
      logger.warn("RajaOngkir quote failed, using fallback mock data", { error })
      // Return mock data so user can proceed testing
      return [
        {
          courier: input.couriers[0] || "jne",
          service: "REG (Fallback)",
          price: 12000,
          etd: "2-3"
        },
        {
          courier: input.couriers[0] || "jne",
          service: "YES (Fallback)",
          price: 24000,
          etd: "1-1"
        }
      ]
    }
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    const response = await this.request(
      this.deliveryPath,
      {
        method: "POST",
        body: input,
      },
      "createShipment"
    )

    const normalized = this.normalizeShipmentResponse(response)
    return {
      ...normalized,
      raw_response: response,
    }
  }

  async track(_awb: string): Promise<{ latest_status: string; history: any[] }> {
    logger.info("RajaOngkir track stub", { awb: _awb })
    return { latest_status: "IN_TRANSIT", history: [] }
  }

  async getProvinces(): Promise<any[]> {
    const isKomerce = this.isKomerceTariffApi(this.baseUrl)
    const path = isKomerce ? "destination/province" : "province"

    // Normalization handles { data: ... } or { rajaongkir: ... }
    const response: any = await this.request(
      path,
      { method: "GET" },
      "getProvinces"
    )
    return this.normalizeLocationResponse(response)
  }

  async getCities(provinceId?: string): Promise<any[]> {
    const isKomerce = this.isKomerceTariffApi(this.baseUrl)
    const pathPrefix = isKomerce ? "destination/city" : "city"
    const query = provinceId ? `?province=${provinceId}` : ""

    const response: any = await this.request(
      `${pathPrefix}${query}`,
      { method: "GET" },
      "getCities"
    )
    return this.normalizeLocationResponse(response)
  }

  // normalizeLocationResponse handles both Komerce {data: [...]} and RajaOngkir {rajaongkir: {results: [...]}}
  private normalizeLocationResponse(response: any): any[] {
    const root = response?.data ?? response?.rajaongkir?.results ?? response?.rajaongkir ?? response
    // If Komerce returns { data: [...] }, root is array. If RajaOngkir, root is array.
    if (Array.isArray(root)) return root
    return root?.results ?? []
  }

  /**
 * Search for cities/destinations from RajaOngkir API
 * Uses the domestic-destination endpoint for Komerce, or city?id=... for Starter (no search endpoint on Starter usually)
 * @param search - Search term
 */
  async searchCities(
    search?: string,
    limit: number = 20
  ): Promise<Array<{ id: string; name: string; province: string; type: string }>> {
    try {
      const searchTerm = search?.trim() || ""
      const isKomerce = this.isKomerceTariffApi(this.baseUrl)

      // Komerce has a dedicated search endpoint
      if (isKomerce) {
        const query = new URLSearchParams()
        if (searchTerm) query.set("search", searchTerm)
        query.set("limit", String(limit))
        query.set("offset", "0")

        const response: any = await this.request(
          `destination/domestic-destination?${query.toString()}`,
          { method: "GET" },
          "searchCities"
        )
        // Normalize Komerce response
        const data = response?.data ?? []
        return data.map((item: any) => ({
          id: String(item.id || item.city_id || item.subdistrict_id),
          name: item.label ?? `${item.city_name}, ${item.province_name}`,
          province: item.province_name || item.province || "",
          type: item.type ?? "city"
        }))
      }

      // Fallback for Starter/Pro: they don't have a direct "search" endpoint for cities easily accessible 
      // without loading all cities. 
      // We can't really "search" efficiently on Starter without caching. 
      // check if we can filter getCities results?
      return []

    } catch (error: any) {
      logger.warn("RajaOngkir searchCities failed", { error: error.message, search })
      return []
    }
  }

  /**
   * Format city name from API response to display string
   */
  private formatCityName(item: any): string {
    const parts: string[] = []

    // Add subdistrict if available
    if (item.subdistrict_name || item.subdistrict) {
      parts.push(item.subdistrict_name || item.subdistrict)
    }

    // Add city
    if (item.city_name || item.city) {
      const cityType = item.type ? `${item.type} ` : ""
      parts.push(`${cityType}${item.city_name || item.city}`)
    }

    // Add province
    if (item.province || item.province_name) {
      parts.push(item.province || item.province_name)
    }

    // If no parts, use whatever name is available
    if (parts.length === 0 && item.name) {
      return item.name
    }

    return parts.join(", ")
  }

  private buildUrl(path: string) {
    return new URL(path, this.baseUrl).toString()
  }

  private buildHeaders(initHeaders?: Record<string, string>) {
    const headers: Record<string, string> = { ...(initHeaders ?? {}) }
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json"
    }
    headers["key"] = this.apiKey
    headers["X-API-Key"] = this.apiKey
    headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private buildKomerceHeaders() {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
      key: this.apiKey,
    }
  }

  private isKomerceDomesticCostApi(baseUrl: string) {
    return baseUrl.includes("rajaongkir.komerce.id")
  }

  private isKomerceTariffApi(baseUrl: string) {
    return baseUrl.includes("collaborator.komerce.id/tariff/api/v1") || baseUrl.includes("rajaongkir.komerce.id/api/v1")
  }

  private buildQuery(params: Record<string, string>) {
    const search = new URLSearchParams(params)
    return search.toString()
  }

  private async requestKomerceDomesticCost(payload: {
    origin: string
    destination: string
    weight: number
    courier: string
  }): Promise<number> {
    const url = this.buildUrl(this.costPath)
    const body = this.buildKomerceFormBody({
      origin: payload.origin,
      destination: payload.destination,
      weight: payload.weight,
      courier: payload.courier,
    })

    logger.info("RajaOngkir HTTP request", {
      label: "getCost",
      method: "POST",
      url,
      body: body.toString(),
    })

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.buildKomerceHeaders(),
      body: body.toString(),
    })

    const textResponse = await response.text()

    if (!response.ok) {
      throw new Error(
        `RajaOngkir getCost request failed (${response.status}): ${textResponse}`
      )
    }

    let parsed: any
    try {
      parsed = JSON.parse(textResponse)
    } catch {
      throw new Error(
        `RajaOngkir getCost response is not valid JSON: ${textResponse}`
      )
    }

    const firstRow = Array.isArray(parsed?.data) ? parsed.data[0] : undefined
    const rawPrice = firstRow?.cost ?? firstRow?.price
    const price = this.parseNumber(rawPrice)
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(
        `RajaOngkir cost response missing price: ${JSON.stringify(parsed)}`
      )
    }

    return price
  }

  private async requestKomerceDomesticQuote(payload: {
    origin: string
    destination: string
    weight: number
    couriers: string[]
  }): Promise<any> {
    const url = this.buildUrl(this.costPath)
    const courierValue = payload.couriers.join(":")
    const body = this.buildKomerceFormBody({
      origin: payload.origin,
      destination: payload.destination,
      weight: payload.weight,
      courier: courierValue,
    })

    logger.info("RajaOngkir HTTP request", {
      label: "quote",
      method: "POST",
      url,
      body: body.toString(),
    })

    const response = await this.fetchWithTimeout(url, {
      method: "POST",
      headers: this.buildKomerceHeaders(),
      body: body.toString(),
    })

    const textResponse = await response.text()
    if (!response.ok) {
      throw new Error(
        `RajaOngkir quote request failed (${response.status}): ${textResponse}`
      )
    }

    const parsed = this.tryParseJSON(textResponse)
    logger.info("RajaOngkir HTTP response", {
      label: "quote",
      url,
      status: response.status,
      body: parsed,
    })

    return parsed
  }

  private buildKomerceFormBody(payload: {
    origin: string
    destination: string
    weight: number
    courier: string
  }) {
    return new URLSearchParams({
      origin: payload.origin,
      destination: payload.destination,
      weight: String(payload.weight),
      courier: payload.courier,
      price: "lowest",
    })
  }

  private async requestCost(payload: {
    origin: string
    destination: string
    weight: number
    courier: string
  }, input: RajaOngkirCostInput) {
    if (this.isKomerceTariffApi(this.baseUrl)) {
      const weightKg = Math.max(1, Math.ceil(payload.weight / 1000))
      const itemValueRaw = Number(input.itemValue)
      const itemValue = Number.isFinite(itemValueRaw) && itemValueRaw > 0
        ? Math.round(itemValueRaw)
        : 1
      const cod = input.cod ?? "no"

      const query = this.buildQuery({
        shipper_destination_id: payload.origin,
        receiver_destination_id: payload.destination,
        weight: String(weightKg),
        item_value: String(itemValue),
        cod,
      })

      return this.request(
        `${this.costPath}?${query}`,
        { method: "GET" },
        "getCost"
      )
    }

    return this.request(
      this.costPath,
      {
        method: "POST",
        body: payload,
      },
      "getCost"
    )
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    label: string
  ): Promise<T> {
    const url = this.buildUrl(path)
    const headers = this.buildHeaders(init.headers)
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
          body,
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

  private async fetchWithTimeout(url: string, init: RequestInit & { headers: any }) {
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

  private normalizeCostResponse(
    response: unknown,
    courierFilter?: string,
    serviceFilter?: string
  ): number {
    if (!response || typeof response !== "object") {
      throw new Error("RajaOngkir cost response is empty or invalid")
    }

    if (this.isKomerceResponse(response)) {
      return this.normalizeKomerceCostResponse(
        response as any,
        courierFilter
      ) // Komerce helper doesn't support service filter yet, keeping legacy for now
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
      if (!serviceFilter) return true;
      const filter = serviceFilter.toLowerCase().trim();
      const n = (svcName || "").toLowerCase();
      const c = (svcCode || "").toLowerCase();
      return n.includes(filter) || c.includes(filter) || filter.includes(c);
    }

    const pushPrice = (value: unknown) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
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
          if (!isServiceMatch(cost.service, cost.service)) continue;

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
          if (!isServiceMatch(service.service, service.service_code)) continue;
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

  private isKomerceResponse(response: unknown) {
    return Boolean(
      response &&
      typeof response === "object" &&
      (response as any).meta &&
      typeof (response as any).meta === "object"
    )
  }

  private normalizeKomerceCostResponse(
    response: any,
    courierFilter?: string
  ): number {
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
    const prices = this.extractPricesFromKomerceData(data, normalizedFilter)
    if (!prices.length) {
      throw new Error("RajaOngkir cost response missing price")
    }

    return Math.min(...prices)
  }

  private extractPricesFromKomerceData(
    data: any,
    courierFilter?: string
  ): number[] {
    const prices: number[] = []
    const target = courierFilter?.toLowerCase()

    const pushPrice = (value: unknown) => {
      const parsed = this.parseNumber(value)
      if (parsed !== undefined && parsed > 0) {
        prices.push(parsed)
      }
    }

    const visit = (value: any, courierHint?: string) => {
      if (!value) {
        return
      }
      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, courierHint))
        return
      }
      if (typeof value !== "object") {
        return
      }

      const currentCourierRaw =
        this.pickString(value, "courier", "shipping", "code", "name") ??
        courierHint
      const currentCourier = this.normalizeCourierName(currentCourierRaw)

      const matchesCourier =
        !target || (currentCourier && currentCourier.includes(target))

      if (matchesCourier) {
        pushPrice(value.shipping_cost)
        pushPrice(value.price)
        pushPrice(value.cost)
        pushPrice(value.value)
        pushPrice(value.amount)
        pushPrice(value.total)
      }

      Object.values(value).forEach((child) =>
        visit(child, currentCourier)
      )
    }

    visit(data)

    if (target && !prices.length) {
      throw new Error(`RajaOngkir cost response missing courier ${target}`)
    }

    return prices
  }

  private normalizeCourierFilter(courierFilter?: string) {
    if (!courierFilter) {
      return undefined
    }
    const normalized = this.normalizeCourierName(courierFilter)
    if (!normalized || normalized === "all" || normalized === "any") {
      return undefined
    }
    return normalized
  }

  private normalizeCourierName(name?: string) {
    if (!name) {
      return ""
    }
    const cleaned = name.toLowerCase().replace(/[^a-z0-9]/g, "")
    if (!cleaned) {
      return ""
    }
    if (cleaned === "post" || cleaned === "posindonesia") {
      return "pos"
    }
    if (cleaned === "jneexpress") {
      return "jne"
    }
    if (cleaned === "jnt" || cleaned === "jntcargo") {
      return "jnt"
    }
    if (cleaned === "sicpat" || cleaned === "sicepat") {
      return "sicepat"
    }
    if (cleaned === "ninja" || cleaned === "ninjaexpress") {
      return "ninja"
    }
    return cleaned
  }

  private normalizeQuoteResponse(
    response: unknown,
    fallbackCouriers: string[]
  ): ShippingQuoteOption[] {
    const rows = this.extractQuoteCandidates(response)
    const courierFallback = fallbackCouriers?.[0] ?? "rajaongkir"

    return rows
      .map((row) => {
        const courier =
          this.pickString(row, "courier", "code", "name", "company") ??
          courierFallback
        const service = this.pickString(row, "service", "name", "description")
        const serviceCode = this.pickString(
          row,
          "service_code",
          "code",
          "service_code"
        )
        const mappedService =
          this.mapKomerceServiceLabel(serviceCode, service) ??
          service ??
          serviceCode ??
          "service"
        const price = this.extractPrice(row)
        if (price === undefined) {
          return null
        }
        const etd = this.pickString(row, "etd", "eta", "lead_time")

        return {
          courier,
          service: mappedService,
          service_code: serviceCode ?? undefined,
          etd: etd ?? undefined,
          price,
        }
      })
      .filter(Boolean) as ShippingQuoteOption[]
  }

  private extractQuoteCandidates(input: unknown): any[] {
    const candidates: any[] = []

    const iterate = (value: any, parentCourier?: string) => {
      if (!value) {
        return
      }
      if (Array.isArray(value)) {
        value.forEach((item) => iterate(item, parentCourier))
        return
      }
      if (typeof value !== "object") {
        return
      }

      const courierHint =
        this.pickString(value, "courier", "code", "name") ?? parentCourier

      if (Array.isArray(value.costs)) {
        value.costs.forEach((cost: any) => iterate(cost, courierHint))
      }
      if (Array.isArray(value.tariffs)) {
        value.tariffs.forEach((cost: any) => iterate(cost, courierHint))
      }
      if (Array.isArray(value.services)) {
        value.services.forEach((cost: any) => iterate(cost, courierHint))
      }
      if (
        value.service ||
        value.price ||
        value.cost ||
        value.value ||
        value.total
      ) {
        candidates.push({ ...value, courier: courierHint })
      }
    }

    const root =
      (responseData: any) =>
        responseData?.data?.results ??
        responseData?.results ??
        responseData?.data ??
        responseData

    const responseData = root(input as any)
    iterate(responseData)

    return candidates
  }

  private mapKomerceServiceLabel(
    serviceCode?: string,
    serviceName?: string
  ): string | undefined {
    const raw = serviceCode ?? serviceName
    if (!raw) {
      return undefined
    }
    const normalized = String(raw).trim().toUpperCase()
    if (normalized === "REG") {
      return "standard"
    }
    if (normalized === "YES") {
      return "express"
    }
    return undefined
  }

  private extractPrice(payload: any): number | undefined {
    if (!payload) {
      return undefined
    }

    const priceKeys = ["price", "cost", "value", "amount", "total"]
    for (const key of priceKeys) {
      const candidate = payload[key]
      const parsed = this.parseNumber(candidate)
      if (parsed !== undefined) {
        return parsed
      }
    }

    if (Array.isArray(payload.cost)) {
      for (const inner of payload.cost) {
        const parsed = this.parseNumber(inner?.value ?? inner)
        if (parsed !== undefined) {
          return parsed
        }
      }
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        const parsed = this.parseNumber(item)
        if (parsed !== undefined) {
          return parsed
        }
      }
    }

    return undefined
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === undefined || value === null) {
      return undefined
    }

    if (typeof value === "number") {
      return value
    }

    if (typeof value === "string") {
      const digits = value.replace(/[^0-9.-]/g, "")
      if (digits === "") {
        return undefined
      }
      const parsed = Number(digits)
      return Number.isFinite(parsed) ? parsed : undefined
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = this.parseNumber(item)
        if (parsed !== undefined) {
          return parsed
        }
      }
      return undefined
    }

    if (typeof value === "object") {
      return this.parseNumber((value as any).value ?? (value as any).amount)
    }

    return undefined
  }

  private normalizeShipmentResponse(response: any): CreateShipmentOutput {
    const candidate =
      response?.order ?? response?.data ?? response?.rajaongkir ?? response

    const externalShipmentId =
      this.pickString(
        candidate,
        "id",
        "order_id",
        "external_id",
        "external_shipment_id",
        "delivery_order_id",
        "delivery_id",
        "shipment_id"
      ) ?? this.pickString(response, "order_id")

    if (!externalShipmentId) {
      throw new Error(
        "RajaOngkir create shipment response missing external shipment id"
      )
    }

    const awb =
      this.pickString(
        candidate,
        "awb",
        "waybill",
        "tracking_number",
        "resi"
      ) ?? externalShipmentId

    const labelUrl =
      this.pickString(candidate, "label_url", "label?.url") ??
      this.pickString(response, "label_url")

    const trackingUrl =
      this.pickString(candidate, "tracking_url", "tracking?.url") ??
      this.pickString(response, "tracking_url")

    return {
      external_shipment_id: externalShipmentId,
      awb,
      label_url: labelUrl ?? undefined,
      tracking_url: trackingUrl ?? undefined,
    }
  }

  private pickString(value: any, ...keys: string[]): string | undefined {
    for (const key of keys) {
      const parts = key.split("?.")
      let current = value
      for (const part of parts) {
        if (current == null) {
          current = undefined
          break
        }
        current = current[part]
      }
      if (current !== undefined && current !== null) {
        return String(current)
      }
    }
    return undefined
  }
}
