## Project Scope (V1)

- Backend: Medusa self-host
- Payment: Midtrans Snap
- Shipping: RajaOngkir Enterprise (Delivery/Order)
- Notifications: Email only (Gmail SMTP)
- Flash Sale: enabled (anti-oversell)
- Preorder (PO): OUT OF SCOPE V1
- WhatsApp: OUT OF SCOPE V1

### Cara Run Dev

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`

### Cara Jalanin Test

1. Run integration tests: `npm test`
2. Run specific test: `npm test -- test/integration/api/midtrans-webhook.spec.ts`

### Cara Deploy

1. Build the application: `npm run build`
2. Deploy to your server

## Flow Documentation

### Flow: Checkout → Midtrans → Webhook → Order updated

1. **Checkout**: Customer adds items to cart and proceeds to checkout
2. **Midtrans**: System initiates payment through Midtrans Snap
3. **Webhook**: Midtrans sends payment status update
4. **Order updated**: System updates order status based on payment result

### Flow: Shipping quote → generate AWB

1. **Shipping quote**: Customer requests shipping quote
2. **Generate AWB**: System generates AWB (Air Waybill) number
3. **Shipping confirmation**: System confirms shipping details

## Email Sending Events

- Order placed
- Payment captured
- Shipment created
- Order updated status
- Shipping notification
- Order failed notification

## Frontend Integration

### Shipping Quote Endpoint (RajaOngkir)

- Method: `POST`
- URL: `/store/shipping/quote`
- Headers: `Content-Type: application/json`
- Required fields:
  - `destination` or `destination_city_id` (string city id)
  - `weight` or `weight_grams` (number grams)
  - `courier` (string, `:`-separated) or `couriers` (array of string)
- Optional fields:
  - `origin` or `origin_city_id` (string city id). If omitted, backend uses `RAJAONGKIR_ORIGIN_CITY_ID`.

Request example (preferred, aligns with RajaOngkir domestic cost API):
```json
{
  "origin": "153",
  "destination": "153",
  "weight": 300,
  "courier": "jne:sicepat:jnt"
}
```

Request example (legacy array format):
```json
{
  "origin_city_id": "153",
  "destination_city_id": "153",
  "weight_grams": 300,
  "couriers": ["jne", "sicepat", "jnt"]
}
```

Response example:
```json
{
  "options": [
    {
      "courier": "jne",
      "service": "standard",
      "service_code": "REG",
      "etd": "2-3",
      "price": 18000
    }
  ]
}
```
