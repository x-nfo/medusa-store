import { z } from "zod"
import { RajaOngkirFulfillmentService } from "../../../modules/fulfillment-rajaongkir"
import { logger } from "../../../services/logger"

const shippingQuoteSchema = z.object({
  origin: z.string().min(1).optional(),
  origin_city_id: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  destination_city_id: z.string().min(1).optional(),
  courier: z.string().min(1).optional(),
  weight: z
    .preprocess(
      (val) => (val === undefined || val === null ? undefined : Number(val)),
      z.number().positive().optional()
    )
    .optional(),
  weight_grams: z
    .preprocess(
      (val) => (val === undefined || val === null ? undefined : Number(val)),
      z.number().positive().optional()
    )
    .optional(),
  couriers: z
    .union([z.array(z.string().min(1)), z.string().min(1)])
    .optional()
    .transform((value) => (Array.isArray(value) ? value : value ? [value] : [])),
  courier_list: z
    .array(z.string().min(1))
    .optional()
    .transform((value) => value ?? []),
}).superRefine((value, ctx) => {
  if (!value.destination && !value.destination_city_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "destination_city_id is required",
      path: ["destination_city_id"],
    })
  }

  const weightValue =
    value.weight_grams !== undefined && value.weight_grams !== null
      ? value.weight_grams
      : value.weight
  if (!weightValue || weightValue <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "weight_grams must be greater than 0",
      path: ["weight_grams"],
    })
  }

  const courierValue =
    value.courier ??
    (value.couriers?.length ? value.couriers.join(":") : undefined) ??
    (value.courier_list?.length ? value.courier_list.join(":") : undefined)
  if (!courierValue || courierValue.trim() === "") {
    // Optional: we default to list in handler
    // ctx.addIssue({
    //   code: z.ZodIssueCode.custom,
    //   message: "couriers is required",
    //   path: ["couriers"],
    // })
  }
})

export default async function handler(req: any, res: any) {
  try {
    const parsed = shippingQuoteSchema.parse(req.body ?? {})
    const destinationCityId =
      parsed.destination_city_id ?? parsed.destination
    const originCityId = parsed.origin_city_id ?? parsed.origin
    const weightValue =
      parsed.weight_grams !== undefined && parsed.weight_grams !== null
        ? parsed.weight_grams
        : parsed.weight

    const courierValue =
      parsed.courier ??
      (parsed.couriers?.length ? parsed.couriers.join(":") : undefined) ??
      (parsed.courier_list?.length ? parsed.courier_list.join(":") : undefined)

    // Default couriers if none provided
    // This allows dynamic expansion without frontend changes.
    // Includes Starter (jne,pos,tiki) and Pro/Enterprise (sicepat,jnt,anteraja, etc)
    const defaultCouriers = ["jne", "pos", "tiki", "sicepat", "jnt", "anteraja", "wahana", "ninja", "lion", "pahala", "sap", "jet", "indah", "dse", "slis", "first", "ncs", "star", "rex", "idestress", "sentral"]

    const courierList = courierValue
      ? courierValue
        .split(":")
        .map((value) => value.trim())
        .filter(Boolean)
      : defaultCouriers

    const service = new RajaOngkirFulfillmentService({}, {})
    const options = await service.quoteRates({
      origin_city_id: originCityId,
      destination_city_id: destinationCityId as string,
      weight_grams: weightValue as number,
      couriers: courierList,
    })

    return res.json({ options })
  } catch (e: any) {
    const message =
      e?.name === "ZodError"
        ? e?.errors?.[0]?.message || "Invalid request payload"
        : e?.message || "Internal error"
    logger.error("shipping quote error", e)
    return res.status(e?.name === "ZodError" ? 400 : 500).json({ message })
  }
}
