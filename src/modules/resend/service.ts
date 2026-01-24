import { render } from "@react-email/render"
import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { CreateEmailOptions, Resend } from "resend"
import { OrderPlacedEmail } from "./emails/order-placed"
import { DeliveryConfirmedEmail } from "./emails/delivery-confirmed"
import { logger } from "../../services/logger"

type ResendOptions = {
    api_key: string
    from: string
    html_templates?: Record<string, { subject?: string; content: string }>
}

enum Templates {
    ORDER_PLACED = "order-placed",
    DELIVERY_CONFIRMED = "delivery-confirmed",
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "resend"
    private resendClient: Resend
    private options: ResendOptions

    constructor(container: any, options: ResendOptions) {
        super()
        this.options = options

        if (!this.options.api_key) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Resend API key is required"
            )
        }

        if (!this.options.from) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                "Resend from email is required"
            )
        }

        this.resendClient = new Resend(this.options.api_key)
    }

    private getTemplate(template: Templates) {
        if (this.options.html_templates?.[template]) {
            return this.options.html_templates[template].content
        }

        switch (template) {
            case Templates.ORDER_PLACED:
                return OrderPlacedEmail
            case Templates.DELIVERY_CONFIRMED:
                return DeliveryConfirmedEmail
            default:
                return null
        }
    }

    private getTemplateSubject(template: Templates) {
        if (this.options.html_templates?.[template]?.subject) {
            return this.options.html_templates[template].subject
        }

        switch (template) {
            case Templates.ORDER_PLACED:
                return "Order Confirmation"
            case Templates.DELIVERY_CONFIRMED:
                return "Paket Anda Telah Diterima!"
            default:
                return "New Notification"
        }
    }

    async send(
        notification: ProviderSendNotificationDTO
    ): Promise<ProviderSendNotificationResultsDTO> {
        logger.info(`[Resend] send() called with template: ${notification.template}, to: ${notification.to}`)

        const template = this.getTemplate(notification.template as Templates)

        if (!template) {
            logger.error(`[Resend] Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`)
            return {}
        }

        logger.info(`[Resend] Template found, preparing email...`)

        const commonOptions = {
            from: this.options.from,
            to: [notification.to],
            subject: this.getTemplateSubject(notification.template as Templates),
        }

        logger.info(`[Resend] From: ${commonOptions.from}, Subject: ${commonOptions.subject}`)

        let emailOptions: CreateEmailOptions
        if (typeof template === "string") {
            emailOptions = {
                ...commonOptions,
                html: template,
            }
        } else {
            logger.info(`[Resend] Rendering React email template...`)
            try {
                const html = await render(template(notification.data as unknown as any))
                emailOptions = {
                    ...commonOptions,
                    html: html,
                }
                logger.info(`[Resend] Template rendered successfully (${html.length} chars)`)
            } catch (renderError: any) {
                logger.error(`[Resend] Failed to render template: ${renderError.message}`)
                return {}
            }
        }

        logger.info(`[Resend] Sending email via Resend API...`)

        try {
            const { data, error } = await this.resendClient.emails.send(emailOptions)

            if (error || !data) {
                if (error) {
                    logger.error(`[Resend] API Error: ${error.name} - ${error.message}`)
                } else {
                    logger.error("[Resend] API returned no data and no error")
                }
                return {}
            }

            logger.info(`[Resend] ✅ Email sent successfully! ID: ${data.id}`)
            return { id: data.id }
        } catch (apiError: any) {
            logger.error(`[Resend] Exception during send: ${apiError.message}`)
            return {}
        }
    }
}

export default ResendNotificationProviderService
