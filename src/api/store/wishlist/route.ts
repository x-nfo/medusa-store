
import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { z } from "zod";

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

    // 1. Get Logged-in Customer ID
    // In Medusa v2 store API, auth is handled by the auth middleware. 
    // We expect req.auth_context to be populated.
    const customerId = req.auth_context?.actor_id;

    if (!customerId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // 2. Fetch Customer Metadata
    const { data: [customer] } = await query.graph({
        entity: "customer",
        fields: ["metadata"],
        filters: { id: customerId }
    });

    const wishlistIds: string[] = (customer?.metadata?.wishlist as string[]) || [];

    if (wishlistIds.length === 0) {
        return res.json({ wishlist: [] });
    }

    // 3. Hydrate Products
    console.log("Hydrating items for customer:", customerId);
    console.log("Wishlist IDs:", wishlistIds);

    const { data: products } = await query.graph({
        entity: "product",
        fields: [
            "id",
            "title",
            "handle",
            "thumbnail",
            "description",
            "collection.title",
            "images.url",
            "options.*",
            "variants.*",
            "variants.prices.*"
        ],
        filters: {
            id: wishlistIds
        }
    });

    console.log("Found products count:", products.length);

    res.json({ wishlist: products });
};

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const customerId = req.auth_context?.actor_id;

    if (!customerId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const schema = z.object({
        product_id: z.string(),
    });

    const { product_id } = schema.parse(req.body);

    // 1. Get current wishlist
    const customer = await customerModuleService.retrieveCustomer(customerId);
    const currentWishlist = (customer.metadata?.wishlist as string[]) || [];

    // 2. Add if not exists
    if (!currentWishlist.includes(product_id)) {
        const newWishlist = [...currentWishlist, product_id];

        await customerModuleService.updateCustomers(customerId, {
            metadata: {
                ...customer.metadata,
                wishlist: newWishlist
            }
        });
    }

    res.json({ message: "Item added to wishlist" });
};

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
    const customerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const customerId = req.auth_context?.actor_id;

    if (!customerId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const schema = z.object({
        product_id: z.string(),
    });

    const { product_id } = schema.parse(req.body);

    // 1. Get current wishlist
    const customer = await customerModuleService.retrieveCustomer(customerId);
    const currentWishlist = (customer.metadata?.wishlist as string[]) || [];

    // 2. Remove if exists
    const newWishlist = currentWishlist.filter((id) => id !== product_id);

    if (newWishlist.length !== currentWishlist.length) {
        await customerModuleService.updateCustomers(customerId, {
            metadata: {
                ...customer.metadata,
                wishlist: newWishlist
            }
        });
    }

    res.json({ message: "Item removed from wishlist" });
};
