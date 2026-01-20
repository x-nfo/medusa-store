import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

type CityResponse = {
    cities: Array<{
        id: string
        name: string
        province?: string
        type?: string
    }>
}

/**
 * Get Cities from RajaOngkir API
 * GET /admin/rajaongkir/cities?province=12
 * OR
 * GET /admin/rajaongkir/cities?search=jakarta (for backward compatibility)
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<CityResponse>
) => {
    const provinceId = req.query.province as string
    const searchTerm = req.query.search as string
    const limit = Number(req.query.limit) || 20

    try {
        const client = new RajaOngkirClient()

        // If province ID provided, use getCities
        if (provinceId) {
            const rawCities = await client.getCities(provinceId)
            const cities = rawCities.map(c => ({
                id: String(c.city_id || c.id),
                name: c.city_name || c.name,
                province: c.province_name || c.province || "",
                type: "city"
            }))
            return res.json({ cities })
        }

        // Otherwise use search (backward compatibility)
        if (searchTerm) {
            const cities = await client.searchCities(searchTerm, limit)
            return res.json({ cities })
        }

        res.json({ cities: [] })
    } catch (error: any) {
        console.error("[RajaOngkir Cities] Error:", error.message)
        res.json({ cities: [] })
    }
}
