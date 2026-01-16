import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { logger } from "../../../services/logger"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  logger.info("RajaOngkir webhook stub", { body: req.body })
  res.json({ received: true })
}
