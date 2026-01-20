import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { CreateEmailOptions, Resend } from "resend"
import { OrderPlacedEmail } from "./emails/order-placed"
import { logger } from "../../services/logger"

type ResendOptions = {
    api_key: string
    from: string
    html_templates?: Record<string, { subject?: string; content: string }>
}

enum Templates {
    ORDER_PLACED = "order-placed",
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "resend"
    private resendClient: Resend
    private options: ResendOptions

    constructor(container: any, options: ResendOptions) {
        super(container, options)
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
            default:
                return "New Notification"
        }
    }

    async send(
        notification: ProviderSendNotificationDTO
    ): Promise<ProviderSendNotificationResultsDTO> {
        const template = this.getTemplate(notification.template as Templates)

        if (!template) {
            logger.error(`Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`)
            return {}
        }

        const commonOptions = {
            from: this.options.from,
            to: [notification.to],
            subject: this.getTemplateSubject(notification.template as Templates),
        }

        let emailOptions: CreateEmailOptions
        if (typeof template === "string") {
            emailOptions = {
                ...commonOptions,
                html: template,
            }
        } else {
            emailOptions = {
                ...commonOptions,
                react: template(notification.data as unknown as any),
            }
        }

        const { data, error } = await this.resendClient.emails.send(emailOptions)

        if (error || !data) {
            if (error) {
                logger.error(`Failed to send email: ${error.name} - ${error.message}`)
            } else {
                logger.error("Failed to send email: unknown error")
            }
            return {}
        }

        return { id: data.id }
    }
}

export default ResendNotificationProviderService
