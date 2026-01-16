# Flow Documentation

## Flow: Checkout → Midtrans → Webhook → Order updated

1. **Checkout**: Customer adds items to cart and proceeds to checkout
2. **Midtrans**: System initiates payment through Midtrans Snap
3. **Webhook**: Midtrans sends payment status update
4. **Order updated**: System updates order status based on payment result

## Flow: Shipping quote → generate AWB

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