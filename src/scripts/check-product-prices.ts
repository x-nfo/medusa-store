import { ExecArgs } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function checkProductPrices({ container }: ExecArgs) {
    const productService = container.resolve(Modules.PRODUCT)
    const pricingService = container.resolve(Modules.PRICING)
    const regionService = container.resolve(Modules.REGION)

    const handle = 'hayya-black' // or 'hayya-choco'

    const [product] = await productService.listProducts(
        { handle },
        { relations: ['variants'] }
    )

    if (!product) {
        console.log(`Product with handle ${handle} not found`)
        return
    }

    console.log(`Product: ${product.title} (${product.id})`)

    console.log('Variants:', JSON.stringify(product.variants.map(v => ({ id: v.id, price_set_id: (v as any).price_set_id })), null, 2))

    // Check prices
    const prices = await pricingService.listPrices({
        price_set_id: product.variants.map(v => (v as any).price_set_id).filter(Boolean)
    })

    console.log('Prices found:', prices.length)
    console.log(JSON.stringify(prices, null, 2))

    // Check regions/currencies
    const regions = await regionService.listRegions()
    console.log('Regions:', regions.map(r => `${r.name} (${r.currency_code})`))
}
