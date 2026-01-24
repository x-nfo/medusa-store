import supertest from "supertest"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ApiKeyType, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "../../../src/modules/fulfillment-rajaongkir"

const BASE_URL = process.env.TEST_BASE_URL || ""

process.env.RAJAONGKIR_API_KEY = "test-api-key"
process.env.RAJAONGKIR_BASE_URL = "https://api.rajaongkir.test/"
process.env.RAJAONGKIR_ORIGIN_CITY_ID = "501"

jest.setTimeout(60_000)

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

const ensureShippingOptions = async (container: any) => {
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
  const storeModule = container.resolve(Modules.STORE)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  const {
    createShippingOptionsWorkflow,
    createShippingProfilesWorkflow,
    createStockLocationsWorkflow,
    linkSalesChannelsToStockLocationWorkflow
  } = await import("@medusajs/medusa/core-flows")

  // 1. Ensure Stock Location & Link to Sales Channel
  // (Required for Fulfillment Set to be valid for the sales channel context)
  const [store] = await storeModule.listStores()
  const [salesChannel] = await salesChannelModule.listSalesChannels({}, { take: 1 })

  if (!salesChannel) return

  let stockLocationId = store.default_location_id

  if (!stockLocationId) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [{ name: "Test Location", address: { city: "Jakarta", country_code: "ID", address_1: "Test St" } }]
      }
    })
    stockLocationId = result[0].id
  }

  // Link SC to Location
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocationId, add: [salesChannel.id] }
  })

  // 2. Ensure Shipping Profile
  const profiles = await fulfillmentModule.listShippingProfiles({ type: "default" })
  let profileId = profiles[0]?.id

  if (!profileId) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default", type: "default" }] }
    })
    profileId = result[0].id
  }

  // 3. Ensure Fulfillment Set & Service Zone
  // Check if our provider "rajaongkir" is available/registered? 
  // Integration tests usually load config, so "rajaongkir" provider should be there if medusa-config is loaded.

  // Create Set
  const set = await fulfillmentModule.createFulfillmentSets({
    name: "Test Delivery",
    type: "shipping",
    service_zones: [{
      name: "Indonesia",
      geo_zones: [{ type: "country", country_code: "id" }]
    }]
  })

  // Link Set to Location
  const remoteLink = container.resolve(ContainerRegistrationKeys.LINK)
  await remoteLink.create([
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_set_id: set.id }
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "rajaongkir_rajaongkir" }
    }
  ])

  // 4. Create Shipping Options
  const serviceZoneId = set.service_zones[0].id

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "JNE Regular",
        price_type: "calculated",
        provider_id: "rajaongkir_rajaongkir",
        service_zone_id: serviceZoneId,
        shipping_profile_id: profileId,
        type: { label: "Regular", code: "regular", description: "" },
        data: { id: "jne-reg" }, // Matches route logic
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq"
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq"
          }
        ]
      },
      {
        name: "J&T EZ",
        price_type: "calculated",
        provider_id: "rajaongkir_rajaongkir",
        service_zone_id: serviceZoneId,
        shipping_profile_id: profileId,
        type: { label: "Express", code: "express", description: "" },
        data: { id: "jnt-ez" }, // Matches route logic
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq"
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq"
          }
        ]
      }
    ] as any
  })
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
        await ensureShippingOptions(container)
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
        expect(body.options).toEqual(expect.arrayContaining([
          expect.objectContaining({ courier: "jne", service: "REG", price: 12000 }),
          expect.objectContaining({ courier: "jnt", service: "EZ", price: 15000, etd: "2-3" }),
        ]))
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
