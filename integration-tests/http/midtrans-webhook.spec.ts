import crypto from "crypto"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentSessionStatus } from "@medusajs/framework/utils"

process.env.MIDTRANS_SERVER_KEY = "test-server-key"
process.env.MIDTRANS_IS_PRODUCTION = "false"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /webhooks/midtrans", () => {
      it("updates payment session status to captured", async () => {
        const container = getContainer()
        const paymentModuleService = container.resolve(Modules.PAYMENT)

        const collection = await paymentModuleService.createPaymentCollections({
          currency_code: "idr",
          amount: 10000,
        })

        const session = await paymentModuleService.createPaymentSession(
          collection.id,
          {
            provider_id: "pp_midtrans",
            amount: 10000,
            currency_code: "idr",
            data: {},
          }
        )

        const payload: Record<string, any> = {
          order_id: session.id,
          status_code: "200",
          gross_amount: "10000",
          transaction_status: "settlement",
          transaction_id: "tx_123",
          fraud_status: "accept",
          status_message: "OK",
          transaction_time: new Date().toISOString(),
        }

        const raw = `${payload.order_id}${payload.status_code}${payload.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`
        payload.signature_key = crypto.createHash("sha512").update(raw).digest("hex")

        const response = await api.post(`/webhooks/midtrans`, payload)

        expect(response.status).toEqual(200)

        const updated = await paymentModuleService.retrievePaymentSession(
          session.id
        )
        expect(updated.status).toEqual(PaymentSessionStatus.CAPTURED)
        expect(updated.data).toHaveProperty(
          "midtrans_transaction_status",
          "settlement"
        )
      })
    })
  },
})
