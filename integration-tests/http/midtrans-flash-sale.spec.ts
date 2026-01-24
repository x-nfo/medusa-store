import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
    inApp: true,
    env: {
        MIDTRANS_SERVER_KEY: "test-server-key",
        MIDTRANS_IS_PRODUCTION: "false"
    },
    testSuite: ({ api, getContainer }) => {
        describe("Midtrans Snap Flash Sale Protection", () => {
            let cartId: string
            let variantId: string
            let inventoryItemId: string

            beforeEach(async () => {
                const container = getContainer()
                const regionModule = container.resolve(Modules.REGION)
                const productModule = container.resolve(Modules.PRODUCT)
                const inventoryModule = container.resolve(Modules.INVENTORY)
                const stockLocationModule = container.resolve(Modules.STOCK_LOCATION)
                const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
                const apiKeyModule = container.resolve(Modules.API_KEY)
                const cartModule = container.resolve(Modules.CART)
                const link = container.resolve(ContainerRegistrationKeys.LINK)

                // 1. Create Region
                const region = await regionModule.createRegions({
                    name: "Indonesia",
                    currency_code: "idr",
                    countries: ["id"]
                })

                // 2. Create Stock Location
                const location = await stockLocationModule.createStockLocations({
                    name: "Gudang Utama"
                })
                const stockLocationId = location.id

                // 3. Create Product & Variant
                const [product] = await productModule.createProducts([{
                    title: "Flash Sale Item",
                    options: [{ title: "Size", values: ["S"] }],
                    variants: [{ title: "S", options: { Size: "S" }, prices: [{ currency_code: "idr", amount: 10000 }] }]
                }])

                const variant = product.variants[0]
                variantId = variant.id

                // 4. Create Inventory Item
                const inventoryItem = await inventoryModule.createInventoryItems({
                    sku: "FLASH-S",
                    requires_shipping: true
                })
                inventoryItemId = inventoryItem.id

                // 5. Link Inventory Item to Variant
                await link.create({
                    [Modules.PRODUCT]: { variant_id: variantId },
                    [Modules.INVENTORY]: { inventory_item_id: inventoryItemId }
                })

                // 6. Add Inventory Level (Stock = 5)
                await inventoryModule.createInventoryLevels([{
                    inventory_item_id: inventoryItemId,
                    location_id: stockLocationId,
                    stocked_quantity: 5
                }])

                // 7. Create Sales Channel
                const salesChannel = await salesChannelModule.createSalesChannels({
                    name: "Flash Sale Channel"
                })

                // Link SC to Stock Location
                await link.create({
                    [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id },
                    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId }
                })

                // Link Product to SC
                await link.create({
                    [Modules.PRODUCT]: { product_id: product.id },
                    [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id }
                })

                // 8. Create & Link API Key (REQUIRED for Store API)
                const apiKey = await apiKeyModule.createApiKeys({
                    title: "Test Key",
                    type: "publishable",
                    created_by: "test"
                })

                // Use workflow for correct link definition handling
                await linkSalesChannelsToApiKeyWorkflow(container).run({
                    input: {
                        id: apiKey.id,
                        add: [salesChannel.id]
                    }
                })

                // Set API Header for requests
                api.defaults.headers.common["x-publishable-api-key"] = apiKey.token

                // 9. Create Cart
                const cart = await cartModule.createCarts({
                    currency_code: "idr",
                    region_id: region.id,
                    sales_channel_id: salesChannel.id,
                    email: "test@example.com",
                    items: [{
                        title: "Flash Sale Item",
                        quantity: 1,
                        variant_id: variantId,
                        unit_price: 15000
                    }]
                })
                cartId = cart.id
            })

            it("reserves inventory when Snap token is requested", async () => {
                const container = getContainer()
                const inventoryService = container.resolve(Modules.INVENTORY)

                // 1. Request Snap Token
                const response = await api.post("/store/payments/midtrans/snap", {
                    cart_id: cartId
                })

                if (response.status !== 200) {
                    console.error("Snap Error:", JSON.stringify(response.body, null, 2))
                }

                expect(response.status).toEqual(200)
                expect(response.body).toHaveProperty("token")

                // 2. Verify Reservation Exists
                const { data: reservations } = await inventoryService.listAndCountReservationItems({
                    metadata: {
                        cart_id: cartId,
                        status: "pending"
                    }
                })

                expect(reservations.length).toBeGreaterThan(0)
                expect(reservations[0].metadata).toHaveProperty("expires_at")
            })

            it("fails if stock is insufficient", async () => {
                const container = getContainer()
                const inventoryService = container.resolve(Modules.INVENTORY)

                // 1. Manually update stock to 0
                const levels = await inventoryService.listInventoryLevels({ inventory_item_id: inventoryItemId })
                if (levels.length) {
                    await inventoryService.updateInventoryLevels({
                        id: levels[0].id,
                        stocked_quantity: 0
                    })
                }

                // 2. Try Request Snap Token
                const response = await api.post("/store/payments/midtrans/snap", {
                    cart_id: cartId
                }).catch(e => e.response)

                expect(response.status).not.toEqual(200)
            })
        })
    },
})
