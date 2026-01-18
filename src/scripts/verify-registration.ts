
import { ExecArgs } from "@medusajs/framework/types"

export default async function verifyRegistration({ container }: ExecArgs) {
    console.log("--------------- CONTAINER KEYS DUMP ---------------")

    // Awilix container internal structure often has 'registrations'
    const anyContainer = container as any;
    if (anyContainer.registrations) {
        const keys = Object.keys(anyContainer.registrations).filter(k =>
            k.includes("payment") || k.includes("midtrans") || k.startsWith("pp_")
        ).sort();

        if (keys.length === 0) {
            console.log("No keys found matching 'payment', 'midtrans', or 'pp_'");
            // Dump first 10 keys just to sanity check container is populated
            console.log("Sample keys:", Object.keys(anyContainer.registrations).slice(0, 10));
        } else {
            console.log("Found relevant keys:");
            keys.forEach(k => console.log(` - ${k}`));
        }
    } else {
        console.log("Container does not expose registrations property.");
        // Fallback: try to resolve payment module directly
        try {
            const mod = container.resolve("payment");
            console.log("Resolved 'payment' successfully.");
        } catch (e) {
            console.log("Could not resolve 'payment'.");
        }
    }

    console.log("---------------------------------------------------")
}
