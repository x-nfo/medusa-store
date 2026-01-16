import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { MidtransClient } from "../../services/midtrans-client"
import { logger } from "../../services/logger"

type MidtransOptions = {
  isProduction?: boolean
  serverKey?: string
  clientKey?: string
}

type MidtransCustomer = {
  name?: string
  email?: string
  phone?: string
}

type MidtransItem = {
  name: string
  price: number
  quantity: number
}

export const mapMidtransStatus = (
  status?: string,
  fraudStatus?: string
): { action: PaymentActions; sessionStatus?: PaymentSessionStatus } => {
  if (!status) {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  if (status === "capture" || status === "settlement") {
    return {
      action: PaymentActions.SUCCESSFUL,
      sessionStatus: PaymentSessionStatus.CAPTURED,
    }
  }

  if (status === "pending") {
    return {
      action: PaymentActions.PENDING,
      sessionStatus: PaymentSessionStatus.PENDING,
    }
  }

  if (status === "deny" || status === "expire" || status === "cancel") {
    return {
      action: PaymentActions.FAILED,
      sessionStatus: PaymentSessionStatus.ERROR,
    }
  }

  if (status === "challenge" || fraudStatus === "challenge") {
    return {
      action: PaymentActions.REQUIRES_MORE,
      sessionStatus: PaymentSessionStatus.REQUIRES_MORE,
    }
  }

  return { action: PaymentActions.NOT_SUPPORTED }
}

export class MidtransPaymentService extends AbstractPaymentProvider<MidtransOptions> {
  static identifier = "midtrans"

  private client: MidtransClient

  constructor(container: Record<string, unknown>, options: MidtransOptions) {
    super(container, options)
    this.client = new MidtransClient()
  }

  static validateOptions(options: Record<string, any>) {
    const serverKey = options?.serverKey || process.env.MIDTRANS_SERVER_KEY
    if (!serverKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MIDTRANS_SERVER_KEY is required"
      )
    }
  }

  /**
   * V1: Create Snap transaction, return token + redirect_url.
   */
  async createSnapSession(params: {
    order_id: string
    gross_amount: number
    customer?: MidtransCustomer
    items?: MidtransItem[]
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

  verifyWebhookSignature(payload: Record<string, unknown>) {
    return this.client.verifyWebhookSignature(payload as any)
  }

  handleWebhook(payload: Record<string, unknown>) {
    const order_id = String(payload.order_id ?? "")
    const mapping = mapMidtransStatus(
      String(payload.transaction_status ?? ""),
      String(payload.fraud_status ?? "")
    )
    return { order_id, status: mapping.action }
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const sessionId = String(input.data?.session_id ?? "")
    return {
      id: sessionId || `midtrans_${Date.now()}`,
      status: PaymentSessionStatus.PENDING,
      data: {
        ...(input.data ?? {}),
        midtrans_order_id: sessionId || input.data?.midtrans_order_id,
      },
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const status = String(
      input.data?.midtrans_transaction_status ??
        input.data?.transaction_status ??
        ""
    )

    if (status === "settlement" || status === "capture") {
      return {
        data: input.data ?? {},
        status: PaymentSessionStatus.CAPTURED,
      }
    }

    if (status === "pending") {
      return {
        data: input.data ?? {},
        status: PaymentSessionStatus.PENDING,
      }
    }

    if (status === "challenge") {
      return {
        data: input.data ?? {},
        status: PaymentSessionStatus.REQUIRES_MORE,
      }
    }

    if (status === "deny" || status === "expire" || status === "cancel") {
      return {
        data: input.data ?? {},
        status: PaymentSessionStatus.ERROR,
      }
    }

    return {
      data: input.data ?? {},
      status: PaymentSessionStatus.PENDING,
    }
  }

  async capturePayment(_input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: _input.data ?? {} }
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Midtrans refund is not supported in V1"
    )
  }

  async cancelPayment(_input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Midtrans cancel is not supported in V1"
    )
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const orderId =
      (input.data?.midtrans_order_id as string | undefined) ||
      (input.data?.order_id as string | undefined) ||
      (input.data?.session_id as string | undefined)

    if (!orderId) {
      return { status: PaymentSessionStatus.PENDING, data: input.data ?? {} }
    }

    const status = await this.client.getTransactionStatus(orderId)
    const mapping = mapMidtransStatus(status.transaction_status, status.fraud_status)

    return {
      status: mapping.sessionStatus ?? PaymentSessionStatus.PENDING,
      data: {
        ...(input.data ?? {}),
        midtrans_order_id: status.order_id ?? orderId,
        midtrans_transaction_id: status.transaction_id,
        midtrans_transaction_status: status.transaction_status,
        midtrans_fraud_status: status.fraud_status,
        midtrans_status_code: status.status_code,
        midtrans_status_message: status.status_message,
        midtrans_transaction_time: status.transaction_time,
      },
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = payload.data as Record<string, unknown>
    if (!this.verifyWebhookSignature(data)) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid Midtrans signature"
      )
    }

    const orderId = String(data.order_id ?? "")
    const mapping = mapMidtransStatus(
      String(data.transaction_status ?? ""),
      String(data.fraud_status ?? "")
    )
    const amount = Number(data.gross_amount ?? 0)

    return {
      action: mapping.action,
      data: orderId
        ? {
            session_id: orderId,
            amount,
          }
        : undefined,
    }
  }
}
