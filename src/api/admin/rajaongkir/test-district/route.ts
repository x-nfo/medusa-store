import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Test endpoint to directly call RajaOngkir district API
 * GET /admin/rajaongkir/test-district?city=575
 */
export const GET = async (
    req: MedusaRequest,
    res: MedusaResponse
) => {
    const cityId = req.query.city as string || "575"
    const apiKey = process.env.RAJAONGKIR_API_KEY

    if (!apiKey) {
        return res.status(500).json({ error: "RAJAONGKIR_API_KEY not configured" })
    }

    try {
        const url = `https://rajaongkir.komerce.id/api/v1/destination/district/${cityId}`

        console.log(`[Test] Calling: ${url}`)

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Accept": "application/json",
                "key": apiKey,
            }
        })

        const text = await response.text()
        let data: any

        try {
            data = JSON.parse(text)
        } catch {
            data = text
        }

        console.log(`[Test] Status: ${response.status}`)
        console.log(`[Test] Response:`, JSON.stringify(data, null, 2))

        res.json({
            url,
            status: response.status,
            response: data
        })
    } catch (error: any) {
        console.error("[Test] Error:", error.message)
        res.status(500).json({ error: error.message })
    }
}
