import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MidtransPaymentProvider } from "./service"

export default ModuleProvider(Modules.PAYMENT, {
    services: [MidtransPaymentProvider],
})

export { MidtransPaymentProvider }
