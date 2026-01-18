import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RajaOngkirClient } from "../../../../services/rajaongkir-client"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const client = new RajaOngkirClient()
    try {
        const query = req.query.q as string || ""
        const result = await client.searchCities(query)
        res.json(result)
    } catch (err: any) {
        res.status(500).json({ message: err.message })
    }
}
