import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"

export const sendNotificationStep = createStep(
    "send-notification",
    async (data: {
        to: string
        channel: string
        template: string
        data: Record<string, unknown>
    }, { container }) => {
        const notificationModuleService = container.resolve(Modules.NOTIFICATION)

        const notification = await notificationModuleService.createNotifications({
            to: data.to,
            channel: data.channel,
            template: data.template,
            data: data.data,
        })

        return new StepResponse(notification)
    }
)
