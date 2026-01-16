// Full Midtrans Payment Flow Test
// This test adds a product to cart and initiates payment

const BACKEND_URL = "http://localhost:9000";
const PUBLISHABLE_KEY = "pk_666de95321c95ca549dc966eed1b0684e1b4d369712ac273d50c2ae3c0e052fc";

async function medusaRequest(endpoint, options = {}) {
    const url = `${BACKEND_URL}/store${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": PUBLISHABLE_KEY,
            ...options.headers,
        },
    });
    const text = await res.text();
    try {
        return { status: res.status, ok: res.ok, data: JSON.parse(text) };
    } catch {
        return { status: res.status, ok: res.ok, data: text };
    }
}

async function testFullPaymentFlow() {
    console.log("=== Full Midtrans Payment Flow Test ===\n");

    try {
        // Step 1: Get products
        console.log("Step 1: Getting products...");
        const productsRes = await medusaRequest("/products?limit=1");
        if (!productsRes.ok) {
            console.error("Failed to get products:", productsRes.data);
            return;
        }

        const products = productsRes.data.products || [];
        if (products.length === 0) {
            console.error("No products found in store!");
            return;
        }

        const product = products[0];
        const variant = product.variants?.[0];
        if (!variant) {
            console.error("Product has no variants:", product.title);
            return;
        }

        console.log(`  Found product: ${product.title}`);
        console.log(`  Variant ID: ${variant.id}`);
        console.log(`  Price: ${variant.calculated_price?.calculated_amount || variant.prices?.[0]?.amount || 'N/A'}`);

        // Step 2: Create cart
        console.log("\nStep 2: Creating cart...");
        const cartRes = await medusaRequest("/carts", { method: "POST" });
        if (!cartRes.ok) {
            console.error("Failed to create cart:", cartRes.data);
            return;
        }

        const cartId = cartRes.data.cart?.id;
        console.log(`  Cart ID: ${cartId}`);

        // Step 3: Add item to cart
        console.log("\nStep 3: Adding item to cart...");
        const addItemRes = await medusaRequest(`/carts/${cartId}/line-items`, {
            method: "POST",
            body: JSON.stringify({
                variant_id: variant.id,
                quantity: 1,
            }),
        });

        if (!addItemRes.ok) {
            console.error("Failed to add item:", addItemRes.data);
            return;
        }

        const updatedCart = addItemRes.data.cart;
        console.log(`  Items in cart: ${updatedCart?.items?.length || 0}`);
        console.log(`  Cart total: ${updatedCart?.total || 0}`);

        // Step 4: Initiate Midtrans payment
        console.log("\nStep 4: Initiating Midtrans payment...");
        const paymentRes = await medusaRequest("/payments/midtrans/snap", {
            method: "POST",
            body: JSON.stringify({
                cart_id: cartId,
                finish_url: "http://localhost:4321/checkout/success"
            }),
        });

        console.log(`  Response status: ${paymentRes.status}`);
        console.log(`  Response:`, JSON.stringify(paymentRes.data, null, 2));

        if (paymentRes.ok && paymentRes.data.redirect_url) {
            console.log("\n✅ SUCCESS! Midtrans payment initiated");
            console.log(`  Token: ${paymentRes.data.token}`);
            console.log(`  Redirect URL: ${paymentRes.data.redirect_url}`);
        } else {
            console.log("\n❌ FAILED to initiate payment");
        }

    } catch (error) {
        console.error("Error:", error.message);
    }
}

testFullPaymentFlow();
