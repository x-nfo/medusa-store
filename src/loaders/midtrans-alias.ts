
import { MedusaContainer } from "@medusajs/framework/types"
import { asFunction } from "awilix"
import { MidtransPaymentService } from "../modules/payment-midtrans/service"

export default async function midtransLoader({ container }: { container: MedusaContainer }) {
    // Check if already registered to avoid overwriting if something changes in core
    if (!container.hasRegistration("pp_midtrans")) {
        container.register({
            "pp_midtrans": asFunction((cradle) => new MidtransPaymentService(cradle, {
                isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
                serverKey: process.env.MIDTRANS_SERVER_KEY,
                clientKey: process.env.MIDTRANS_CLIENT_KEY,
            })).singleton(),
        })
    }
}
