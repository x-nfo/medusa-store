import { ExecArgs } from '@medusajs/framework/types'
import { Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

export default async function verifyPrices({ container }: ExecArgs) {
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

    // Query for hayya-black variants and their prices
    const query = {
        product: {
            __args: { handle: 'hayya-black' },
            variants: {
                id: true,
                price_set: {
                    id: true,
                    prices: {
                        currency_code: true,
                        amount: true,
                        rules: true
                    }
                }
            }
        }
    }

    const result = await remoteQuery(query)
    console.log(JSON.stringify(result, null, 2))
}
