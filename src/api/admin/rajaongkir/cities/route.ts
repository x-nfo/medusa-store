import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

type CitySearchResponse = {
    cities: Array<{
        id: string
        name: string
        province: string
        type: string
    }>
}

/**
 * Search cities from RajaOngkir API
 * 
 * GET /admin/rajaongkir/cities?search=jakarta&limit=20
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<CitySearchResponse>
) => {
    const search = (req.query.search as string) || ""
    const limit = parseInt(req.query.limit as string) || 20

    try {
        const client = new RajaOngkirClient()
        const cities = await client.searchCities(search, limit)

        res.json({ cities })
    } catch (error: any) {
        console.error("[RajaOngkir Cities] Error:", error.message)

        // Return empty array on error
        res.json({ cities: [] })
    }
}
