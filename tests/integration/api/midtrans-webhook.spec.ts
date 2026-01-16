import crypto from "crypto"
import supertest from "supertest"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, PaymentSessionStatus } from "@medusajs/framework/utils"

const BASE_URL = process.env.TEST_BASE_URL || ""

process.env.MIDTRANS_SERVER_KEY = "test-server-key"
process.env.MIDTRANS_IS_PRODUCTION = "false"

jest.setTimeout(60_000)

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /webhooks/midtrans", () => {
      const post = async (path: string, body: any) => {
        if (BASE_URL) {
          return supertest(BASE_URL).post(path).send(body)
        }
        try {
          return await api.post(path, body)
        } catch (err: any) {
          return err.response
        }
      }

      it("marks payment session as captured on settlement webhook", async () => {
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

        const response = await post(`/webhooks/midtrans`, payload)

        expect(response.status).toEqual(200)
        const body = response.body ?? response.data
        expect(body).toHaveProperty("status", "OK")

        const updated = await paymentModuleService.retrievePaymentSession(session.id)
        expect(updated.status).toEqual(PaymentSessionStatus.CAPTURED)
        expect(updated.data).toMatchObject({
          midtrans_transaction_status: "settlement",
          midtrans_transaction_id: "tx_123",
        })
      })

      it("rejects webhook with invalid signature and keeps status unchanged", async () => {
        const container = getContainer()
        const paymentModuleService = container.resolve(Modules.PAYMENT)

        const collection = await paymentModuleService.createPaymentCollections({
          currency_code: "idr",
          amount: 5000,
        })

        const session = await paymentModuleService.createPaymentSession(
          collection.id,
          {
            provider_id: "pp_midtrans",
            amount: 5000,
            currency_code: "idr",
            data: {},
          }
        )

        const invalidPayload = {
          order_id: session.id,
          status_code: "200",
          gross_amount: "5000",
          transaction_status: "settlement",
          signature_key: "wrong-signature",
        }

        const response = await post(`/webhooks/midtrans`, invalidPayload)

        expect(response.status).toBe(401)

        const current = await paymentModuleService.retrievePaymentSession(session.id)
        expect(current.status).toBe(PaymentSessionStatus.PENDING)
      })
    })
  },
})
