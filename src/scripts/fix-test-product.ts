import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function fixTestProduct({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("Fixing test product...")

    try {
        const productModuleService = container.resolve(Modules.PRODUCT)

        const productId = "prod_01KFKGB2RHJ4N03XMTF4RYN7PE"

        // Update product with thumbnail and description
        await productModuleService.updateProducts(productId, {
            thumbnail: "https://media.karimasyari.com/products/aaliyah-tunic-test.webp",
            description: "Premium modest tunic with elegant design. Perfect for everyday wear and special occasions. Made from high-quality materials for comfort and style."
        })

        logger.info("✅ Product updated with thumbnail and description")

        // Verify
        const [product] = await productModuleService.listProducts(
            { id: productId },
            { take: 1 }
        )

        logger.info(`\nUpdated product:`)
        logger.info(`  - thumbnail: ${product.thumbnail}`)
        logger.info(`  - description: ${product.description?.substring(0, 50)}...`)

        logger.info(`\n✅ Product fixed! Try accessing: http://localhost:4321/products/aaliyah-tunic-test`)

    } catch (error) {
        logger.error("Error:", error)
        throw error
    }
}
