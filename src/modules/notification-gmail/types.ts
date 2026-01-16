export type GmailNotificationConfig = {
  provider_id: "np_gmail"
}

export type OrderCreatedPayload = {
  order_id: string
  total: string
  customer_name?: string
}

export type PaymentConfirmedPayload = {
  order_id: string
  customer_name?: string
}

export type AwbCreatedPayload = {
  order_id: string
  awb: string
  tracking_url?: string
  customer_name?: string
}
