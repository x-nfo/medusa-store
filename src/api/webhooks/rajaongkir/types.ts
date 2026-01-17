/**
 * RajaOngkir Webhook Types
 */

export type RajaOngkirWebhookStatus =
    | "PENDING"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "RETURNED"
    | "FAILED"

export type RajaOngkirWebhookPayload = {
    /** Order ID from original shipment request */
    order_id?: string
    /** Air Waybill number */
    awb?: string
    /** Tracking number (alternative to awb) */
    tracking_number?: string
    /** Current shipment status */
    status?: RajaOngkirWebhookStatus | string
    /** Human readable status description */
    status_description?: string
    /** Courier code (e.g., jne, jnt, sicepat) */
    courier?: string
    /** Timestamp of status update */
    timestamp?: string
    /** Additional data from RajaOngkir */
    data?: Record<string, unknown>
}

export type RajaOngkirWebhookResponse = {
    received: boolean
    message?: string
    error?: string
}
