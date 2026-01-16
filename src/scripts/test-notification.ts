
import { GmailNotificationService } from "../modules/notification-gmail"
import { logger } from "../services/logger"

export default async function main() {
    console.log("Starting notification test...")

    const service = new GmailNotificationService()

    // Get email from command line arg or fallback to GMAIL_USER
    // args[2] is usually the first custom arg in "medusa exec" context depending on how it's invoked, 
    // but let's look for a simple string in the args that looks like an email or just take the last one.
    const args = process.argv.slice(2);
    const customEmail = args.find(arg => arg.includes("@"));

    const testEmail = customEmail || process.env.GMAIL_USER || "test@example.com"
    console.log(`Sending test email to: ${testEmail}`)
    if (!customEmail) {
        console.log("Tip: You can pass an email address as an argument to send to a specific user.")
    }

    try {
        await service.sendOrderCreated(testEmail, {
            order_id: "#TEST-123",
            total: "Rp 150.000,00",
            customer_name: "Test User"
        })
        console.log("Test email sent successfully!")
    } catch (error) {
        console.error("Failed to send test email:", error)
        process.exit(1)
    }
}
