
import { RajaOngkirClient } from "../../../src/services/rajaongkir-client"

describe("RajaOngkirClient Locations", () => {
    let client: RajaOngkirClient
    const mockRequest = jest.fn()

    beforeEach(() => {
        client = new RajaOngkirClient({ apiKey: "test" })
        // Mock the private request method
        Object.defineProperty(client, "request", {
            value: mockRequest,
            writable: true
        })
    })

    it("should fetch provinces and normalize response", async () => {
        const mockResponse = {
            rajaongkir: {
                results: [
                    { province_id: "1", province: "Bali" },
                    { province_id: "2", province: "Bangka Belitung" }
                ]
            }
        }
        mockRequest.mockResolvedValue(mockResponse)

        const result = await client.getProvinces()

        expect(mockRequest).toHaveBeenCalledWith(
            "province",
            { method: "GET" },
            "getProvinces"
        )
        expect(result).toHaveLength(2)
        expect(result[0].province).toBe("Bali")
    })

    it("should fetch cities and pass province query param", async () => {
        const mockResponse = {
            rajaongkir: {
                results: [
                    { city_id: "1", city_name: "Denpasar", type: "Kota" }
                ]
            }
        }
        mockRequest.mockResolvedValue(mockResponse)

        const result = await client.getCities("1")

        expect(mockRequest).toHaveBeenCalledWith(
            "city?province=1",
            { method: "GET" },
            "getCities"
        )
        expect(result).toHaveLength(1)
        expect(result[0].city_name).toBe("Denpasar")
    })
})
