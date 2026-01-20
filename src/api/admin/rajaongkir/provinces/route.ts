import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

type ProvinceResponse = {
    provinces: Array<{
        id: string
        name: string
    }>
}

/**
 * Get Provinces from RajaOngkir API
 * 
 * GET /admin/rajaongkir/provinces
 */
export const GET = async (
    _req: MedusaRequest,
    res: MedusaResponse<ProvinceResponse>
) => {
    try {
        const client = new RajaOngkirClient()
        const rawProvinces = await client.getProvinces()

        const provinces = rawProvinces.map(p => ({
            id: String(p.province_id || p.id),
            name: p.province_name || p.name,
        }))

        res.json({ provinces })
    } catch (error: any) {
        console.error("[RajaOngkir Provinces] Error:", error.message)
        res.json({ provinces: [] })
    }
}
