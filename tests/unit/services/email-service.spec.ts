jest.mock("nodemailer")

const ORIGINAL_ENV = { ...process.env }

describe("email-service sendEmail", () => {
  const buildEnv = () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: "test",
      GMAIL_USER: "user@test.com",
      GMAIL_APP_PASSWORD: "app-password",
      EMAIL_FROM_NAME: "Syari Store",
      EMAIL_FROM_ADDRESS: "no-reply@test.com",
    }
  }

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    buildEnv()
  })

  afterAll(() => {
    process.env = ORIGINAL_ENV
  })

  test("sends email with correct payload using nodemailer transport", async () => {
    const nodemailer = require("nodemailer") as jest.Mocked<typeof import("nodemailer")>
    const sendMail = jest.fn().mockResolvedValue({ messageId: "msg-1" })
    nodemailer.createTransport.mockReturnValue({ sendMail } as any)

    const { sendEmail } = require("../../../src/services/email-service")

    await sendEmail({
      to: "customer@test.com",
      subject: "Test Subject",
      html: "<p>Hello customer</p>",
    })

    expect(nodemailer.createTransport).toHaveBeenCalledWith({ jsonTransport: true })
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: `"Syari Store" <no-reply@test.com>`,
        to: "customer@test.com",
        subject: "Test Subject",
        html: "<p>Hello customer</p>",
        text: "Hello customer",
      })
    )
  })

  test("logs and rethrows when sendMail fails", async () => {
    const nodemailer = require("nodemailer") as jest.Mocked<typeof import("nodemailer")>
    const sendMail = jest.fn().mockRejectedValue(new Error("SMTP failure"))
    nodemailer.createTransport.mockReturnValue({ sendMail } as any)

    const logger = require("../../../src/services/logger").logger
    const errorSpy = jest.spyOn(logger, "error").mockImplementation(() => {})

    const { sendEmail } = require("../../../src/services/email-service")

    await expect(
      sendEmail({
        to: "customer@test.com",
        subject: "Broken",
        html: "<p>fail</p>",
      })
    ).rejects.toThrow("SMTP failure")

    expect(errorSpy).toHaveBeenCalled()
  })

  test("skips sending when recipient is missing", async () => {
    const nodemailer = require("nodemailer") as jest.Mocked<typeof import("nodemailer")>
    const sendMail = jest.fn()
    nodemailer.createTransport.mockReturnValue({ sendMail } as any)

    const logger = require("../../../src/services/logger").logger
    const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {})

    const { sendEmail } = require("../../../src/services/email-service")

    await sendEmail({
      // @ts-expect-error intentionally missing recipient
      to: undefined,
      subject: "Missing",
      html: "<p>missing</p>",
    })

    expect(sendMail).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
  })
})
