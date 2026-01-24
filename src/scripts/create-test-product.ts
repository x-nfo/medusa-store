import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function createTestProduct({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("Creating test product for fashion module...")

    try {
        const productModuleService = container.resolve(Modules.PRODUCT)

        // Create product with Material, Color, and Size options
        const product = await productModuleService.createProducts({
            title: "Aaliyah Modest Tunic - Test",
            handle: "aaliyah-tunic-test",
            description: "Premium modest tunic with elegant design. Perfect for everyday wear and special occasions.",
            status: "published",
            options: [
                {
                    title: "Material", // MUST be exact: "Material" (case-sensitive)
                    values: ["Cotton", "Medina Silk"] // Match our seeded materials
                },
                {
                    title: "Color", // MUST be exact: "Color" (case-sensitive)
                    values: ["Navy", "Dusty Pink", "Beige"] // Match our seeded colors
                },
                {
                    title: "Size",
                    values: ["S", "M", "L", "XL"]
                }
            ],
            variants: [
                // Cotton + Navy combinations
                {
                    title: "Cotton / Navy / S",
                    options: { Material: "Cotton", Color: "Navy", Size: "S" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 10
                },
                {
                    title: "Cotton / Navy / M",
                    options: { Material: "Cotton", Color: "Navy", Size: "M" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 15
                },
                {
                    title: "Cotton / Navy / L",
                    options: { Material: "Cotton", Color: "Navy", Size: "L" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 12
                },
                {
                    title: "Cotton / Navy / XL",
                    options: { Material: "Cotton", Color: "Navy", Size: "XL" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 8
                },
                // Cotton + Beige combinations
                {
                    title: "Cotton / Beige / S",
                    options: { Material: "Cotton", Color: "Beige", Size: "S" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 10
                },
                {
                    title: "Cotton / Beige / M",
                    options: { Material: "Cotton", Color: "Beige", Size: "M" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 15
                },
                {
                    title: "Cotton / Beige / L",
                    options: { Material: "Cotton", Color: "Beige", Size: "L" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 12
                },
                {
                    title: "Cotton / Beige / XL",
                    options: { Material: "Cotton", Color: "Beige", Size: "XL" },
                    prices: [{ amount: 450000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 8
                },
                // Medina Silk + Dusty Pink combinations
                {
                    title: "Medina Silk / Dusty Pink / M",
                    options: { Material: "Medina Silk", Color: "Dusty Pink", Size: "M" },
                    prices: [{ amount: 650000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 8
                },
                {
                    title: "Medina Silk / Dusty Pink / L",
                    options: { Material: "Medina Silk", Color: "Dusty Pink", Size: "L" },
                    prices: [{ amount: 650000, currency_code: "idr" }],
                    manage_inventory: true,
                    inventory_quantity: 6
                },
            ]
        })

        logger.info(`✅ Product created successfully!`)
        logger.info(`   ID: ${product.id}`)
        logger.info(`   Handle: ${product.handle}`)
        logger.info(`   Title: ${product.title}`)
        logger.info(`   Options: Material, Color, Size`)
        logger.info(`   Variants: ${product.variants?.length} combinations`)
        logger.info(``)
        logger.info(`✅ Test this product:`)
        logger.info(`   Store API: GET http://localhost:9000/api/store/custom/fashion/${product.handle}`)
        logger.info(`   Admin UI: http://localhost:9000/app/products/${product.id}`)

    } catch (error) {
        logger.error("Error creating test product:", error)
        throw error
    }
}
