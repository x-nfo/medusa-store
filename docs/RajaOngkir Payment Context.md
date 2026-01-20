Welcome to the Komerce Payment API — a simple, secure, and flexible payment solution that allows you to accept and manage transactions through Virtual Accounts (VA) and QRIS seamlessly.

This API is designed for developers and businesses that need to integrate payment capabilities directly into their applications or systems.

Whether you’re running an e-commerce platform, a digital service, or a mobile app, Komerce Payment provides a unified way to handle payments, confirmations, and settlements efficiently.

The Komerce Payment API supports two main environments:

Environment Base URL Description
Sandbox
Used for development and testing with simulated transactions.
Production
Live environment for real payment transactions.
 note
💡 The Sandbox environment behaves like a real payment flow but uses simulated payment actions (for example, clicking a “Simulate Payment” button on the sandbox payment page).

Virtual Account (VA) Payments — Automatically generate and track payments using various bank VAs.
QRIS Payments — Accept QR-based payments from any QRIS-supported mobile banking or e-wallet.
Payment Callback — Get instant notifications via webhook when a transaction status changes.
Sandbox Mode — Safely test payment flows before going live.
Dashboard Integration — Manage and monitor transactions in one place.

All API requests require a valid API Key, which can be generated from your Merchant Dashboard.

The API uses Bearer Token Authentication:

key: YOUR_API_KEY
⚠️ Keep your API keys secure and never expose them in public repositories or client-side code.

Channel Description
VA – BCA, BNI, BRI, Mandiri, Permata, etc
Virtual Account payments across supported banks.
QRIS
Dynamic QR code generated per transaction for multi-platform payments.

Ready to start?

Continue to the Endpoint guide to learn how to create your first transaction and test it in sandbox mode.

All requests are made through the following base URLs:

Environment Base URL
Sandbox <https://api-sandbox.collaborator.komerce.id/user?_gl=1*oxxbu8*_gcl_au*MjEzOTMwODM3Mi4xNzY2MDUwODA0LjUxNzM3NDk1My4xNzY2NjU0OTA1LjE3NjY2NTQ5MDU>.
Production <https://api.collaborator.komerce.id/user?_gl=1*oxxbu8*_gcl_au*MjEzOTMwODM3Mi4xNzY2MDUwODA0LjUxNzM3NDk1My4xNzY2NjU0OTA1LjE3NjY2NTQ5MDU>.
💡 Use the Sandbox environment for testing purposes before switching to Production.

Every request to the Payment API must include an API Key for authentication.

You can find your API Key in the Merchant Dashboard after registration.

Example Header:

-H "x-api-key: YOUR_API_KEY"
-H "Content-Type: application/json"
⚠️ Never expose your API key in client-side code or public repositories.

Here are the main endpoints to get you started:

Endpoint Method Description
/methods
GET
Retrieve payment methods and Banks Code
/create
POST
Create a new payment transaction
/status/{id}
GET
Retrieve payment status by transaction ID
/callback
POST
Receive payment notifications from the gateway
Here’s an example of how to create a new transaction:

curl --location '<https://api-sandbox.collaborator.komerce.id/user/api/v1/user/payment/create>' \
--header 'x-api-key: YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
"order_id": (required),
"payment_type": "bank_transfer",
"channel_code": string (required, valid bank code),
"amount": integer (required, min 10.000),
"customer": {
"name": string (required),
"email": string (required, valid email),
"phone": string (required)
},
"items": [
{
  "name": string (required),
  "quantity": integer (required),
  "price": integer (required)
}
],
"expiry_duration": integer (optional, minimal 3600 seconds),
"callback_url": string (optional, valid URL),
"callback_api_key": (required if callback_url is filled, generate by user)
}'
You can test your setup using sandbox mode. Payments in sandbox mode are simulated — no real charges occur.

The Komerce Payment API provides a unified interface for managing payment transactions through Virtual Accounts (VA) and QRIS.

It is built payment infrastructure, allowing merchants to integrate multiple payment methods with a single, consistent API layer.

This API is designed to help you:

Display available payment methods (VA & QRIS) to customers
Create payment requests via Virtual Account or QRIS
Check the real-time status of payments
Support testing in sandbox mode before going live in production
Below is the standard flow of a payment transaction using the Komerce Payment API:

Fetch Available Payment Methods → GET /api/v1/user/methods Retrieve a list of available banks for Virtual Account (BNI, BCA, Mandiri, etc.) and QRIS availability. This ensures your frontend can dynamically display supported payment options.

Create Payment Transaction

Initiate a payment request to generate a VA number or QRIS QR code. Each transaction is registered in the Komerce system.

Customer Payment Process The customer completes payment via their selected channel (bank transfer or QR scan). The status will be updated automatically.

Check Payment Status → GET /api/v1/user/payment/status/{payment_id} Retrieve current transaction status (PENDING, PAID, or EXPIRED) and related payment details. You can use this endpoint to verify successful payments or handle timeouts.

# Endpoint Description Payment Type Auth Required

1
GET /api/v1/user/methods
Retrieve list of available payment methods
VA & QRIS
✅
2
POST /api/v1/user/payment/create
Create a payment transaction via Virtual Account and QRIS
VA & QRIS
✅
4
GET /api/v1/user/payment/status/{payment_id}
Check transaction status
VA & QRIS
✅

The Komerce Payment API offers transparent and competitive pricing for each payment channel. Transaction fees are charged directly to the Collaborator (merchant) based on the payment method used.

Component Fee
Transaction Fee (Flat)
IDR 4,440 per transaction
Example:

If a customer makes a payment of IDR 100,000, the total fee would be:

Transaction Fee  : IDR 4,440
--------------------------------

Total Fee        : IDR 4,440
💡 The total fee already includes VAT and will be automatically deducted from the settlement amount.

Component Fee
Transaction Fee (Percentage)
0.99% of the transaction amount
Example:

If a customer makes a payment of IDR 100,000, the total fee would be:

QRIS Fee (0.99%) : IDR 990
--------------------------------

Total Fee         : IDR 990
💡 This total fee also includes VAT and will be automatically deducted from the settlement amount.

Payment Method Fee Structure Effective Total Fee VAT Included
Virtual Account (VA)
IDR 4,440 per transaction
± IDR 4,440
✅
QRIS
0.99% per transaction
± 0.99%
✅
All fees already include Value Added Tax (VAT) as required by Indonesian regulations.
Fees are automatically deducted from each transaction settlement.
There are no additional charges for API activation, integration, or sandbox testing.
Settlement to merchant bank accounts follows Komerce’s payout schedule and policies.
Fee structures may change over time based on regulations or policy updates — please check this page regularly for the latest information.

Komerce Payment API supports two environments:

Production: <https://api.collaborator.komerce.id/user>
Sandbox: <https://api-sandbox.collaborator.komerce.id/user>
Use sandbox mode for testing payment flows without actual transactions. You can simulate payment status updates in sandbox environment.

Payment Page URLs:

Production: <https://pay.komerce.id/{token}>
Sandbox: <https://pay-sandbox.komerce.id/{token}>

GET /api/v1/user/methods

Retrieve a list of available payment methods including Virtual Account banks and QRIS.

Use Case: Display payment options to customers during checkout.

Authentication: Required (API Key in header)

{
    "meta": {
        "message": "success get payment methods",
        "code": 200,
        "status": "success"
    },
    "data": [
        {
            "payment_type": "va",
            "display_name": "Bank Central Asia",
            "bank_code": "BCA",
            "logo_url": "https://storage.googleapis.com/komerce/assets/logo/bca.png",
            "min_amount": 10000,
            "max_amount": 999999999999,
            "currency": "IDR"
        },
        {
            "payment_type": "qris",
            "display_name": "QRIS",
            "bank_code": "",
            "logo_url": "https://storage.googleapis.com/komerce/assets/logo/qris.png",
            "min_amount": 10000,
            "max_amount": 10000000,
            "currency": "IDR"
        }
    ]
}
Features:

Lists all supported VA banks (BNI, BCA, Mandiri, BRI, Permata, CIMB, BSI, BJB, etc.)
QRIS availability information
Bank logos and display names
Cached responses (1 hour TTL) for optimal performance
Response time < 500ms

POST /api/v1/user/payment/create

Create a payment transaction using Virtual Account (bank transfer).

Use Case: Generate VA number for customers to complete payment via bank transfer.

Authentication: Required (API Key in header)

{
    "order_id": "KOM12345",
    "payment_type": "bank_transfer",
    "channel_code": "BCA",
    "amount": 100000,
    "customer": {
        "name": "John Doe",
        "email": "<john@example.com>",
        "phone": "081234567890"
    },
    "items": [
        {
            "name": "Product A",
            "quantity": 2,
            "price": 50000
        }
    ],
    "expiry_duration": 3600,
    "callback_url": "<https://yoursite.com/callback>",
    "callback_API_KEY": "your-generated-key"
}
Validation Rules:

order_id: Required, max 100 characters
channel_code: Must be from available banks list
amount: Required, minimum Rp 10,000
expiry_duration: Minimum 3600 seconds (1 hour)
callback_API_KEY: Required if callback_url is provided
Response Time: < 2-5 seconds

POST /api/v1/user/payment/create

Create a payment transaction using QRIS (Quick Response Code Indonesian Standard).

Use Case: Generate QR code for customers to scan and pay via e-wallet apps.

Authentication: Required (API Key in header)

{
    "order_id": "KOM12345",
    "payment_type": "qris",
    "amount": 100000,
    "customer": {
        "name": "John Doe",
        "email": "<john@example.com>",
        "phone": "081234567890"
    },
    "items": [
        {
            "name": "Product A",
            "quantity": 2,
            "price": 50000
        }
    ],
    "callback_url": "<https://yoursite.com/callback>",
    "callback_API_KEY": "your-generated-key"
}
Key Differences from VA:

No channel_code required
Fixed expiration: 5 minutes (QRIS standard)
Returns qr_string to generate QR code image
Minimum amount: Rp 10,000
Response Time: < 2-5 seconds

GET /api/v1/user/payment/status/{payment_id}

Check the current status of a payment transaction.

Use Case: Verify if customer has completed payment, useful for order confirmation.

Authentication: Required (API Key in header)

curl --location '<https://api-sandbox.collaborator.komerce.id/user/api/v1/user/payment/status/{payment_id}>' \
--header 'x-api-key: YOUR_API_KEY'
Payment Status Values:

PENDING: Waiting for customer payment
PAID: Payment completed successfully
EXPIRED: Payment period has ended
CANCELED: Payment was canceled
Features:

Real-time status checking
Settlement amount calculation included
Payment method details (when paid)
Response time < 300ms
Rate limiting: 1 request per 3 seconds per payment_id

POST /api/v1/user/payment/cancel

Cancel a pending payment transaction.

Use Case: Prevent customer from paying after order cancellation.

Authentication: Required (API Key in header)

{
    "payment_id": "KOMPAY-1699012345-A1B2C3",
    "reason": "Customer canceled the order"
}
Validation Rules:

Only PENDING payments can be canceled
PAID or EXPIRED payments cannot be canceled
payment_id must be valid and exist in database
Behavior:

For VA: Deactivates virtual account
For QRIS: No action needed (expires automatically)
Logs cancellation reason and timestamp
Response Time: < 2 seconds

All endpoints require authentication using your API Key. Include it in the request header:

# Production

curl --location '<https://api.collaborator.komerce.id/user/api/v1/user/methods>' \
--header 'x-api-key: YOUR_API_KEY'

# Sandbox

curl --location '<https://api-sandbox.collaborator.komerce.id/user/api/v1/user/methods>' \
--header 'x-api-key: YOUR_API_KEY'
Code Description
200
Success
400
Bad Request (invalid parameters)
401
Unauthorized (invalid API key)
404
Not Found (payment_id doesn't exist)
500
Internal Server Error

Never share your key publicly or include it in client-side code
Use environment variables to store your API key securely
Checkout Page: Call GET /api/v1/user/methods to display payment options
Create Payment: Call POST /api/v1/user/payment/create when customer selects payment method
Status Monitoring: Use GET /api/v1/user/payment/status/ to check payment completion
Order Cancellation: Call POST /api/v1/user/payment/cancel if order is canceled before payment
Always provide callback_url for real-time payment notifications
Secure your callback endpoint with callback_API_KEY
Verify the authenticity of callback requests
🧑‍💻 Development/Testing: Use sandbox environment

Simulate payment status updates
No real transactions
🚀 Production: Use production environment

Real payment processing
Actual money transfer
Status check: Maximum 1 request per 3 seconds per payment_id
Implement proper retry mechanisms with exponential backoff
Feature Virtual Account QRIS
Expiry Time
Customizable (min 1 hour)
Fixed 5 minutes
Bank Selection
Required
Not needed
Payment Method
Bank Transfer
E-wallet Scan
Best For
Large amounts, B2B
Quick payments, retail
Unique Identifier
VA Number
QR Code
