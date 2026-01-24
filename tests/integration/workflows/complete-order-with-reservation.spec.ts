import supertest from "supertest"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ApiKeyType, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import seedDemoData from "../../../src/scripts/seed"
import { asValue } from "awilix"

const BASE_URL = process.env.TEST_BASE_URL || ""
const PROVIDER_ID = "pp_system_default"

jest.setTimeout(120_000)

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
    title: "workflow-pk",
    type: ApiKeyType.PUBLISHABLE,
    created_by: "workflow-test",
  })

  if (salesChannelId) {
    const { linkSalesChannelsToApiKeyWorkflow } = await import("@medusajs/core-flows")
    await linkSalesChannelsToApiKeyWorkflow(container).run({
      input: { id: created.id, add: [salesChannelId] },
    })
  }

  return created.token
}

const buildCartWithVariant = async (
  container: any,
  {
    variantId,
    region,
    levelId,
    stockLocationId,
    salesChannelId,
    quantity,
    stock,
  }: {
    variantId: string
    region: { id: string; currency_code: string }
    levelId: string
    stockLocationId?: string
    salesChannelId?: string
    quantity: number
    stock: number
  }
) => {
  const cartModuleService = container.resolve(Modules.CART)
  const paymentModuleService = container.resolve(Modules.PAYMENT)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const cart = await cartModuleService.createCarts({
    region_id: region.id,
    currency_code: region.currency_code,
    sales_channel_id: salesChannelId,
  })

  await cartModuleService.addLineItems(cart.id, [
    {
      title: "Test Item",
      product_title: "Test Product",
      requires_shipping: true,
      variant_id: variantId,
      quantity,
      unit_price: 1000,
    },
  ])

  const paymentCollection = await paymentModuleService.createPaymentCollections({
    currency_code: region.currency_code,
    amount: quantity * 1000,
  })

  await link.create({
    [Modules.CART]: { cart_id: cart.id },
    [Modules.PAYMENT]: { payment_collection_id: paymentCollection.id },
  })

  return { cart }
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {
    MIDTRANS_SERVER_KEY: "test-server-key",
    MIDTRANS_IS_PRODUCTION: "false",
    // Ensure config loads properly
    POSTGRES_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    STORE_CORS: "http://localhost:9000",
    ADMIN_CORS: "http://localhost:9000",
    AUTH_CORS: "http://localhost:9000",
  },
  testSuite: ({ api, getContainer }) => {
    describe("complete-order-with-reservation workflow", () => {
      let publishableKey = "test_pk"

      const completeCartRequest = async (cartId: string, idempotency_key: string) => {
        if (BASE_URL) {
          return supertest(BASE_URL)
            .post(`/store/carts/${cartId}/complete`)
            .set("Idempotency-Key", idempotency_key)
            .set("x-publishable-api-key", publishableKey)
            .send({})
        }
        try {
          return await api.post(
            `/store/carts/${cartId}/complete`,
            {},
            {
              headers: {
                "Idempotency-Key": idempotency_key,
                "x-publishable-api-key": publishableKey,
              },
            }
          )
        } catch (err: any) {
          return err.response
        }
      }

      let variantId: string
      let region: { id: string; currency_code: string }
      let levelId: string
      let stockLocationId: string
      let salesChannelId: string

      beforeAll(async () => {
        try {
          const container = getContainer()
          await seedDemoData({ container } as any)
          publishableKey = await ensurePublishableKey(container)

          const paymentModuleService = container.resolve(Modules.PAYMENT)
          jest.spyOn(paymentModuleService, "createPaymentSession").mockResolvedValue({
            id: "pay_sess_mock",
            data: {
              token: "snap-token-123",
              redirect_url: "https://snap.test/redirect",
            },
            amount: 100,
            currency_code: "usd",
            provider_id: "pp_system_default",
            status: "pending",
            created_at: new Date(),
            updated_at: new Date(),
          } as any)

          const query = container.resolve(ContainerRegistrationKeys.QUERY)

          try {
            const { data: regions } = await query.graph({
              entity: "region",
              fields: ["id", "currency_code"],
              filters: {},
              options: { take: 1 },
            })
            region = regions[0]

            const { updateRegionsWorkflow } = await import("@medusajs/medusa/core-flows")
            await updateRegionsWorkflow(container).run({
              input: {
                selector: { id: region.id },
                update: {
                  payment_providers: ["pp_system_default"]
                }
              }
            })
          } catch (e) { console.error("Region query/update failed", e) }

          try {
            const { data: stockLocations } = await query.graph({
              entity: "stock_location",
              fields: ["id"],
              filters: {},
              options: { take: 1 },
            })
            stockLocationId = stockLocations?.[0]?.id
          } catch (e) { console.error("Stock location query failed", e) }

          try {
            const { data: salesChannels } = await query.graph({
              entity: "sales_channel",
              fields: ["id"],
              filters: {},
              options: { take: 1 },
            })
            salesChannelId = salesChannels?.[0]?.id
          } catch (e) { console.error("Sales channel query failed", e) }

          try {
            const { data: variants } = await query.graph({
              entity: "product_variant",
              fields: ["id"],
              filters: {},
              options: { take: 1 },
            })
            if (!variants || variants.length === 0) {
              console.error("No variants found after seeding!")
              variantId = "variant_dummy"
            } else {
              console.log("Variants found:", JSON.stringify(variants, null, 2))
              variantId = variants[0].id
            }
          } catch (e) { console.error("Variant query failed", e) }

          try {
            const { data: variantInventory } = await query.graph({
              entity: "product_variant_inventory_item",
              fields: [
                "inventory_item_id",
                "inventory.location_levels.id",
                "inventory.location_levels.location_id",
              ],
              filters: { variant_id: variantId },
              options: { take: 1 },
            })
            levelId = variantInventory?.[0]?.inventory?.location_levels?.[0]?.id
          } catch (e) { console.error("Inventory query failed", e) }

        } catch (e) {
          console.error("Setup failed", e)
        }
      })

      it("creates reservations and midtrans snap session via API", async () => {
        const container = getContainer()
        const { cart } = await buildCartWithVariant(container, {
          stock: 5,
          quantity: 2,
          variantId,
          region,
          levelId,
          stockLocationId,
          salesChannelId,
        })

        const response = await completeCartRequest(cart.id, `itest-${cart.id}`)

        const body = response.data ?? response.body
        expect(response.status).toBe(200)
        expect(body?.data?.reservations?.length).toBeGreaterThan(0)
        expect(body?.data?.payment_session).toMatchObject({
          data: {
            token: "snap-token-123",
            redirect_url: "https://snap.test/redirect",
          }
        })
      })
    })
  },
})
