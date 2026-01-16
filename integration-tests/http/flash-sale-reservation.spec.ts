import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import seedDemoData from "../../src/scripts/seed"

process.env.MIDTRANS_SERVER_KEY = "test-server-key"
process.env.MIDTRANS_IS_PRODUCTION = "false"

jest.setTimeout(120_000)

const buildCartWithVariant = async (
  container: any,
  {
    stock,
    quantity,
    variantId,
    region,
    levelId,
  }: {
    stock: number
    quantity: number
    variantId: string
    region: { id: string; currency_code: string }
    levelId: string
    updateStock?: boolean
  }
) => {
  const cartModuleService = container.resolve(Modules.CART)
  const paymentModuleService = container.resolve(Modules.PAYMENT)
  const inventoryService = container.resolve(Modules.INVENTORY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  if (levelId && stock !== undefined && stock !== null && updateStock !== false) {
    await inventoryService.updateInventoryLevels({
      id: levelId,
      stocked_quantity: stock,
      incoming_quantity: 0,
    })
  }

  const cart = await cartModuleService.createCart({
    region_id: region.id,
    currency_code: region.currency_code,
  })

  await cartModuleService.addLineItems({
    cart_id: cart.id,
    variant_id: variantId,
    quantity,
    unit_price: 1000,
  })

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
    describe("Flash sale reservation checkout", () => {
      let variantId: string
      let region: { id: string; currency_code: string }
      let levelId: string

      beforeAll(async () => {
        const container = getContainer()
        await seedDemoData({ container } as any)

        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        const { data: regions } = await query.graph({
          entity: "region",
          fields: ["id", "currency_code"],
          filters: {},
          options: { take: 1 },
        })
        region = regions[0]

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

      it("reserves stock and returns payment session", async () => {
        const container = getContainer()
        const { cart } = await buildCartWithVariant(container, {
          stock: 5,
          quantity: 2,
          variantId,
          region,
          levelId,
        })

        const response = await api
          .post(`/store/carts/${cart.id}/complete`)
          .set("Idempotency-Key", "success-case")
          .send({})

        expect(response.status).toBe(200)
        expect(response.body.data).toBeDefined()
        expect(response.body.data.reservations?.length).toBeGreaterThan(0)
        expect(response.body.data.payment_session?.token).toBeDefined()
      })

      it("prevents oversell when stock is exhausted", async () => {
        const container = getContainer()
        const { cart: cartA } = await buildCartWithVariant(container, {
          stock: 1,
          quantity: 1,
          variantId,
          region,
          levelId,
        })
        const { cart: cartB } = await buildCartWithVariant(container, {
          stock: 1,
          quantity: 1,
          variantId,
          region,
          levelId,
          updateStock: false,
        })

        const [resA, resB] = await Promise.all([
          api
            .post(`/store/carts/${cartA.id}/complete`)
            .set("Idempotency-Key", "flash-a"),
          api
            .post(`/store/carts/${cartB.id}/complete`)
            .set("Idempotency-Key", "flash-b"),
        ])

        const successes = [resA, resB].filter((r) => r.status === 200)
        const failures = [resA, resB].filter((r) => r.status >= 400)

        expect(successes.length).toBe(1)
        expect(failures.length).toBe(1)
      })

      it("is idempotent for repeated checkout attempts", async () => {
        const container = getContainer()
        const { cart } = await buildCartWithVariant(container, {
          stock: 3,
          quantity: 1,
          variantId,
          region,
          levelId,
          updateStock: true,
        })

        const first = await api
          .post(`/store/carts/${cart.id}/complete`)
          .set("Idempotency-Key", "idem-key")
        const second = await api
          .post(`/store/carts/${cart.id}/complete`)
          .set("Idempotency-Key", "idem-key")

        expect(first.status).toBe(200)
        expect(second.status).toBe(200)
        expect(second.body.data.reservations?.length).toBe(
          first.body.data.reservations?.length
        )
      })
    })
  },
})
