import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { RajaOngkirFulfillmentService } from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [RajaOngkirFulfillmentService],
})

export { RajaOngkirFulfillmentService }
export * from "./types"
