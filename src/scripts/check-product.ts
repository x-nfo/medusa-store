import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function checkProduct({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("Checking test product status...")

    try {
        const productModuleService = container.resolve(Modules.PRODUCT)

        // Find product by handle
        const products = await productModuleService.listProducts(
            { handle: "aaliyah-tunic-test" },
            {
                relations: ['variants', 'options', 'options.values'],
                take: 1
            }
        )

        if (products.length === 0) {
            logger.error("❌ Product not found!")
            return
        }

        const product = products[0]

        logger.info(`✅ Product found!`)
        logger.info(`   ID: ${product.id}`)
        logger.info(`   Title: ${product.title}`)
        logger.info(`   Handle: ${product.handle}`)
        logger.info(`   Status: ${product.status}`)
        logger.info(`   Published: ${product.status === 'published' ? 'YES' : 'NO'}`)
        logger.info(`   Options: ${product.options?.length || 0}`)
        logger.info(`   Variants: ${product.variants?.length || 0}`)

        if (product.status !== 'published') {
            logger.warn(`⚠️  Product is NOT published (status: ${product.status})`)
            logger.info(`   Publishing product now...`)

            await productModuleService.updateProducts(product.id, {
                status: 'published'
            })

            logger.info(`✅ Product published!`)
        }

        logger.info(`\n🔗 Access URLs:`)
        logger.info(`   Storefront: http://localhost:4321/products/${product.handle}`)
        logger.info(`   Admin: http://localhost:9000/app/products/${product.id}`)

    } catch (error) {
        logger.error("Error checking product:", error)
        throw error
    }
}
