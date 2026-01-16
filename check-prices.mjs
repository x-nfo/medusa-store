const BACKEND_URL = "http://localhost:9000";
// Pub key for store access
const PUBLISHABLE_KEY = "pk_666de95321c95ca549dc966eed1b0684e1b4d369712ac273d50c2ae3c0e052fc";

async function checkPrices() {
    console.log("Checking Product Prices for Storefront...\n");

    try {
        // 1. Get Regions to see what currency is needed
        const regionsRes = await fetch(`${BACKEND_URL}/store/regions`, {
            headers: { "x-publishable-api-key": PUBLISHABLE_KEY }
        });
        const { regions } = await regionsRes.json();
        console.log(`Regions found: ${regions.length}`);
        regions.forEach(r => console.log(`- ${r.name} (${r.currency_code})`));

        // 2. Get Products
        const productsRes = await fetch(`${BACKEND_URL}/store/products?fields=+variants.prices`, {
            headers: { "x-publishable-api-key": PUBLISHABLE_KEY }
        });
        const { products } = await productsRes.json();

        console.log(`\nProducts found: ${products.length}\n`);

        products.forEach(p => {
            console.log(`📦 [${p.title}]`);
            if (!p.variants || p.variants.length === 0) {
                console.log("   ❌ No variants!");
                return;
            }

            p.variants.forEach(v => {
                console.log(`   🔸 Variant: ${v.title}`);
                const prices = v.prices || [];
                if (prices.length === 0) {
                    console.log("      ❌ NO PRICES SET");
                } else {
                    prices.forEach(price => {
                        console.log(`      ✅ ${price.currency_code.toUpperCase()} ${price.amount}`);
                    });
                }
            });
            console.log("");
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkPrices();
