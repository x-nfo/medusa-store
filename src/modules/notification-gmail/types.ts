export type GmailNotificationConfig = {
  provider_id: "np_gmail"
}

export type OrderItem = {
  title: string
  quantity: number
  unit_price: string
  total: string
  thumbnail?: string
}

export type ShippingAddress = {
  first_name?: string
  last_name?: string
  address_1?: string
  city?: string
  province?: string
  postal_code?: string
  phone?: string
}

export type OrderCreatedPayload = {
  order_id: string
  display_id?: string
  total: string
  subtotal?: string
  shipping_total?: string
  tax_total?: string
  discount_total?: string
  customer_name?: string
  customer_email?: string
  items?: OrderItem[]
  shipping_address?: ShippingAddress
  payment_method?: string
  order_date?: string
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
  courier?: string
}

export type DeliveryConfirmedPayload = {
  order_id: string
  awb: string
  customer_name?: string
  delivery_date?: string
}
