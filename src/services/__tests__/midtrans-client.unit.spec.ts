import crypto from "crypto"
import { MidtransClient } from "../midtrans-client"

describe("MidtransClient.verifyWebhookSignature", () => {
  beforeAll(() => {
    process.env.MIDTRANS_SERVER_KEY = "test-server-key"
  })

  it("returns true for valid signature", () => {
    const client = new MidtransClient()
    const orderId = "order_123"
    const statusCode = "200"
    const grossAmount = "10000"
    const raw = `${orderId}${statusCode}${grossAmount}${process.env.MIDTRANS_SERVER_KEY}`
    const signature = crypto.createHash("sha512").update(raw).digest("hex")

    const ok = client.verifyWebhookSignature({
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: signature,
      transaction_status: "settlement",
    })

    expect(ok).toEqual(true)
  })

  it("returns false for invalid signature", () => {
    const client = new MidtransClient()
    const ok = client.verifyWebhookSignature({
      order_id: "order_123",
      status_code: "200",
      gross_amount: "10000",
      signature_key: "bad",
      transaction_status: "settlement",
    })

    expect(ok).toEqual(false)
  })
})
