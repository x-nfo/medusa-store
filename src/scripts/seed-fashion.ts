import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export default async function seedFashionData({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    logger.info("Starting fashion module seed...")

    try {
        // Fashion module service name
        const fashionService = container.resolve("fashionModuleService")

        logger.info("Creating Materials and Colors...")

        // Define materials with their colors
        const fashionData = [
            {
                materialName: "Cotton",
                colors: [
                    { name: "Navy", hex_code: "#1E3A5F" },
                    { name: "Beige", hex_code: "#D4C4A8" },
                    { name: "Olive", hex_code: "#808000" },
                    { name: "Charcoal", hex_code: "#36454F" },
                    { name: "White", hex_code: "#FFFFFF" },
                ]
            },
            {
                materialName: "Medina Silk",
                colors: [
                    { name: "Dusty Pink", hex_code: "#D4A5A5" },
                    { name: "Lavender", hex_code: "#E6E6FA" },
                    { name: "Sage", hex_code: "#9CAF88" },
                    { name: "Cream", hex_code: "#FFFDD0" },
                    { name: "Mauve", hex_code: "#E0B0FF" },
                ]
            },
            {
                materialName: "Jersey",
                colors: [
                    { name: "Black", hex_code: "#000000" },
                    { name: "White", hex_code: "#FFFFFF" },
                    { name: "Gray", hex_code: "#6B7280" },
                    { name: "Navy", hex_code: "#1E3A5F" },
                ]
            },
            {
                materialName: "Chiffon",
                colors: [
                    { name: "Blush", hex_code: "#DE5D83" },
                    { name: "Mint", hex_code: "#98FF98" },
                    { name: "Rose", hex_code: "#FF007F" },
                    { name: "Ivory", hex_code: "#FFFFF0" },
                ]
            },
            {
                materialName: "Crepe",
                colors: [
                    { name: "Burgundy", hex_code: "#800020" },
                    { name: "Taupe", hex_code: "#483C32" },
                    { name: "Camel", hex_code: "#C19A6B" },
                    { name: "Black", hex_code: "#000000" },
                ]
            },
        ]

        // Create materials and their colors
        for (const { materialName, colors } of fashionData) {
            // Create material
            const material = await fashionService.createMaterials({
                name: materialName,
            })

            logger.info(`✓ Created material: ${materialName}`)

            // Create colors for this material
            for (const color of colors) {
                await fashionService.createColors({
                    name: color.name,
                    hex_code: color.hex_code,
                    material_id: material.id,
                })
                logger.info(`  ✓ Created color: ${color.name} (${color.hex_code})`)
            }
        }

        logger.info("✅ Fashion module seed completed successfully!")
        logger.info(`Created ${fashionData.length} materials with their color palettes`)

    } catch (error) {
        logger.error("Error seeding fashion data:", error)
        throw error
    }
}
