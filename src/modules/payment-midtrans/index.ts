import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MidtransPaymentService } from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [MidtransPaymentService],
})

export { MidtransPaymentService }
