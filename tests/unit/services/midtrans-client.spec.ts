import crypto from "crypto"
import { MidtransClient } from "../../../src/services/midtrans-client"

const ORIGINAL_ENV = { ...process.env }

describe("MidtransClient", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      MIDTRANS_SERVER_KEY: "test-server",
      MIDTRANS_IS_PRODUCTION: "false",
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test("createSnapTransaction posts to sandbox snap URL and returns parsed token and redirect_url", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: "snap-token",
        redirect_url: "https://redirect.test",
      }),
    })

    // @ts-expect-error override global fetch for tests
    global.fetch = fetchMock

    const client = new MidtransClient()
    const payload = { order_id: "order-1", gross_amount: 10000 }

    const result = await client.createSnapTransaction(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.sandbox.midtrans.com/snap/v1/transactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Basic"),
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      })
    )
    expect(result).toEqual({
      token: "snap-token",
      redirect_url: "https://redirect.test",
    })
  })

  test("createSnapTransaction uses production base URL when MIDTRANS_IS_PRODUCTION is true", async () => {
    process.env.MIDTRANS_IS_PRODUCTION = "true"

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "prod-token", redirect_url: "https://prod" }),
    })

    // @ts-expect-error override global fetch for tests
    global.fetch = fetchMock

    const client = new MidtransClient()
    await client.createSnapTransaction({ order_id: "order-2", gross_amount: 5000 })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://app.midtrans.com/snap/v1/transactions",
      expect.any(Object)
    )
  })

  test("createSnapTransaction throws a clear error on non-200 responses", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "server error",
    })

    // @ts-expect-error override global fetch for tests
    global.fetch = fetchMock

    const client = new MidtransClient()

    await expect(
      client.createSnapTransaction({ order_id: "order-3", gross_amount: 1000 })
    ).rejects.toThrow("Midtrans error: 500 server error")
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  test("verifyWebhookSignature returns true when signature matches expected SHA512", () => {
    const client = new MidtransClient()
    const payload = {
      order_id: "order-123",
      status_code: "200",
      gross_amount: "15000",
    }
    const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
    const signature_key = crypto.createHash("sha512").update(raw).digest("hex")

    const result = client.verifyWebhookSignature({ ...payload, signature_key })

    expect(result).toBe(true)
  })

  test("verifyWebhookSignature returns false for invalid signatures", () => {
    const client = new MidtransClient()
    const payload = {
      order_id: "order-123",
      status_code: "200",
      gross_amount: "15000",
      signature_key: "invalid",
    }

    expect(client.verifyWebhookSignature(payload)).toBe(false)
  })
})
