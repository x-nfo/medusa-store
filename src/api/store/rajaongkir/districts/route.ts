import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

type DistrictResponse = {
    districts: Array<{
        id: string
        name: string
        // normalized from API
        province?: string
        city?: string
    }>
}

/**
 * Get Districts for a City from RajaOngkir API (Storefront Proxy)
 * 
 * GET /store/rajaongkir/districts?city=151
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<DistrictResponse>
) => {
    const cityId = req.query.city as string

    if (!cityId) {
        res.status(400).json({ districts: [] })
        return
    }

    try {
        const client = new RajaOngkirClient()
        // getDistricts returns raw normalization. 
        const rawDistricts = await client.getDistricts(cityId)

        const districts = rawDistricts.map(d => ({
            id: String(d.subdistrict_id || d.id), // Komerce V2: id / Standard: subdistrict_id
            name: d.subdistrict_name || d.name,
            zip_code: d.zip_code || ""
        }))

        res.json({ districts })
    } catch (error: any) {
        console.error("[Store RajaOngkir Districts] Error:", error.message)
        // Return empty array on error
        res.json({ districts: [] })
    }
}
