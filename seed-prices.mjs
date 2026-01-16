const BACKEND_URL = "http://localhost:9000";
const EMAIL = "admin-debug@mastro.com";
const PASSWORD = "supersecret";

async function seedPrices() {
    console.log("🚀 Starting Price Seeding Request...");

    // 1. Authenticate to get token/cookie
    console.log("🔐 Authenticating as admin...");
    const authRes = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!authRes.ok) {
        console.error("❌ Auth failed:", authRes.status, await authRes.text());
        return;
    }

    const token = (await authRes.json()).token;
    const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };

    console.log("✅ Authenticated!");

    // 2. Get Products with Variants
    console.log("📦 Fetching products...");
    const productsRes = await fetch(`${BACKEND_URL}/admin/products?fields=+variants`, {
        headers: authHeaders
    });

    if (!productsRes.ok) {
        console.error("❌ Failed to get products:", await productsRes.text());
        return;
    }

    const { products } = await productsRes.json();
    console.log(`Found ${products.length} products.`);

    // 3. Update Prices for each variant
    for (const product of products) {
        console.log(`\nProcessing ${product.title}...`);

        if (!product.variants || product.variants.length === 0) {
            console.log("  ⚠️ No variants found.");
            continue;
        }

        for (const variant of product.variants) {
            console.log(`  🔹 Updating variant: ${variant.title} (${variant.id})`);

            const updateRes = await fetch(`${BACKEND_URL}/admin/products/${product.id}/variants/${variant.id}`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                    prices: [
                        {
                            currency_code: "idr",
                            amount: 100000 // Rp 100.000
                        }
                    ]
                })
            });

            if (updateRes.ok) {
                console.log("     ✅ Price set to IDR 100,000");
            } else {
                console.error("     ❌ Failed to update:", await updateRes.text());
            }
        }
    }

    console.log("\n✨ Price seeding completed!");
}

seedPrices();
