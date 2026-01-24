You can implement role-based access control (RBAC) in Medusa by combining:

1. **Actor types** (user/customer/custom types like `manager`, `vendor`, `restaurant`, `driver`).
2. **Protected / custom API routes**.
3. **Authentication middlewares** (and optionally custom middlewares for finer checks).

Below is how this works based on the docs.

---

### 1. Use Actor Types as “Roles”

Medusa’s Auth module uses **actor types** to represent different user roles (e.g. `user` for admin, `customer`, or custom types like `manager`, `vendor`, `restaurant`).[[Auth identity](https://docs.medusajs.com/resources/commerce-modules/auth/auth-identity-and-actor-types)]

You can create custom actor types (e.g. `manager`) and associate them with your own data models and workflows. For example, a `manager` actor type is created and linked to a `manager` model and workflow, then used in routes and middlewares.[[Commerce examples](https://docs.medusajs.com/resources/examples#commerce-modules)]

---

### 2. Protect Routes by Role with `authenticate` Middleware

Use the `authenticate` middleware in `src/api/middlewares.ts` to restrict routes to specific actor types (roles).[[Protected routes](https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes#protect-custom-api-routes)]

**Admin-only routes (role = `user`):**

```ts
// src/api/middlewares.ts
import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/custom/admin*",
      middlewares: [
        authenticate("user", ["session", "bearer", "api-key"]),
      ],
    },
  ],
})
```

Only authenticated admin users (actor type `user`) can access `/custom/admin*` routes.[[Admin example](https://docs.medusajs.com/resources/examples#restrict-an-api-route-to-admin-users)]

**Customer-only routes (role = `customer`):**

```ts
export default defineMiddlewares({
  routes: [
    {
      matcher: "/custom/customer*",
      middlewares: [
        authenticate("customer", ["session", "bearer"]),
      ],
    },
  ],
})
```

Only authenticated customers can access `/custom/customer*` routes.[[Customer example](https://docs.medusajs.com/resources/examples#restrict-an-api-route-to-logged-in-customers)]

**Multiple roles on the same route:**

```ts
export default defineMiddlewares({
  routes: [
    {
      matcher: "/restaurants/:id/**",
      method: ["POST", "DELETE"],
      middlewares: [
        authenticate(["restaurant", "user"], "bearer"),
      ],
    },
  ],
})
```

Here, both `restaurant` admins and Medusa admin users (`user`) can access these routes.[[Restaurant example](https://docs.medusajs.com/resources/recipes/marketplace/examples/restaurant-delivery#add-authentication-middleware-1)]

You can also allow multiple roles generally:

```ts
export default defineMiddlewares({
  routes: [
    {
      matcher: "/custom*",
      middlewares: [
        authenticate(["user", "customer"], ["session", "bearer"]),
      ],
    },
  ],
})
```

This is a simple RBAC pattern: route access is controlled by which actor types are allowed.[[Protect custom](https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes#protect-custom-api-routes)]

---

### 3. Custom Roles (Custom Actor Types)

For more granular RBAC, define custom actor types (e.g. `manager`, `vendor`, `restaurant`, `driver`) and then protect routes with those types.

Example for a `manager` role:

1. **Define model and workflow** that sets `actorType: "manager"` via `setAuthAppMetadataStep`.[[Commerce examples](https://docs.medusajs.com/resources/examples#commerce-modules)]
2. **Protect manager routes:**

```ts
// src/api/middlewares.ts
import { defineMiddlewares, authenticate } from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/manager",
      method: "POST",
      middlewares: [
        authenticate("manager", ["session", "bearer"], {
          allowUnregistered: true,
        }),
      ],
    },
    {
      matcher: "/manager/me*",
      middlewares: [
        authenticate("manager", ["session", "bearer"]),
      ],
    },
  ],
})
```

This makes `/manager/me*` accessible only to authenticated `manager` actors.[[Create actor type](https://docs.medusajs.com/resources/commerce-modules/auth/create-actor-type#3-apply-the-authenticate-middleware)]

Similar patterns are used for `vendor` and `restaurant` roles in the marketplace recipes.[[Vendors middlewares](https://docs.medusajs.com/resources/recipes/marketplace/examples/vendors#apply-authentication-and-validation-middlewares); [Restaurant users](https://docs.medusajs.com/resources/recipes/marketplace/examples/restaurant-delivery#add-authentication-middleware)]

---

### 4. Add Fine-Grained Checks with Custom Middlewares

For resource-level RBAC (e.g. “restaurant admin can only manage their own deliveries”), you can chain custom middlewares after `authenticate`.

Example: ensure the logged-in restaurant admin owns the delivery they’re acting on:

```ts
// src/api/deliveries/[id]/middlewares.ts
import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import { isDeliveryRestaurant } from "../../utils/is-delivery-restaurant"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/deliveries/:id/accept",
      middlewares: [
        authenticate("restaurant", "bearer"),
        isDeliveryRestaurant,
      ],
    },
  ],
})
```

`isDeliveryRestaurant` checks that the delivery’s restaurant matches the admin’s restaurant and returns 403 otherwise.[[Delivery middlewares](https://docs.medusajs.com/resources/recipes/marketplace/examples/restaurant-delivery#add-middlewares)]

This pattern lets you implement RBAC rules like “role X can only access resource Y if condition Z holds”.

---

### 5. Default Protected Prefixes

By default:

- `/admin/*` → requires authenticated admin (`user`).
- `/store/*` → requires authenticated customer (`customer`).[[Protected routes](https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes)]

You can opt out per route by exporting `AUTHENTICATE = false` in that route file if you need a public endpoint under those prefixes.[[Protected routes](https://docs.medusajs.com/learn/fundamentals/api-routes/protected-routes)]

---

In summary, RBAC in Medusa is implemented by:

- Defining actor types that represent roles.
- Using `authenticate` middleware to restrict routes by actor type and auth method.
- Optionally adding custom middlewares for resource-level authorization.
