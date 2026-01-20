import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

type UpdateLocationMetadataRequest = {
    rajaongkir_province_id?: string
    rajaongkir_province_name?: string
    rajaongkir_city_id?: string
    rajaongkir_city_name?: string
    rajaongkir_district_id?: string
    rajaongkir_district_name?: string
    rajaongkir_subdistrict_id?: string
    rajaongkir_subdistrict_name?: string
}

type UpdateLocationMetadataResponse = {
    success: boolean
    location_id: string
    rajaongkir_province_id?: string
    rajaongkir_province_name?: string
    rajaongkir_city_id?: string
    rajaongkir_city_name?: string
    rajaongkir_district_id?: string
    rajaongkir_district_name?: string
    rajaongkir_subdistrict_id?: string
    rajaongkir_subdistrict_name?: string
}

/**
 * Update RajaOngkir city mapping for a stock location
 * 
 * Only stores the city_id and city_name in metadata.
 * Other sender data (name, address, phone) should be configured
 * in the Stock Location's built-in fields.
 * 
 * POST /admin/rajaongkir/locations/:location_id
 * Body: { rajaongkir_city_id: "31555", rajaongkir_city_name: "Jakarta Selatan" }
 */
export const POST = async (
    req: MedusaRequest<UpdateLocationMetadataRequest>,
    res: MedusaResponse<UpdateLocationMetadataResponse>
) => {
    const { location_id } = req.params
    const { rajaongkir_city_id, rajaongkir_city_name } = req.body || {}

    const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)

    try {
        // Get current location to preserve existing metadata
        const currentLocation = await stockLocationService.retrieveStockLocation(location_id)
        const currentMetadata = (currentLocation.metadata || {}) as Record<string, unknown>

        // Build new metadata (merge with existing, only city data)
        const newMetadata: Record<string, unknown> = {
            ...currentMetadata,
        }

        if (rajaongkir_city_id !== undefined) {
            newMetadata.rajaongkir_city_id = rajaongkir_city_id
        }
        if (rajaongkir_city_name !== undefined) {
            newMetadata.rajaongkir_city_name = rajaongkir_city_name
        }

        // V2: Save Province data
        const { rajaongkir_province_id, rajaongkir_province_name } = req.body || {}
        if (rajaongkir_province_id !== undefined) {
            newMetadata.rajaongkir_province_id = rajaongkir_province_id
        }
        if (rajaongkir_province_name !== undefined) {
            newMetadata.rajaongkir_province_name = rajaongkir_province_name
        }

        // V2: Save District data
        const { rajaongkir_district_id, rajaongkir_district_name } = req.body || {}
        if (rajaongkir_district_id !== undefined) {
            newMetadata.rajaongkir_district_id = rajaongkir_district_id
        }
        if (rajaongkir_district_name !== undefined) {
            newMetadata.rajaongkir_district_name = rajaongkir_district_name
        }

        // V2: Save Subdistrict data
        const { rajaongkir_subdistrict_id, rajaongkir_subdistrict_name } = req.body || {}
        if (rajaongkir_subdistrict_id !== undefined) {
            newMetadata.rajaongkir_subdistrict_id = rajaongkir_subdistrict_id
        }
        if (rajaongkir_subdistrict_name !== undefined) {
            newMetadata.rajaongkir_subdistrict_name = rajaongkir_subdistrict_name
        }

        // Update the stock location using correct signature: updateStockLocations(id, input)
        const updated = await stockLocationService.updateStockLocations(
            location_id,
            { metadata: newMetadata }
        )

        res.json({
            success: true,
            location_id,
            rajaongkir_province_id: (updated?.metadata as any)?.rajaongkir_province_id,
            rajaongkir_province_name: (updated?.metadata as any)?.rajaongkir_province_name,
            rajaongkir_city_id: (updated?.metadata as any)?.rajaongkir_city_id,
            rajaongkir_city_name: (updated?.metadata as any)?.rajaongkir_city_name,
            rajaongkir_district_id: (updated?.metadata as any)?.rajaongkir_district_id,
            rajaongkir_district_name: (updated?.metadata as any)?.rajaongkir_district_name,
            rajaongkir_subdistrict_id: (updated?.metadata as any)?.rajaongkir_subdistrict_id,
            rajaongkir_subdistrict_name: (updated?.metadata as any)?.rajaongkir_subdistrict_name,
        })
    } catch (error: any) {
        console.error("[RajaOngkir Location Update] Error:", error.message)

        res.status(500).json({
            success: false,
            location_id,
        })
    }
}

/**
 * Get RajaOngkir city mapping for a stock location
 * 
 * GET /admin/rajaongkir/locations/:location_id
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const { location_id } = req.params

    const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)

    try {
        const location = await stockLocationService.retrieveStockLocation(location_id)
        const metadata = (location.metadata || {}) as Record<string, unknown>

        res.json({
            success: true,
            location_id,
            rajaongkir_province_id: metadata.rajaongkir_province_id || null,
            rajaongkir_province_name: metadata.rajaongkir_province_name || null,
            rajaongkir_city_id: metadata.rajaongkir_city_id || null,
            rajaongkir_city_name: metadata.rajaongkir_city_name || null,
            rajaongkir_district_id: metadata.rajaongkir_district_id || null,
            rajaongkir_district_name: metadata.rajaongkir_district_name || null,
            rajaongkir_subdistrict_id: metadata.rajaongkir_subdistrict_id || null,
            rajaongkir_subdistrict_name: metadata.rajaongkir_subdistrict_name || null,
        })
    } catch (error: any) {
        console.error("[RajaOngkir Location Get] Error:", error.message)

        res.status(404).json({
            success: false,
            location_id,
            error: "Location not found",
        })
    }
}
