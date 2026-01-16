import { logger } from "../../../services/logger"

export default async function handler(req: any, res: any) {
  logger.info("RajaOngkir webhook received", { body: req.body })
  return res.status(200).json({ received: true })
}
