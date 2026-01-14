import nodemailer from "nodemailer"
import { logger } from "./logger"

export type SendEmailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

const GMAIL_USER = process.env.GMAIL_USER
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD

export const emailTransporter = (() => {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    logger.warn("Gmail SMTP not configured. Emails will fail until env is set.")
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  })
})()

export async function sendEmail(input: SendEmailInput) {
  const fromName = process.env.EMAIL_FROM_NAME || "Syari Store"
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || GMAIL_USER || "no-reply@example.com"

  logger.info("Sending email", { to: input.to, subject: input.subject })

  await emailTransporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text || input.html.replace(/<[^>]+>/g, " "),
  })
}
