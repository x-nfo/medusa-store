import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const client = new RajaOngkirClient()
    try {
        const result = await client.getProvinces()
        res.json(result)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
