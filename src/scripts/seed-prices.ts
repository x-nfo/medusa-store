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
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

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
            console.log(`Processing ${handle} with price ${price}`)

            for (const variant of product.variants) {
                const query = {
                    product_variant: {
                        __args: { id: variant.id },
                        price_set: {
                            id: true
                        }
                    }
                }

                const result = await remoteQuery(query)
                let priceSetId: string | undefined;
                if (Array.isArray(result) && result.length > 0) {
                    priceSetId = result[0].price_set?.id
                }

                if (priceSetId) {
                    const [priceSet] = await pricingService.listPriceSets({ id: [priceSetId] }, { relations: ['prices'] })

                    if (priceSet) {
                        const hasIdrPrice = priceSet.prices?.some(p => p.currency_code === 'idr')

                        if (!hasIdrPrice) {
                            console.log(`Adding IDR price to existing price set ${priceSetId}`)
                            await pricingService.addPrices({
                                priceSetId: priceSetId,
                                prices: [{ currency_code: 'idr', amount: price }]
                            })
                        }
                    } else {
                        console.warn(`Orphan link found! Variant ${variant.id} -> Price Set ${priceSetId}. Price Set missing.`)
                        console.log(`Dismissing broken link and recreating...`)

                        await remoteLink.dismiss({
                            [Modules.PRODUCT]: { variant_id: variant.id },
                            [Modules.PRICING]: { price_set_id: priceSetId }
                        })

                        // Proceed to create new
                        priceSetId = undefined // fall through to creation
                    }
                }

                if (!priceSetId) {
                    console.log(`Creating new price set for variant ${variant.id}`)

                    const createdPriceSets = await pricingService.createPriceSets([
                        {
                            prices: [
                                {
                                    currency_code: 'idr',
                                    amount: price,
                                }
                            ]
                        }
                    ])
                    const newPriceSet = createdPriceSets[0]

                    await remoteLink.create({
                        [Modules.PRODUCT]: {
                            variant_id: variant.id,
                        },
                        [Modules.PRICING]: {
                            price_set_id: newPriceSet.id,
                        }
                    })
                    console.log(`Linked variant ${variant.id} to new price set ${newPriceSet.id}`)
                }
            }
        }
    }
}
