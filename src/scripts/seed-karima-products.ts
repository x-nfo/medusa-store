import { ExecArgs } from "@medusajs/framework/types";
import {
    ContainerRegistrationKeys,
    Modules,
    ProductStatus,
} from "@medusajs/framework/utils";
import {
    createProductCategoriesWorkflow,
    createProductsWorkflow,
    createInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Seed script for Karima Syar'i products
 * This script imports all products from the reference storefront constants
 * into the Medusa database with proper categories, variants, and pricing.
 */
export default async function seedKarimaProducts({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
    const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
    const storeModuleService = container.resolve(Modules.STORE);

    logger.info("Starting Karima products seed...");

    // Get the Website sales channel (karimasyari.com)
    let salesChannel = await salesChannelModuleService.listSalesChannels({
        name: "Website - karimasyari.com",
    });

    if (!salesChannel.length) {
        logger.warn("Website - karimasyari.com sales channel not found. Trying 'Default Sales Channel'...");
        salesChannel = await salesChannelModuleService.listSalesChannels({
            name: "Default Sales Channel",
        });

        if (!salesChannel.length) {
            throw new Error("No sales channel found. Please create 'Website - karimasyari.com' sales channel first.");
        }
    }

    logger.info(`Using sales channel: ${salesChannel[0].name}`);

    // Get default shipping profile
    const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
        type: "default",
    });

    if (!shippingProfiles.length) {
        throw new Error("Default shipping profile not found. Please run the main seed script first.");
    }

    const shippingProfile = shippingProfiles[0];

    // Get default stock location
    const [store] = await storeModuleService.listStores();
    if (!store.default_location_id) {
        throw new Error("Default stock location not found. Please run the main seed script first.");
    }

    logger.info("Creating product categories...");

    // Create Karima-specific categories (or get existing ones)
    let categoryResult;
    try {
        const { result } = await createProductCategoriesWorkflow(
            container
        ).run({
            input: {
                product_categories: [
                    {
                        name: "Abaya",
                        description: "Elegant and modest abayas for everyday wear",
                        is_active: true,
                    },
                    {
                        name: "Abaya Denim",
                        description: "Casual denim abayas with modern styling",
                        is_active: true,
                    },
                    {
                        name: "Khimar",
                        description: "Traditional khimars for complete modest coverage",
                        is_active: true,
                    },
                    {
                        name: "Khimar Bandana",
                        description: "Stylish bandana-style khimars",
                        is_active: true,
                    },
                ],
            },
        });
        categoryResult = result;
        logger.info("Categories created successfully.");
    } catch (error: any) {
        // Categories might already exist, fetch them
        logger.warn("Categories may already exist, fetching existing categories...");
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: existingCategories } = await query.graph({
            entity: "product_category",
            fields: ["id", "name", "description"],
            filters: {
                name: ["Abaya", "Abaya Denim", "Khimar", "Khimar Bandana"],
            },
        });
        categoryResult = existingCategories;
        logger.info(`Found ${categoryResult.length} existing categories.`);
    }


    logger.info("Creating products...");

    // Helper function to convert hex color to color name
    const getColorName = (hex: string): string => {
        const colorMap: Record<string, string> = {
            "#000000": "Black",
            "#a68483": "Choco",
            "#dbc5ba": "Almond",
            "#e4cacd": "Wood",
            "#99432f": "Terracotta",
            "#c97f86": "Dusty Pink",
            "#635c4a": "Olive",
            "#988076": "Moss",
            "#cfb59d": "Sage",
            "#a3a2a0": "Tosca",
            "#373557": "Navy",
            "#6c84b8": "Jeans",
            "#86a6cf": "Blue",
            "#d3e3f5": "Light Blue",
            "#deccca": "Cream",
            "#786167": "Mauve",
            "#a7b4cc": "Lavender",
            "#522e28": "Brown",
            "#c2b6b9": "Dusty Rose",
            "#704052": "Plum",
        };
        return colorMap[hex.toLowerCase()] || hex;
    };

    // Define all products from the constants
    // Using media.karimasyari.com (without /images/ subdirectory)
    const PUBLIC_ASSET_URL = "https://media.karimasyari.com";

    const products = [
        {
            title: "Hayya - Black",
            handle: "hayya-black",
            category: "Abaya",
            price: 749000,
            description: "Inspired by Hayya - an invitation to move forward this abaya brings together feminity and strength. Modest yet empowering, in every detail.",
            images: [
                `${PUBLIC_ASSET_URL}/hayya-black-1.webp`,
                `${PUBLIC_ASSET_URL}/hayya-black-3.webp`,
                `${PUBLIC_ASSET_URL}/hayya-black-2.webp`,
                `${PUBLIC_ASSET_URL}/hayya-black-4.webp`,
            ],
            colors: ["#000000"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["everyday", "basic"],
        },
        {
            title: "Hayya - Choco",
            handle: "hayya-choco",
            category: "Abaya",
            price: 749000,
            description: "Inspired by Hayya - an invitation to move forward this abaya brings together feminity and strength. Modest yet empowering, in every detail.",
            images: [
                `${PUBLIC_ASSET_URL}/hayya-choco-1.webp`,
                `${PUBLIC_ASSET_URL}/hayya-choco-2.webp`,
                `${PUBLIC_ASSET_URL}/hayya-choco-3.webp`,
                `${PUBLIC_ASSET_URL}/hayya-choco-4.webp`,
            ],
            colors: ["#a68483"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["everyday", "basic"],
        },
        {
            title: "Saliha - Almond",
            handle: "saliha-almond",
            category: "Abaya",
            price: 699000,
            description: "Saliha - for women who dress with faith and dignity. More than modest wear, it's a reminder of beauty in righteousness. Designed in airy crinkle fabric",
            images: [
                `${PUBLIC_ASSET_URL}/saliha-almond-1.webp`,
                `${PUBLIC_ASSET_URL}/saliha-almond-2.webp`,
            ],
            colors: ["#dbc5ba"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["elegant", "silk", "evening"],
            isNew: true,
        },
        {
            title: "Saliha - Wood",
            handle: "saliha-wood",
            category: "Abaya",
            price: 699000,
            description: "Saliha - for women who dress with faith and dignity. More than modest wear, it's a reminder of beauty in righteousness. Designed in airy crinkle fabric",
            images: [
                `${PUBLIC_ASSET_URL}/saliha-wood-1.webp`,
                `${PUBLIC_ASSET_URL}/saliha-wood-2.webp`,
            ],
            colors: ["#e4cacd"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["everyday", "basic"],
        },
        {
            title: "Katta - Terracotta",
            handle: "katta-terracotta",
            category: "Abaya",
            price: 785000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/KRMA8293 copy.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/KRMA8303 copy-min.jpg",
            ],
            colors: ["#99432f"],
            sizes: ["S", "M", "L"],
            tags: ["luxury", "wedding"],
        },
        {
            title: "Katta - Dusty Pink",
            handle: "katta-dusty-pink",
            category: "Abaya",
            price: 699000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-dusty-pink-1.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-dusty-pink-2.jpg",
            ],
            colors: ["#c97f86"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["everyday", "basic"],
        },
        {
            title: "Katta - Olive",
            handle: "katta-olive",
            category: "Abaya",
            price: 699000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-olive-1.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-olive-2.webp",
            ],
            colors: ["#635c4a"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["everyday", "basic"],
        },
        {
            title: "Katta - Moss",
            handle: "katta-moss",
            category: "Abaya",
            price: 699000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-moss-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-moss-2.webp",
            ],
            colors: ["#988076"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["prayer", "travel"],
        },
        {
            title: "Katta - Sage",
            handle: "katta-sage",
            category: "Abaya",
            price: 785000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-sage-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-sage-2.webp",
            ],
            colors: ["#cfb59d"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["prayer", "travel"],
        },
        {
            title: "Katta - Tosca",
            handle: "katta-tosca",
            category: "Abaya",
            price: 785000,
            description: "Katta speaks in lines and strokes - a story woven into fabric. Minimal yet expressive, designed in textured striped material for a graceful everyday wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-tosca-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/katta-tosca-2.webp",
            ],
            colors: ["#a3a2a0"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["prayer", "travel"],
        },
        {
            title: "Safa - Navy",
            handle: "safa-navy",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Safa - the sacred hill of purity this abaya embodies simplicity and grace. Crafted from plain denim, it reflects strength in modesty and softness in spirit.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-navy-2.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-navy-3.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-navy-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-navy-4.webp",
            ],
            colors: ["#373557"],
            sizes: ["XS", "S", "M", "L"],
            tags: ["casual", "summer"],
        },
        {
            title: "Safa - Jeans",
            handle: "safa-jeans",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Safa - the sacred hill of purity this abaya embodies simplicity and grace. Crafted from plain denim, it reflects strength in modesty and softness in spirit.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-jeans-0.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-jeans-3.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-jeans-1.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-jeans-2.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-jeans-4.webp",
            ],
            colors: ["#6c84b8"],
            sizes: ["XS", "S", "M", "L"],
            tags: ["casual", "summer"],
        },
        {
            title: "Safa - Blue",
            handle: "safa-blue",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Safa - the sacred hill of purity this abaya embodies simplicity and grace. Crafted from plain denim, it reflects strength in modesty and softness in spirit.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-blue-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-blue-2.webp",
            ],
            colors: ["#86a6cf"],
            sizes: ["XS", "S", "M", "L"],
            tags: ["casual", "summer"],
        },
        {
            title: "Safa - Light Blue",
            handle: "safa-light-blue",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Safa - the sacred hill of purity this abaya embodies simplicity and grace. Crafted from plain denim, it reflects strength in modesty and softness in spirit.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-light-blue-2.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-light-blue-3.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-light-blue-1.jpg",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/safa-light-blue-4.webp",
            ],
            colors: ["#d3e3f5"],
            sizes: ["XS", "S", "M", "L"],
            tags: ["casual", "summer"],
        },
        {
            title: "Marwah - Navy",
            handle: "marwah-navy",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Marwah - the sacred hill of Sa'i this abaya reflects softness and faith. Crafted in denim with subtle pattern, it brings color and elegance to modest wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-navy-2.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-navy-3.webp",
            ],
            colors: ["#373557"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
        {
            title: "Marwah - Jeans",
            handle: "marwah-jeans",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Marwah - the sacred hill of Sa'i this abaya reflects softness and faith. Crafted in denim with subtle pattern, it brings color and elegance to modest wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-jeans-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-jeans-2.webp",
            ],
            colors: ["#6c84b8"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
        {
            title: "Marwah - Blue",
            handle: "marwah-blue",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Marwah - the sacred hill of Sa'i this abaya reflects softness and faith. Crafted in denim with subtle pattern, it brings color and elegance to modest wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-blue-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-blue-2.webp",
            ],
            colors: ["#86a6cf"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
        {
            title: "Marwah - Light Blue",
            handle: "marwah-light-blue",
            category: "Abaya Denim",
            price: 699000,
            description: "Inspired by Marwah - the sacred hill of Sa'i this abaya reflects softness and faith. Crafted in denim with subtle pattern, it brings color and elegance to modest wear.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-light-blue-1.webp",
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/marwah-light-blue-3.webp",
            ],
            colors: ["#d3e3f5"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
        {
            title: "Khimar",
            handle: "khimar",
            category: "Khimar",
            price: 349000,
            description: "Grace in motion. The Side Khimar brings effortless modesty in six timeless shades, perfect for both daily wear and special moments.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/khimar-1.webp",
            ],
            colors: ["#deccca", "#c97f86", "#786167", "#a7b4cc", "#522e28", "#000000"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
        {
            title: "Khimar Bandana",
            handle: "khimar-bandana",
            category: "Khimar Bandana",
            price: 349000,
            description: "The Khimar Bandana offers a chic and modest twist for your daily wear. Available in four easy-to-style colors.",
            images: [
                "https://pub-a7a55e2d1cf642f38d51358c3691e1a4.r2.dev/khimar-bandana-1.webp",
            ],
            colors: ["#c2b6b9", "#99432f", "#635c4a", "#704052"],
            sizes: ["S", "M", "L", "XL"],
            tags: ["hijab", "modest"],
        },
    ];

    // Create products with variants
    const productsToCreate = products.map((product) => {
        const category = categoryResult.find((cat) => cat.name === product.category);
        if (!category) {
            throw new Error(`Category ${product.category} not found`);
        }

        // Generate variants for each size and color combination
        const variants: Array<{
            title: string;
            sku: string;
            options: { Size: string; Color: string };
            prices: Array<{ amount: number; currency_code: string }>;
        }> = [];
        for (const size of product.sizes) {
            for (const colorHex of product.colors) {
                const colorName = getColorName(colorHex);
                variants.push({
                    title: `${size} / ${colorName}`,
                    sku: `${product.handle.toUpperCase()}-${size}-${colorName.toUpperCase().replace(/\s+/g, "-")}`,
                    options: {
                        Size: size,
                        Color: colorName,
                    },
                    prices: [
                        {
                            amount: product.price,
                            currency_code: "idr",
                        },
                    ],
                });
            }
        }

        return {
            title: product.title,
            handle: product.handle,
            description: product.description,
            category_ids: [category.id],
            status: product.isNew ? ProductStatus.PUBLISHED : ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            weight: 500, // Default weight in grams
            images: product.images.map((url) => ({ url })),
            options: [
                {
                    title: "Size",
                    values: product.sizes,
                },
                {
                    title: "Color",
                    values: product.colors.map(getColorName),
                },
            ],
            variants,
            // Tags will be added later via admin or separate workflow
            sales_channels: [
                {
                    id: salesChannel[0].id,
                },
            ],
        };
    });

    // Create products in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < productsToCreate.length; i += batchSize) {
        const batch = productsToCreate.slice(i, i + batchSize);
        logger.info(`Creating products ${i + 1} to ${Math.min(i + batchSize, productsToCreate.length)}...`);

        await createProductsWorkflow(container).run({
            input: {
                products: batch as any,
            },
        });
    }

    logger.info(`Successfully created ${productsToCreate.length} Karima products!`);
    logger.info("Karima products seed completed.");
}

