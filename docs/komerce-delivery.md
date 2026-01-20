# Komerce Delivery API (RajaOngkir Wrapper)

This project uses the Komerce (Collaborator) API for shipping fulfillment (booking orders).

## Architecture

- **Cost Calculation (Cek Ongkir)**: Uses `https://rajaongkir.komerce.id/api/v1`.
- **Delivery (Create Shipment)**: Uses `https://api.collaborator.komerce.id/` (Production) or `https://api-sandbox.collaborator.komerce.id/` (Sandbox).

## Configuration

Required Environment Variables in `.env`:

```env
# Base URL for Cost Calculation
RAJAONGKIR_BASE_URL=https://rajaongkir.komerce.id/api/v1

# Delivery Base URL (Collaborator API)
RAJAONGKIR_DELIVERY_BASE_URL=https://api-sandbox.collaborator.komerce.id/

# Endpoint for Store Order creation
RAJAONGKIR_DELIVERY_PATH=order/api/v1/orders/store

# API Keys
RAJAONGKIR_API_KEY=your_cost_calculation_key
RAJAONGKIR_API_DELIVERY_KEY=your_delivery_specific_key_if_different
```

## Endpoints

### Create Store Order

**POST** `{RAJAONGKIR_DELIVERY_BASE_URL}{RAJAONGKIR_DELIVERY_PATH}`

- **URL Example**: `https://api-sandbox.collaborator.komerce.id/order/api/v1/orders/store`
- **Headers**:
  - `Content-Type`: `application/json`
  - `X-API-Key`: `{RAJAONGKIR_API_DELIVERY_KEY}`

**Payload Structure (Strict Snake Case):**

> **Note**: All fields marked with `*` are **REQUIRED**.

```json
{
  "order_date": "2025-08-08 10:50:00",  // * Format YYYY-MM-DD HH:mm:ss
  "brand_name": "Adidas",               // *
  "shipper_name": "Adidas Store",       // *
  "shipper_phone": "6281234567890",     // * Start with 62 or 8, not 0 or +62
  "shipper_destination_id": 64933,      // * Origin District/Subdistrict ID (Int)
  "shipper_address": "Perum GBB",       // *
  "shipper_email": "admin@store.com",   // *
  "origin_pin_point": "",               // Optional (Lat, Long)
  
  "receiver_name": "Faw",               // *
  "receiver_phone": "6280123456789",    // * Start with 62 or 8
  "receiver_destination_id": 68409,     // * Destination District/Subdistrict ID (Int)
  "receiver_address": "Banjarkarta",    // *
  "receiver_email": "",                 // Optional
  "destination_pin_point": "",          // Optional
  
  "shipping": "NINJA",                  // * Courier Code (uppercased)
  "shipping_type": "Standard",          // * Service Code (from calculation)
  "shipping_cost": 39500,               // * Standard shipping cost
  "shipping_cashback": 0,               // * Discount applied (0 if none)
  "payment_method": "COD",              // * "COD" or "BANK TRANSFER"
  "service_fee": 0,                     // * 2.8% of cod_value for COD, else 0
  "additional_cost": 0,                 // * Extra costs like packaging
  "grand_total": 89500,                 // * Product + Shipping + Additional - Cashback
  "cod_value": 89500,                   // * Must match grand_total if COD, else 0? (Docs say "must match grand_total")
  "insurance_value": 0,                 // * Declared value (float)

  "order_details": [                    // * Array of products
    {
      "product_name": "Shoe",           // *
      "product_variant_name": "White",  // *
      "product_price": 50000,           // * Unit Price (Int)
      "product_weight": 2000,           // * Weight per item (Grams)
      "product_width": 50,              // * Width (cm)
      "product_height": 8,              // * Height (cm)
      "product_length": 150,            // * Length (cm)
      "qty": 1,                         // *
      "subtotal": 50000                 // * product_price * qty
    }
  ]
}
```

## Key Requirements & Gotchas

1. **Phone Numbers**: Must start with `62` or `8`. Do NOT start with `0` or `+62`.
2. **Product Dimensions**: `product_width`, `product_height`, `product_length` are **REQUIRED**. If unknown, send default (e.g., 10, 10, 10).
3. **Values**: `item_value` / `grand_total` must be accurate. `cod_value` must be equal to `grand_total` if `payment_method` is COD.
4. **Date Format**: `YYYY-MM-DD HH:mm:ss`.

## Response Codes

- **201**: Success (returns `order_no`, `order_id`).
- **400**: Bad Request (mismatch parameters, e.g. `cod_value` != `grand_total`).
- **422**: Unprocessable Entity (missing required fields).
