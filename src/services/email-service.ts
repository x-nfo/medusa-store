import nodemailer, { Transporter } from "nodemailer"
import { logger } from "./logger"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD
const FROM_NAME = process.env.EMAIL_FROM_NAME
const FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? GMAIL_USER
const USE_JSON_TRANSPORT =
  process.env.EMAIL_TRANSPORT === "json" || process.env.NODE_ENV === "test"

let emailTransporter: Transporter | null = null

const buildTransporter = () => {
  if (USE_JSON_TRANSPORT) {
    logger.info("Email service using json transport (no outbound SMTP)")
    return nodemailer.createTransport({ jsonTransport: true })
  }

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    logger.warn(
      "Gmail SMTP is not configured (missing GMAIL_USER or GMAIL_APP_PASSWORD). Emails will not be sent."
    )
    return null
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  })
}

const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()

export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!input?.to) {
    logger.warn("Email send skipped: missing recipient", {
      subject: input?.subject,
    })
    return
  }

  try {
    if (!emailTransporter) {
      emailTransporter = buildTransporter()
    }

    if (!emailTransporter) {
      logger.warn("Email send skipped: transporter not available")
      return
    }

    const fromName = FROM_NAME || "Syari Store"
    const fromAddress = FROM_ADDRESS || GMAIL_USER || "no-reply@example.com"

    const info = await emailTransporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
    })

    logger.info("Email sent", {
      to: input.to,
      subject: input.subject,
      messageId: info?.messageId,
    })
  } catch (error: any) {
    logger.error("Failed to send email", {
      to: input.to,
      subject: input.subject,
      error: error?.message ?? error,
    })
    // Do not throw error to avoid crashing the request
  }
}
