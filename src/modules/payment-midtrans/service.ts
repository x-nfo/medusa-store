import { MidtransClient } from "../../services/midtrans-client"
import { logger } from "../../services/logger"

export class MidtransPaymentService {
  static readonly identifier = "pp_midtrans"

  private client: MidtransClient

  constructor() {
    this.client = new MidtransClient()
  }

  /**
   * V1: Create Snap transaction, return token + redirect_url.
   * Integrasi ke Medusa payment session akan di-wire pada tahap berikutnya.
   */
  async createSnapSession(params: {
    order_id: string
    gross_amount: number
    customer?: { name?: string; email?: string; phone?: string }
    items?: Array<{ name: string; price: number; quantity: number }>
    finish_url?: string
  }) {
    logger.info("createSnapSession", { order_id: params.order_id })

    const [first_name, ...rest] = (params.customer?.name || "").split(" ")
    const last_name = rest.join(" ") || undefined

    return this.client.createSnapTransaction({
      order_id: params.order_id,
      gross_amount: params.gross_amount,
      customer_details: {
        first_name,
        last_name,
        email: params.customer?.email,
        phone: params.customer?.phone,
      },
      item_details: params.items?.map((i, idx) => ({
        id: String(idx),
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      callbacks: params.finish_url ? { finish: params.finish_url } : undefined,
    })
  }

  verifyWebhook(payload: any) {
    return this.client.verifyWebhookSignature(payload)
  }
}
