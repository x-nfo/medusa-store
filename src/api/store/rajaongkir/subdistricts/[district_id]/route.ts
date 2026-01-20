import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../../services/rajaongkir-client"

type SubdistrictResponse = {
    subdistricts: Array<{
        id: string
        name: string
        zip_code?: string
    }>
}

/**
 * Get Subdistricts for a District via Path Param
 * GET /store/rajaongkir/subdistricts/[district_id]
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<SubdistrictResponse | { message: string }>
) => {
    const districtId = req.params.district_id

    if (!districtId) {
        res.status(400).json({ message: "district_id is required" })
        return
    }

    try {
        const client = new RajaOngkirClient()
        const rawSubdistricts = await client.getSubdistricts(districtId)

        const subdistricts = rawSubdistricts.map(s => ({
            id: String(s.id || s.subdistrict_id),
            name: s.name || s.subdistrict_name,
            zip_code: s.zip_code || s.postal_code || ""
        }))

        res.json({ subdistricts })
    } catch (error: any) {
        console.error("[Store RajaOngkir Subdistricts] Error:", error.message)
        res.status(500).json({ message: error.message })
    }
}
