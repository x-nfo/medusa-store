import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { remoteQueryObjectFromString } from "@medusajs/framework/utils";

export default async function debugPriceType({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Fetching recent cart items to inspect price type...");

    const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "created_at"],
        pagination: { take: 1, order: { created_at: "DESC" } }
    });

    if (carts.length === 0) {
        logger.info("No carts found.");
        return;
    }

    const cartId = carts[0].id;

    const queryObject = remoteQueryObjectFromString({
        entryPoint: "cart",
        variables: { filters: { id: cartId } },
        fields: [
            "items.unit_price",
            "items.title"
        ],
    })

    const [cart] = await remoteQuery(queryObject);

    if (!cart || !cart.items || cart.items.length === 0) {
        logger.error("Cart or items not found.");
        return;
    }

    const item = cart.items[0];
    const price = item.unit_price;

    logger.info(`Item: ${item.title}`);
    logger.info(`Price Value: ${price}`);
    logger.info(`Type of price: ${typeof price}`);
    logger.info(`Is Array? ${Array.isArray(price)}`);
    logger.info(`Constructor Name: ${price?.constructor?.name}`);
    logger.info(`Stringify: ${JSON.stringify(price)}`);

    // Test conversion
    try {
        logger.info(`Number(price): ${Number(price)}`);
        // safe safe way
        logger.info(`parseFloat(price): ${parseFloat(price)}`);
    } catch (e: any) {
        logger.error(`Conversion failed: ${e.message}`);
    }
}
