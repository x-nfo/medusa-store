import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

/**
 * Get Cities from RajaOngkir API
 * GET /store/rajaongkir/cities?province=12
 * 
 * Note: RajaOngkirClient.getCities() will automatically use the correct format:
 * - V2 (Komerce): destination/city/{provinceId} (path parameter)
 * - Standard: city?province={provinceId} (query parameter)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const client = new RajaOngkirClient()
    try {
        const provinceId = req.query.province as string
        const result = await client.getCities(provinceId)
        res.json(result)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
