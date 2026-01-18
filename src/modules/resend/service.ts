import {
    AbstractNotificationProviderService,
    MedusaError
} from "@medusajs/framework/utils"
import {
    Logger,
    ProviderSendNotificationDTO,
    ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"
import {
    Resend,
    CreateEmailOptions
} from "resend"
import { OrderPlacedEmail } from "./emails/order-placed"

type ResendOptions = {
    api_key: string
    from: string
    html_templates?: Record<string, {
        subject?: string
        content: string
    }>
}

enum Templates {
    ORDER_PLACED = "order_placed",
}

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "notification-resend"
    private resendClient: Resend
    private options: ResendOptions
    private logger: Logger

    constructor({ logger }: { logger: Logger }, options: ResendOptions) {
        super()
        this.logger = logger
        this.options = options
        this.resendClient = new Resend(options.api_key)
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
                return "Notification"
        }
    }

    async send(
        notification: ProviderSendNotificationDTO
    ): Promise<ProviderSendNotificationResultsDTO> {
        const template = this.getTemplate(notification.template as Templates)

        if (!template) {
            this.logger.error(`Couldn't find an email template for ${notification.template}. The valid options are ${Object.values(Templates)}`)
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
                this.logger.error(`Failed to send email: ${error.name} - ${error.message}`)
            } else {
                this.logger.error("Failed to send email: unknown error")
            }
            return {}
        }

        return { id: data.id }
    }
}

export default ResendNotificationProviderService
