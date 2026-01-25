import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { remoteQueryObjectFromString } from "@medusajs/framework/utils";

export default async function debugHayyaCart({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Searching for carts containing 'Hayya' products...");

    // Find carts with items matching "Hayya"
    // Since we can't easily filter carts by item title in standard query, we'll fetch recent carts and check items
    // This is inefficient but fine for debugging a single user's dev env

    const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "created_at"],
        pagination: { take: 50, order: { created_at: "DESC" } }
    });

    let targetCartId = null;

    logger.info(`Checking last ${carts.length} carts...`);

    for (const c of carts) {
        const cartQ = remoteQueryObjectFromString({
            entryPoint: "cart",
            variables: { filters: { id: c.id } },
            fields: [
                "id",
                "items.title",
                "items.unit_price",
                "total",
                "subtotal",
                "shipping_total",
                "payment_collection.payment_sessions.data"
            ],
        });
        const [cart] = await remoteQuery(cartQ);

        const hasHayya = cart.items.some((i: any) => i.title.toLowerCase().includes("hayya"));
        if (hasHayya) {
            targetCartId = cart.id;
            logger.info(`Found target cart: ${cart.id}`);

            logger.info("--- Cart Details ---");
            logger.info(`Total: ${cart.total}`);
            logger.info(`Subtotal: ${cart.subtotal}`);
            logger.info(`Shipping Total: ${cart.shipping_total}`);
            logger.info(`Shipping Total Type: ${typeof cart.shipping_total}`);

            cart.items.forEach((item: any) => {
                logger.info(` > Item: ${item.title}`);
                logger.info(`   Unit Price: ${item.unit_price}`);
                logger.info(`   Type: ${typeof item.unit_price}`);
                logger.info(`   Value: ${Number(item.unit_price)}`);
            });

            // Check Payment Session Data if available (what was sent to Midtrans)
            if (cart.payment_collection?.payment_sessions?.length) {
                const session = cart.payment_collection.payment_sessions[0];
                logger.info("--- Payment Session Data ---");
                logger.info(`Provider: ${session.provider_id}`);
                // Only show relevant fields
                logger.info(`Amount: ${session.amount}`);
            }

            break;
        }
    }

    if (!targetCartId) {
        logger.warn("No cart found with 'Hayya' products in the last 10 carts.");
    }
}
