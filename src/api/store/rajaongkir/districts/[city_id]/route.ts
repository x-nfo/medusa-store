import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../../services/rajaongkir-client"

type DistrictResponse = {
    districts: Array<{
        id: string
        name: string
        province?: string
        city?: string
    }>
}

/**
 * Get Districts for a City via Path Param
 * GET /store/rajaongkir/districts/[city_id]
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<DistrictResponse | { message: string }>
) => {
    const cityId = req.params.city_id

    if (!cityId) {
        res.status(400).json({ message: "city_id is required" })
        return
    }

    try {
        const client = new RajaOngkirClient()
        const rawDistricts = await client.getDistricts(cityId)

        const districts = rawDistricts.map(d => ({
            id: String(d.subdistrict_id || d.id),
            name: d.subdistrict_name || d.name,
            zip_code: d.zip_code || ""
        }))

        res.json({ districts })
    } catch (error: any) {
        console.error("[Store RajaOngkir Districts] Error:", error.message)
        res.status(500).json({ message: error.message })
    }
}
