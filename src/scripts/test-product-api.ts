import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function testProductAPI({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("Testing product API response...")

    try {
        const productModuleService = container.resolve(Modules.PRODUCT)

        // Fetch exactly like the storefront does
        const products = await productModuleService.listProducts(
            { handle: "aaliyah-tunic-test" },
            {
                relations: ['options', 'variants', 'variants.options', 'images'],
                take: 1
            }
        )

        if (products.length === 0) {
            logger.error("❌ Product not found!")
            return
        }

        const product = products[0]

        logger.info(`✅ Product fetched successfully`)
        logger.info(`\nRaw product structure:`)
        logger.info(`  - id: ${product.id}`)
        logger.info(`  - title: ${product.title}`)
        logger.info(`  - handle: ${product.handle}`)
        logger.info(`  - thumbnail: ${product.thumbnail || 'NULL'}`)
        logger.info(`  - images: ${product.images?.length || 0}`)
        logger.info(`  - options: ${product.options?.length || 0}`)

        if (product.options) {
            logger.info(`\nOptions detail:`)
            product.options.forEach(opt => {
                logger.info(`  - ${opt.title}: ${opt.values?.map(v => v.value).join(', ') || 'no values'}`)
            })
        }

        logger.info(`  - variants: ${product.variants?.length || 0}`)

        if (product.variants && product.variants.length > 0) {
            logger.info(`\nFirst variant:`)
            const v = product.variants[0]
            logger.info(`  - id: ${v.id}`)
            logger.info(`  - title: ${v.title || 'no title'}`)
            logger.info(`  - prices: ${v.prices?.length || 0}`)
            if (v.prices && v.prices.length > 0) {
                logger.info(`    - amount: ${v.prices[0].amount}`)
                logger.info(`    - currency_code: ${v.prices[0].currency_code}`)
            }
            logger.info(`  - options: ${v.options?.length || 0}`)
        }

        logger.info(`\n✅ Test completed - check if any fields are NULL/missing`)

    } catch (error) {
        logger.error("Error:", error)
        throw error
    }
}
