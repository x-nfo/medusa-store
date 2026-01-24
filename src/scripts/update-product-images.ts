import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
} from "@medusajs/framework/utils";

/**
 * Update existing Karima product images to use correct URL
 * Changes from https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev
 * to https://media.karimasyari.com (without /images/ subdirectory)
 */
export default async function updateProductImages({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const productModuleService = container.resolve(Modules.PRODUCT);

    logger.info("Starting product image URL update...");

    const OLD_URL = "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev";
    const NEW_URL = "https://media.karimasyari.com";

    // Get all Karima products
    const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title", "handle", "thumbnail", "images.*"],
        filters: {
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
        logger.warn("No Karima products found.");
        return;
    }

    logger.info(`Found ${products.length} products to update.`);

    for (const product of products) {
        try {
            logger.info(`Updating ${product.title}...`);

            // Function to fix image URL - remove /images/ subdirectory
            const fixImageUrl = (url: string | null | undefined): string | undefined => {
                if (!url) return undefined;

                // Replace old R2 dev URL with media.karimasyari.com
                let newUrl = url.replace(OLD_URL, NEW_URL);

                // Remove /images/ subdirectory if present
                newUrl = newUrl.replace('/images/', '/');

                return newUrl;
            };

            // Update thumbnail
            const updatedThumbnail = fixImageUrl(product.thumbnail);

            // Update images
            const updatedImages = product.images?.map((img: any) => ({
                id: img.id,
                url: fixImageUrl(img.url),
            })) || [];

            // Update the product
            await productModuleService.updateProducts(product.id, {
                thumbnail: updatedThumbnail,
                images: updatedImages,
            });

            logger.info(`✓ Updated ${product.title}`);
        } catch (error: any) {
            logger.error(`Failed to update ${product.title}: ${error.message}`);
        }
    }

    logger.info(`Successfully updated ${products.length} products!`);
}
