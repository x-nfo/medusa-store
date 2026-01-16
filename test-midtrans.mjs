// Test Midtrans Payment Flow
const BACKEND_URL = "http://localhost:9000";
const PUBLISHABLE_KEY = "pk_666de95321c95ca549dc966eed1b0684e1b4d369712ac273d50c2ae3c0e052fc";

async function testPaymentFlow() {
    try {
        console.log("Step 1: Creating cart...");
        const cartRes = await fetch(`${BACKEND_URL}/store/carts`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-publishable-api-key": PUBLISHABLE_KEY,
            },
        });

        if (!cartRes.ok) {
            const err = await cartRes.text();
            console.error("Cart creation failed:", cartRes.status, err);
            return;
        }

        const cartData = await cartRes.json();
        const cartId = cartData.cart?.id;
        console.log("Cart created:", cartId);

        if (!cartId) {
            console.error("No cart ID returned");
            return;
        }

        console.log("\nStep 2: Testing Midtrans Snap endpoint...");
        const snapRes = await fetch(`${BACKEND_URL}/store/payments/midtrans/snap`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-publishable-api-key": PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ cart_id: cartId }),
        });

        const snapText = await snapRes.text();
        console.log("Snap response status:", snapRes.status);

        try {
            const snapData = JSON.parse(snapText);
            console.log("Snap response:", JSON.stringify(snapData, null, 2));
        } catch {
            console.log("Snap response (raw):", snapText);
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testPaymentFlow();
