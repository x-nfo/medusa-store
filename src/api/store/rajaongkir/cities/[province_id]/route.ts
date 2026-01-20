import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../../services/rajaongkir-client"

/**
 * Get Cities from RajaOngkir API via Path Param
 * GET /store/rajaongkir/cities/[province_id]
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const client = new RajaOngkirClient()
    try {
        const provinceId = req.params.province_id

        if (!provinceId) {
            res.status(400).json({ message: "province_id is required" })
            return
        }

        const result = await client.getCities(provinceId)
        res.json({ cities: result })
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
