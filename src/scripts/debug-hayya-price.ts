import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function debugHayyaPrice({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Fetching 'Hayya - Black' variant...");

    const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: [
            "id",
            "title",
            "sku",
            "prices.amount",
            "prices.currency_code",
        ],
        filters: {
            sku: "HAYYA-BLACK-S-BLACK" // Trying precise SKU from seed logic
        }
    });

    if (variants.length === 0) {
        // Try fuzzy search
        logger.info("Direct SKU match failed, trying fuzzy search...");
        const { data: allVariants } = await query.graph({
            entity: "product_variant",
            fields: ["id", "title", "sku", "prices.amount", "prices.currency_code"],
            pagination: { take: 1000 }
        });
        const match = allVariants.find((v: any) => v.title.includes("Hayya") && v.title.includes("Black") && v.title.includes("S"));
        if (match) {
            logVariant(logger, match);
        } else {
            logger.warn("Variant 'Hayya - Black - S' not found.");
        }
    } else {
        logVariant(logger, variants[0]);
    }
}

function logVariant(logger: any, variant: any) {
    logger.info("--- Variant Details ---");
    logger.info(`ID: ${variant.id}`);
    logger.info(`Title: ${variant.title}`);
    logger.info(`SKU: ${variant.sku}`);
    logger.info(`Prices:`);
    variant.prices.forEach((p: any) => {
        logger.info(` - ${p.amount} ${p.currency_code}`);
    });
}
