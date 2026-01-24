import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function checkProductStatus({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const productService = container.resolve(Modules.PRODUCT)
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL)

    logger.info("🔍 Checking E2E Product Status...")

    try {
        const products = await productService.listProducts(
            { handle: "e2e-test-abaya" },
            { relations: ["sales_channels"] }
        )

        if (products.length === 0) {
            logger.error("❌ Product 'e2e-test-abaya' NOT FOUND in database!")
            return
        }

        const product = products[0] as any // Cast to any for relations access
        logger.info(`✅ Product Found: ${product.title}`)
        logger.info(`   Status: ${product.status}`)
        logger.info(`   Sales Channels: ${product.sales_channels?.length || 0}`)

        if (product.sales_channels) {
            product.sales_channels.forEach((sc: any) => {
                logger.info(`     - ${sc.name} (${sc.id})`)
            })
        } else {
            logger.warn("⚠️  No sales channels assigned! This is likely why it is 404.")
        }

        // List available sales channels
        const channels = await salesChannelService.listSalesChannels()
        logger.info(`\nAvailable Sales Channels:`)
        channels.forEach(c => logger.info(`  - ${c.name} (${c.id})`))

    } catch (error) {
        logger.error(`Error: ${error}`)
        throw error
    }
}

