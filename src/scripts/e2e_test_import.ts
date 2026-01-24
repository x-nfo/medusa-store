import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function simulateImportE2E({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve(Modules.PRODUCT)
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    logger.info("🚀 Starting E2E Import Simulation (with Sales Channel Link)...")

    try {
        // 1. Get Default Sales Channel
        const [defaultSalesChannel] = await salesChannelService.listSalesChannels({
            name: "Default Sales Channel" // Attempt to find by name, or take first one
        }, { take: 1 })

        // Fallback if not found by name (get first available)
        const targetSalesChannel = defaultSalesChannel || (await salesChannelService.listSalesChannels({}, { take: 1 }))[0]

        if (!targetSalesChannel) {
            throw new Error("No sales channels found! Cannot link product.")
        }

        logger.info(`✨ Target Sales Channel: ${targetSalesChannel.name} (${targetSalesChannel.id})`)

        // 1b. Define Product Data
        const productData = {
            title: "E2E Test Abaya Import",
            handle: "e2e-test-abaya",
            description: "Automated test product for E2E verification of Fashion Module.",
            options: [
                { title: "Material", values: ["Medina Silk"] },
                { title: "Color", values: ["Navy", "Emerald"] },
                { title: "Size", values: ["S", "M"] }
            ],
            variants: [
                {
                    title: "Medina Silk / Navy / S",
                    sku: "E2E-NAVY-S",
                    options: {
                        Material: "Medina Silk",
                        Color: "Navy",
                        Size: "S"
                    },
                    prices: [{ amount: 750000, currency_code: "idr" }]
                },
                {
                    title: "Medina Silk / Emerald / M",
                    sku: "E2E-EMERALD-M",
                    options: {
                        Material: "Medina Silk",
                        Color: "Emerald",
                        Size: "M"
                    },
                    prices: [{ amount: 750000, currency_code: "idr" }]
                }
            ],
            images: [{ url: "https://media.karimasyari.com/test/e2e-abaya.jpg" }],
            thumbnail: "https://media.karimasyari.com/test/e2e-abaya-thumb.jpg",
            status: 'published' // Ensure explicitly published
        }

        // 2. Cleanup existing
        const existing = await productService.listProducts({ handle: productData.handle })
        if (existing.length > 0) {
            logger.info("🗑️  Cleaning up previous test product...")
            await productService.deleteProducts(existing.map(p => p.id))
        }

        // 3. Create Product
        logger.info("📦 Creating Product...")
        const product = await productService.createProducts(productData)

        logger.info(`✅ Product Created: ${product.id}`)

        // 4. Link to Sales Channel
        logger.info("🔗 Linking to Sales Channel...")
        await remoteLink.create([
            {
                [Modules.PRODUCT]: {
                    product_id: product.id,
                },
                [Modules.SALES_CHANNEL]: {
                    sales_channel_id: targetSalesChannel.id,
                },
            },
        ])

        logger.info("✅ Sales Channel Linked!")
        logger.info("🎉 E2E Import Simulation Complete!")
        logger.info("   -> Now check Storefront: http://localhost:4321/products/e2e-test-abaya")

    } catch (error) {
        logger.error("❌ E2E Simulation Failed:", error)
        throw error
    }
}
