import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { FASHION_MODULE } from "../modules/fashion"

export default async function testFashionAPI({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    logger.info("Testing Fashion API logic...")

    try {
        const productModuleService = container.resolve(Modules.PRODUCT)
        const fashionModuleService = container.resolve(FASHION_MODULE)

        const productHandle = "aaliyah-tunic-test"

        // Fetch product
        const [product] = await productModuleService.listProducts(
            { handle: productHandle },
            { relations: ['options', 'variants', 'variants.options'], take: 1 }
        )

        if (!product) {
            logger.error(`Product with handle "${productHandle}" not found`)
            return
        }

        logger.info(`✅ Found product: ${product.title}`)
        logger.info(`   Options: ${product.options?.map(o => o.title).join(', ')}`)

        // Check for Material and Color options
        const materialOption = product.options.find(o => o.title === 'Material')
        const colorOption = product.options.find(o => o.title === 'Color')

        if (!materialOption) {
            logger.error('❌ Material option not found!')
            return
        }
        if (!colorOption) {
            logger.error('❌ Color option not found!')
            return
        }

        logger.info(`✅ Found Material option (ID: ${materialOption.id})`)
        logger.info(`✅ Found Color option (ID: ${colorOption.id})`)

        // Build materials and colors tree from variants
        const materialsAndColorsNamesTree = new Map<string, string[]>()

        for (const variant of product.variants) {
            const materialName = variant.options.find(
                opt => opt.option_id === materialOption.id
            )?.value

            if (!materialName) continue

            const colorNames = variant.options
                .filter(opt => opt.option_id === colorOption.id)
                .map(opt => opt.value)

            if (!materialsAndColorsNamesTree.has(materialName)) {
                materialsAndColorsNamesTree.set(materialName, colorNames)
            } else {
                const existing = materialsAndColorsNamesTree.get(materialName)
                materialsAndColorsNamesTree.set(
                    materialName,
                    Array.from(new Set([...existing, ...colorNames]))
                )
            }
        }

        logger.info(`\n📊 Material-Color tree from variants:`)
        materialsAndColorsNamesTree.forEach((colors, material) => {
            logger.info(`   ${material}: ${colors.join(', ')}`)
        })

        // Fetch materials from fashion module
        const materialNames = Array.from(materialsAndColorsNamesTree.keys())
        const materials = await fashionModuleService.listMaterials(
            { name: materialNames },
            { relations: ['colors'] }
        )

        logger.info(`\n✅ Fetched ${materials.length} materials from fashion module`)

        // Build response
        const response = {
            materials: materials.map(material => ({
                id: material.id,
                name: material.name,
                colors: material.colors
                    .filter(color =>
                        materialsAndColorsNamesTree.get(material.name).includes(color.name)
                    )
                    .map(color => ({
                        id: color.id,
                        name: color.name,
                        hex_code: color.hex_code,
                    }))
            }))
        }

        logger.info(`\n🎨 Fashion API Response:`)
        logger.info(JSON.stringify(response, null, 2))

        logger.info(`\n✅ Fashion API test completed successfully!`)

    } catch (error) {
        logger.error("Error testing fashion API:", error)
        throw error
    }
}
