import { ExecArgs } from '@medusajs/framework/types'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

const PRICE_MAP: Record<string, number> = {
    'hayya-black': 749000,
    'hayya-choco': 749000,
    'saliha-almond': 699000,
    'saliha-wood': 699000,
    'katta-terracotta': 785000,
    'katta-dusty-pink': 699000,
    'katta-olive': 699000,
    'katta-moss': 699000,
    'katta-sage': 785000,
    'katta-tosca': 785000,
    'safa-navy': 699000,
    'safa-jeans': 699000,
    'safa-blue': 699000,
    'safa-light-blue': 699000,
    'marwah-navy': 699000,
    'marwah-jeans': 699000,
    'marwah-blue': 699000,
    'marwah-light-blue': 699000,
    'khimar': 349000,
    'khimar-bandana': 349000,
    'safa-series': 699000,
    'marwah-series': 699000,
}

export default async function seedPrices({ container }: ExecArgs) {
    const productService = container.resolve(Modules.PRODUCT)
    const pricingService = container.resolve(Modules.PRICING)
    const regionService = container.resolve(Modules.REGION)

    // Ensure IDR currency/region exists
    // For simplicity, we just add prices in 'idr' currency code.
    const currencyCode = 'idr'

    console.log('Seeding prices...')

    const [products, count] = await productService.listAndCountProducts(
        {},
        { relations: ['variants'] }
    )

    console.log(`Found ${count} products.`)

    for (const product of products) {
        const handle = product.handle
        const price = PRICE_MAP[handle]

        if (price) {
            console.log(`Setting price for ${handle}: ${price}`)

            const variantIds = product.variants.map(v => v.id)

            // Check if price exists? Or just overwrite/add.
            // We'll create a price set for each variant if needed, but Medusa 2.0 links logic is complex.
            // Actually, pricing service `create` creates a price set.
            // But products already have `price_set_id` on variants usually if created via standard flow?
            // Inspect variant.

            for (const variant of product.variants) {
                // Create a price entry for this variant
                // In Medusa 2.0, we use pricingService.createParams with rules?
                // Actually, if we use the workflow it's easier, but here we use the service.

                // If variant has no price_set, we might need to create one?
                // But usually product module handles that. 
                // Let's assume price_set_id exists or we need to create a price set and link it.
                // However, `link` module is needed for that.

                // Let's look at `check-product-prices.ts` output again.
                // Variant has `price_set_id`? Not shown in my log.
                // If it was created via import without prices, maybe it doesn't?

                // We will try to add prices using the pricing service.
                // `pricingService.create` creates a PriceSet.
                // Then we need to link it to the variant.
                // We need `remoteLink` for that.

                // Wait, if I just want to ADD a price to an EXISTING price set?
                // First check if variant has a price_set_id.
            }
        } else {
            console.warn(`No price defined for handle: ${handle}`)
        }
    }
}
