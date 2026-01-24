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
    const jneResponse = {
      results: [
        {
          code: "jne",
          costs: [
            { service: "REG", cost: [{ value: "12000", etd: "2-3" }] },
            { service: "YES", cost: [{ value: 15000, etd: "1-2" }] },
          ],
        },
      ],
    }
    const posResponse = {
      results: [
        {
          code: "pos",
          costs: [{ service: "Kilat", cost: [{ value: 18000, etd: "2 hari" }] }],
        },
      ],
    }

    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(jneResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(posResponse),
      })
    // override global fetch
    // @ts-ignore
    global.fetch = fetchMock

    const client = new RajaOngkirClient()
    const options = await client.quote({
      origin_city_id: "501",
      destination_city_id: "574",
      weight_grams: 1200,
      couriers: ["jne", "pos"],
    })

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.rajaongkir.test/cost",
      expect.objectContaining({
        method: "POST",
      })
    )

    const requestHeaders = (fetchMock.mock.calls[0]?.[1]?.headers ?? {}) as any
    expect(requestHeaders["Authorization"]).toBe("Bearer test-api-key")
    expect(requestHeaders["X-API-Key"]).toBe("test-api-key")

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
      data: {
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
    // override global fetch
    // @ts-ignore
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
      items: [{ name: "Item", qty: 1, price: 10000, weight_grams: 1000 }],
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
    const shipmentResponse = {
      data: {
        summary: { status: "IN_TRANSIT" },
        history: []
      }
    }

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(shipmentResponse),
    })
    // override global fetch
    // @ts-ignore
    global.fetch = fetchMock

    const client = new RajaOngkirClient()
    const result = await client.track("AWB-01", "JNE")

    expect(result).toMatchObject({ latest_status: "IN_TRANSIT", history: [] })
  })
})
