import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { importProductsWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export async function POST(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const { fileKey } = req.body as { fileKey: string }

    if (!fileKey) {
        res.status(400).json({ message: "fileKey is required" })
        return
    }

    try {
        const fileService = req.scope.resolve(Modules.FILE) as any

        // 1. Get file download URL
        // fileKey usually is just the key, but we need a URL to fetch it if we want 'fileContent'.
        // If we use R2, getPresignedDownloadUrl gives us a signed URL.
        const fileUrl = await fileService.getPresignedDownloadUrl({ fileKey })
        console.log("Downloading CSV from:", fileUrl)

        // 2. Fetch content manually
        const fileRes = await fetch(fileUrl)
        if (!fileRes.ok) {
            throw new Error(`Failed to download file: ${fileRes.statusText}`)
        }
        const fileContent = await fileRes.text()

        console.log("CSV Content Length:", fileContent.length)

        // 3. Run Simple Import Workflow (No chunks, direct content)
        const { result, transaction } = await importProductsWorkflow(req.scope)
            .run({
                input: {
                    fileContent: fileContent,
                    filename: "products.csv"
                }
            })

        res.json({
            message: "Direct Content Import Workflow Triggered",
            transaction_id: transaction.transactionId,
            result
        })

    } catch (error: any) {
        console.error("Manual Import Error:", error)
        res.status(500).json({
            message: "Workflow failed",
            error: error.message,
            details: error.stack
        })
    }
}
