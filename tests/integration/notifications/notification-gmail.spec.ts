import { GmailNotificationService } from "../../../src/modules/notification-gmail/service"
import { sendEmail } from "../../../src/services/email-service"

jest.mock("../../../src/services/email-service", () => ({
  sendEmail: jest.fn(),
}))

describe("GmailNotificationService", () => {
  const service = new GmailNotificationService()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test("sendOrderCreated sends templated email", async () => {
    await service.sendOrderCreated("buyer@test.com", {
      order_id: "order-1",
      total: "Rp10.000",
      customer_name: "Ayu",
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@test.com",
        subject: expect.stringContaining("Pesanan order-1 diterima"),
      })
    )
  })

  test("sendPaymentConfirmed sends payment confirmation email", async () => {
    await service.sendPaymentConfirmed("buyer@test.com", {
      order_id: "order-2",
      customer_name: "Budi",
    })

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@test.com",
        subject: expect.stringContaining("Pembayaran diterima - order-2"),
      })
    )
  })

  test("sendAwbCreated skips when recipient is missing", async () => {
    await service.sendAwbCreated(undefined, {
      order_id: "order-3",
      awb: "AWB123",
    })

    expect(sendEmail).not.toHaveBeenCalled()
  })
})
