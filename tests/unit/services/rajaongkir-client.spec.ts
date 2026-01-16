import { RajaOngkirClient } from "../../../src/services/rajaongkir-client"

const ORIGINAL_ENV = { ...process.env }

describe("RajaOngkirClient", () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...ORIGINAL_ENV,
      RAJAONGKIR_API_KEY: "test-api-key",
      RAJAONGKIR_BASE_URL: "https://api.rajaongkir.test/",
    }
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test("quote returns normalized shipping options", async () => {
    const responseBody = {
      data: {
        results: [
          {
            code: "jne",
            costs: [
              { service: "REG", cost: [{ value: "12000", etd: "2-3" }] },
              { service: "YES", cost: [{ value: 15000, etd: "1-2" }] },
            ],
          },
          {
            code: "pos",
            tariffs: [{ service: "Kilat", price: 18000, eta: "2 hari" }],
          },
        ],
      },
    }

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(responseBody),
    })
    // @ts-expect-error override global fetch
    global.fetch = fetchMock

    const client = new RajaOngkirClient()
    const options = await client.quote({
      origin_city_id: "501",
      destination_city_id: "574",
      weight_grams: 1200,
      couriers: ["jne", "pos"],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.rajaongkir.test/quote",
      expect.objectContaining({
        method: "POST",
      })
    )

    const requestHeaders = (fetchMock.mock.calls[0]?.[1]?.headers ?? new Headers()) as Headers
    expect(requestHeaders.get("Authorization")).toBe("Bearer test-api-key")
    expect(requestHeaders.get("X-API-Key")).toBe("test-api-key")

    expect(options).toEqual([
      expect.objectContaining({
        courier: "jne",
        service: "REG",
        price: 12000,
      }),
      expect.objectContaining({
        courier: "jne",
        service: "YES",
        price: 15000,
      }),
      expect.objectContaining({
        courier: "pos",
        service: "Kilat",
        price: 18000,
      }),
    ])
  })

  test("createShipment returns normalized shipment details with raw response", async () => {
    const shipmentResponse = {
      order: {
        id: "ship-123",
        awb: "AWB123",
        label_url: "https://label.test/123",
        tracking_url: "https://track.test/123",
      },
    }

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(shipmentResponse),
    })
    // @ts-expect-error override global fetch
    global.fetch = fetchMock

    const client = new RajaOngkirClient()
    const result = await client.createShipment({
      order_id: "order-1",
      courier: "jne",
      sender: {
        name: "Sender",
        phone: "0800000000",
        address: "Jl. Mawar",
        city_id: "501",
      },
      recipient: {
        name: "Recipient",
        phone: "0800000001",
        address: "Jl. Melati",
        city_id: "574",
      },
      items: [{ name: "Item", qty: 1, price: 10000 }],
      weight_grams: 1000,
    })

    expect(result).toMatchObject({
      external_shipment_id: "ship-123",
      awb: "AWB123",
      label_url: "https://label.test/123",
      tracking_url: "https://track.test/123",
      raw_response: shipmentResponse,
    })
  })

  test("track returns stubbed status and history", async () => {
    const client = new RajaOngkirClient()
    const result = await client.track("AWB-01")

    expect(result).toEqual({ latest_status: "IN_TRANSIT", history: [] })
  })
})
