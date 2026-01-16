import supertest from "supertest"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ApiKeyType, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import seedDemoData from "../../../src/scripts/seed"
import { asValue } from "awilix"

const BASE_URL = process.env.TEST_BASE_URL || ""
const PROVIDER_ID = "pp_midtrans"

process.env.MIDTRANS_SERVER_KEY = "test-server-key"
process.env.MIDTRANS_IS_PRODUCTION = "false"

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
  env: {},
  testSuite: ({ api, getContainer }) => {
    describe("complete-order-with-reservation workflow", () => {
      let publishableKey = "test_pk"

      const completeCartRequest = async (cartId: string, idempotencyKey: string) => {
        if (BASE_URL) {
          return supertest(BASE_URL)
            .post(`/store/carts/${cartId}/complete`)
            .set("Idempotency-Key", idempotencyKey)
            .set("x-publishable-api-key", publishableKey)
            .send({})
        }
        try {
          return await api.post(
            `/store/carts/${cartId}/complete`,
            {},
            {
              headers: {
                "Idempotency-Key": idempotencyKey,
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
      const midtransProvider = {
        createSnapSession: jest.fn().mockResolvedValue({
          token: "snap-token-123",
          redirect_url: "https://snap.test/redirect",
        }),
        initiatePayment: jest.fn().mockResolvedValue({
          data: {},
          status: "pending",
        }),
        updatePayment: jest.fn().mockImplementation(({ data }: any) => ({
          data,
          status: "pending",
        })),
      }

      beforeAll(async () => {
        const container = getContainer()
        await seedDemoData({ container } as any)
        publishableKey = await ensurePublishableKey(container)

        container.register(PROVIDER_ID, asValue(midtransProvider))

        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: regions } = await query.graph({
          entity: "region",
          fields: ["id", "currency_code"],
          filters: {},
          options: { take: 1 },
        })
        region = regions[0]

        const { data: stockLocations } = await query.graph({
          entity: "stock_location",
          fields: ["id"],
          filters: {},
          options: { take: 1 },
        })
        stockLocationId = stockLocations?.[0]?.id

        const { data: salesChannels } = await query.graph({
          entity: "sales_channel",
          fields: ["id"],
          filters: {},
          options: { take: 1 },
        })
        salesChannelId = salesChannels?.[0]?.id

        const { data: variants } = await query.graph({
          entity: "product_variant",
          fields: ["id"],
          filters: {},
          options: { take: 1 },
        })
        variantId = variants[0].id

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

        levelId = variantInventory[0].inventory?.location_levels?.[0].id
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

        expect(response.status).toBe(200)
        const body = response.data ?? response.body
        expect(body?.data?.reservations?.length).toBeGreaterThan(0)
        expect(body?.data?.payment_session).toMatchObject({
          token: "snap-token-123",
          redirect_url: "https://snap.test/redirect",
        })
        expect(midtransProvider.createSnapSession).toHaveBeenCalled()
      })
    })
  },
})
