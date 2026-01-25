import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixCartPricesAndTotals({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const cartModule = container.resolve(Modules.CART);
    const productModule = container.resolve(Modules.PRODUCT);

    logger.info("Starting Cart Price and Total Fix...");

    // 1. Find Line Items with 0 price
    // We scan recent carts (last 50) and check their items
    const { data: carts } = await query.graph({
        entity: "cart",
        fields: [
            "id",
            "currency_code",
            "region_id",
            "total",
            "subtotal",
            "shipping_total",
            "items.id",
            "items.title",
            "items.unit_price",
            "items.quantity",
            "items.variant_id"
        ],
        pagination: { take: 50, order: { created_at: "DESC" } }
    });

    let fixedItemsCount = 0;
    let fixedCartsCount = 0;

    for (const cart of carts) {
        let cartNeedsUpdate = false;
        let newSubtotal = 0;

        // Check Items
        for (const item of cart.items) {
            const currentPrice = Number(item.unit_price);

            if (currentPrice === 0 || isNaN(currentPrice)) {
                if (!item.variant_id) continue;

                logger.info(`Found 0 price item: ${item.title} (Cart: ${cart.id})`);

                // Fetch Variant Price
                // We need price for currency or region
                const { data: [variant] } = await query.graph({
                    entity: "product_variant",
                    fields: ["prices.amount", "prices.currency_code"],
                    filters: { id: item.variant_id }
                });

                if (variant) {
                    const priceObj = variant.prices.find((p: any) => p.currency_code === cart.currency_code);
                    if (priceObj) {
                        const correctPrice = priceObj.amount;
                        logger.info(` > Updating price to: ${correctPrice}`);

                        // Update Line Item
                        await cartModule.updateLineItems(item.id, {
                            unit_price: correctPrice
                        });

                        item.unit_price = correctPrice; // Update local ref for total calc
                        fixedItemsCount++;
                        cartNeedsUpdate = true;
                    } else {
                        logger.warn(` > No price found for currency ${cart.currency_code}`);
                    }
                }
            }
            newSubtotal += Number(item.unit_price) * item.quantity;
        }

        // Check Totals
        // Even if items weren't 0, total might be wrong (missing shipping)
        const currentTotal = Number(cart.total);
        const shipping = Number(cart.shipping_total || 0);
        const expectedTotal = newSubtotal + shipping;

        // Force update totals if mismatch AND (we updated items OR total is just wrong)
        if (Math.abs(currentTotal - expectedTotal) > 1 || cartNeedsUpdate) {
            logger.info(`Fixing Cart ${cart.id} Totals...`);
            logger.info(` > Old Total: ${currentTotal} | Expected: ${expectedTotal} (Sub: ${newSubtotal} + Ship: ${shipping})`);

            // We update the cart. 
            // Note: Updating cart usually triggers calculation hooks, but simple update might not.
            // We explicitly set the values.
            await cartModule.updateCarts(cart.id, {
                // @ts-ignore
                subtotal: newSubtotal,
                total: expectedTotal
            });
            fixedCartsCount++;
        }
    }

    logger.info(`Fixed ${fixedItemsCount} items and ${fixedCartsCount} carts.`);
}
