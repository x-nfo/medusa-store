import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const client = new RajaOngkirClient()
    try {
        const provinceId = req.query.province_id as string
        const result = await client.getCities(provinceId)
        res.json(result)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
