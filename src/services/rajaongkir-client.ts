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
}

export class RajaOngkirClient {
  private apiKey: string
  private baseUrl: string

  constructor() {
    const key = process.env.RAJAONGKIR_API_KEY
    if (!key) throw new Error("RAJAONGKIR_API_KEY is required")
    this.apiKey = key

    // TODO: set ke base URL enterprise Anda
    this.baseUrl = process.env.RAJAONGKIR_BASE_URL || "https://api.rajaongkir.com"
  }

  async quote(input: ShippingQuoteInput): Promise<ShippingQuoteOption[]> {
    logger.info("RajaOngkir quote", input)

    // TODO: sesuaikan endpoint enterprise untuk ongkir real-time
    // Sementara return placeholder agar FE bisa dikembangkan dulu
    return [
      {
        courier: input.couriers[0] || "jne",
        service: "REG",
        service_code: "REG",
        etd: "2-3",
        price: 20000,
      },
    ]
  }

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentOutput> {
    logger.info("RajaOngkir createShipment", { order_id: input.order_id })

    // TODO: call delivery/order enterprise endpoint untuk generate AWB/label
    // Placeholder:
    return {
      external_shipment_id: `ro_${input.order_id}`,
      awb: `AWB-${Date.now()}`,
      label_url: "https://example.com/label.pdf",
      tracking_url: "https://example.com/track",
    }
  }

  async track(awb: string): Promise<{ latest_status: string; history: any[] }> {
    logger.info("RajaOngkir track", { awb })
    // TODO: call tracking endpoint
    return { latest_status: "IN_TRANSIT", history: [] }
  }
}
