import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export type StockLocationOrigin = {
    name: string
    phone: string
    address: string
    city_id: string
    postal_code?: string
}

/**
 * Retrieves origin (sender) information from a Stock Location in Medusa.
 * 
 * Data is read from the Stock Location's built-in fields:
 * - name: Location name (sender name)
 * - address.address_1 + address.address_2: Full address
 * - address.phone: Sender phone number
 * - address.postal_code: Postal code
 * - metadata.rajaongkir_city_id: RajaOngkir city ID (required, set via widget)
 * 
 * @param container - Medusa container
 * @param stockLocationId - Optional specific stock location ID. If not provided,
 *                          uses the store's default location.
 */
export async function getOriginFromStockLocation(
    container: MedusaContainer,
    stockLocationId?: string
): Promise<StockLocationOrigin | null> {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const storeModuleService = container.resolve(Modules.STORE)

    try {
        let locationId = stockLocationId

        // If no specific location ID, get from store's default location
        if (!locationId) {
            const [store] = await storeModuleService.listStores()
            locationId = store?.default_location_id
        }

        if (!locationId) {
            return null
        }

        // Query stock location with address
        const { data: stockLocations } = await query.graph({
            entity: "stock_location",
            fields: [
                "id",
                "name",
                "metadata",
                "address.address_1",
                "address.address_2",
                "address.city",
                "address.province",
                "address.postal_code",
                "address.country_code",
                "address.phone",
            ],
            filters: { id: locationId },
        })

        const location = stockLocations?.[0]
        if (!location) {
            return null
        }

        const metadata = (location.metadata || {}) as Record<string, any>
        const address = location.address

        // Get city_id from metadata (required for RajaOngkir)
        // This is the only field that needs to be set via the RajaOngkir widget
        const cityId = metadata.rajaongkir_city_id || metadata.city_id
        if (!cityId) {
            console.warn(
                `[getOriginFromStockLocation] Stock Location "${location.name}" missing rajaongkir_city_id in metadata. ` +
                `Please configure via the RajaOngkir Settings widget.`
            )
            return null
        }

        // Read phone from Stock Location address (standard Medusa field)
        const phone = address?.phone || ""

        // Build address string from Stock Location address fields
        const addressParts = [
            address?.address_1,
            address?.address_2,
        ].filter(Boolean)
        const fullAddress = addressParts.join(", ")

        return {
            name: location.name || "",
            phone: phone,
            address: fullAddress || "",
            city_id: String(cityId),
            postal_code: address?.postal_code || undefined,
        }
    } catch (error) {
        console.error("[getOriginFromStockLocation] Error:", error)
        return null
    }
}

/**
 * Get origin with fallback to environment variables
 */
export async function getOriginWithFallback(
    container: MedusaContainer,
    stockLocationId?: string
): Promise<StockLocationOrigin> {
    // Try to get from Stock Location first
    const fromStockLocation = await getOriginFromStockLocation(container, stockLocationId)

    if (fromStockLocation && fromStockLocation.name && fromStockLocation.city_id) {
        return fromStockLocation
    }

    // Fallback to environment variables
    return {
        name: process.env.RAJAONGKIR_ORIGIN_NAME || "",
        phone: process.env.RAJAONGKIR_ORIGIN_PHONE || "",
        address: process.env.RAJAONGKIR_ORIGIN_ADDRESS || "",
        city_id: process.env.RAJAONGKIR_ORIGIN_CITY_ID || "",
        postal_code: process.env.RAJAONGKIR_ORIGIN_POSTAL_CODE,
    }
}
