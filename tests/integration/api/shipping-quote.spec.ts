import supertest from "supertest"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ApiKeyType, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "../../../src/modules/fulfillment-rajaongkir"

const BASE_URL = process.env.TEST_BASE_URL || ""

process.env.RAJAONGKIR_API_KEY = "test-api-key"
process.env.RAJAONGKIR_BASE_URL = "https://api.rajaongkir.test/"
process.env.RAJAONGKIR_ORIGIN_CITY_ID = "501"

jest.setTimeout(30_000)

const ensurePublishableKey = async (container: any): Promise<string> => {
  const apiKeyModuleService = container.resolve(Modules.API_KEY)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: channels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: {},
    options: { take: 1 },
  })
  const salesChannelId = channels?.[0]?.id

  const created = await apiKeyModuleService.createApiKeys({
    title: "test-pk",
    type: ApiKeyType.PUBLISHABLE,
    created_by: "test",
  })

  if (salesChannelId) {
    const { linkSalesChannelsToApiKeyWorkflow } = await import(
      "@medusajs/core-flows"
    )
    // Use core workflow to link publishable key to sales channel to satisfy store auth middleware
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: {
        id: created.id,
        add: [salesChannelId],
      },
    })
  }

  return created.token
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/shipping/quote", () => {
      const post = async (path: string, body: any) => {
        if (BASE_URL) {
          return supertest(BASE_URL)
            .post(path)
            .set("x-publishable-api-key", publishableKey)
            .send(body)
        }
        try {
          return await api.post(path, body, {
            headers: { "x-publishable-api-key": publishableKey },
          })
        } catch (err: any) {
          return err.response
        }
      }
      let quoteSpy: jest.SpyInstance
      let publishableKey = "test_pk"

      beforeAll(async () => {
        quoteSpy = jest
          .spyOn(RajaOngkirFulfillmentService.prototype, "quoteRates")
          .mockResolvedValue([
            {
              courier: "jne",
              service: "REG",
              price: 12000,
            },
            {
              courier: "jnt",
              service: "EZ",
              price: 15000,
              etd: "2-3",
            },
          ])

        // create a valid publishable key linked to a sales channel
        const container = getContainer()
        publishableKey = await ensurePublishableKey(container)
      })

      afterAll(() => {
        quoteSpy?.mockRestore()
      })

      it("returns shipping options for valid payload", async () => {
        const response = await post("/store/shipping/quote", {
          destination_city_id: "574",
          weight_grams: 1000,
          couriers: ["jne", "jnt"],
        })

        expect(response.status).toBe(200)
        const body = response.data ?? response.body
        expect(body.options).toEqual([
          { courier: "jne", service: "REG", price: 12000 },
          { courier: "jnt", service: "EZ", price: 15000, etd: "2-3" },
        ])
        expect(quoteSpy).toHaveBeenCalledWith({
          destination_city_id: "574",
          weight_grams: 1000,
          couriers: ["jne", "jnt"],
        })
      })

      it("returns 400 for invalid payload", async () => {
        const response = await post("/store/shipping/quote", {
          weight_grams: 0,
        })

        expect(response.status).toBeGreaterThanOrEqual(400)
      })
    })
  },
})
