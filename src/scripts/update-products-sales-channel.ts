import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils";

/**
 * Update existing Karima products to use the correct sales channel
 * This script links all Karima products to "Website - karimasyari.com" sales channel
 */
export default async function updateProductsSalesChannel({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const link = container.resolve(ContainerRegistrationKeys.LINK);
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);

    logger.info("Starting sales channel update for Karima products...");

    // Get the Website sales channel
    const salesChannels = await salesChannelModuleService.listSalesChannels({
        name: "Website - karimasyari.com",
    });

    if (!salesChannels.length) {
        throw new Error("Website - karimasyari.com sales channel not found. Please create it first.");
    }

    const websiteSalesChannel = salesChannels[0];
    logger.info(`Found sales channel: ${websiteSalesChannel.name} (${websiteSalesChannel.id})`);

    // Get all Karima products (by category or handle pattern)
    const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title", "handle"],
        filters: {
            // Get products with handles that match Karima naming patterns
            handle: [
                "hayya-black", "hayya-choco",
                "saliha-almond", "saliha-wood",
                "katta-terracotta", "katta-dusty-pink", "katta-olive", "katta-moss", "katta-sage", "katta-tosca",
                "safa-navy", "safa-jeans", "safa-blue", "safa-light-blue",
                "marwah-navy", "marwah-jeans", "marwah-blue", "marwah-light-blue",
                "khimar", "khimar-bandana"
            ],
        },
    });

    if (!products || products.length === 0) {
        logger.warn("No Karima products found. They may not have been seeded yet.");
        return;
    }

    logger.info(`Found ${products.length} Karima products to update.`);

    // Update each product's sales channel using link module
    for (const product of products) {
        try {
            logger.info(`Updating product: ${product.title} (${product.handle})...`);

            // Use link module to create product-sales channel association
            await link.create({
                [Modules.PRODUCT]: {
                    product_id: product.id,
                },
                [Modules.SALES_CHANNEL]: {
                    sales_channel_id: websiteSalesChannel.id,
                },
            });

            logger.info(`✓ Updated ${product.title}`);
        } catch (error: any) {
            // Ignore if link already exists
            if (error.message?.includes("already exists")) {
                logger.info(`✓ ${product.title} already linked`);
            } else {
                logger.error(`Failed to update ${product.title}: ${error.message}`);
            }
        }
    }

    logger.info(`Successfully updated ${products.length} products to use ${websiteSalesChannel.name}!`);
}
