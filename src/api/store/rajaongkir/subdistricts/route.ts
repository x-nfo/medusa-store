import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

type SubdistrictResponse = {
    subdistricts: Array<{
        id: string
        name: string
        zip_code?: string
    }>
}

/**
 * Get Subdistricts (Kelurahan) for a District from RajaOngkir API (Storefront)
 * 
 * GET /store/rajaongkir/subdistricts?district=5816
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse<SubdistrictResponse>
) => {
    const districtId = req.query.district as string

    if (!districtId) {
        res.status(400).json({ subdistricts: [] })
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
        res.json({ subdistricts: [] })
    }
}
