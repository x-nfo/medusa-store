import crypto from "crypto"
import { logger } from "./logger"

export type MidtransSnapRequest = {
  order_id: string
  gross_amount: number
  customer_details?: {
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
  }
  item_details?: Array<{
    id?: string
    name: string
    price: number
    quantity: number
  }>
  enabled_payments?: string[]
  callbacks?: {
    finish?: string
  }
}

export type MidtransSnapResponse = {
  token: string
  redirect_url: string
}

export type MidtransWebhookPayload = {
  transaction_status: string
  fraud_status?: string
  order_id: string
  transaction_id?: string
  status_code?: string
  gross_amount?: string
  signature_key?: string
  payment_type?: string
}

export class MidtransClient {
  private serverKey: string
  private baseUrl: string

  constructor() {
    const serverKey = process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY is required")
    this.serverKey = serverKey
    this.baseUrl = process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com"
  }

  private authHeader() {
    const token = Buffer.from(`${this.serverKey}:`).toString("base64")
    return `Basic ${token}`
  }

  async createSnapTransaction(payload: MidtransSnapRequest): Promise<MidtransSnapResponse> {
    const url = `${this.baseUrl}/snap/v1/transactions`
    logger.info("Midtrans create snap transaction", { url, order_id: payload.order_id })

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader(),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Midtrans Snap error: ${res.status} ${text}`)
    }

    return (await res.json()) as MidtransSnapResponse
  }

  /**
   * Minimal verification helper.
   * Midtrans signature_key biasanya = SHA512(order_id + status_code + gross_amount + serverKey)
   * Pastikan Anda sesuaikan dengan docs Midtrans Anda.
   */
  verifyWebhookSignature(payload: MidtransWebhookPayload): boolean {
    try {
      const { order_id, status_code, gross_amount, signature_key } = payload
      if (!order_id || !status_code || !gross_amount || !signature_key) return false

      const raw = `${order_id}${status_code}${gross_amount}${this.serverKey}`
      const expected = crypto.createHash("sha512").update(raw).digest("hex")
      return expected === signature_key
    } catch (e) {
      logger.warn("verifyWebhookSignature failed", e)
      return false
    }
  }
}
