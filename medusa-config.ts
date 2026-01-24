import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    // ===== Cloudflare R2 File Storage =====
    // Only enabled if R2 environment variables are set
    ...(process.env.R2_ACCESS_KEY_ID ? [{
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-s3",
            id: "r2",
            options: {
              file_url: process.env.R2_PUBLIC_URL, // Custom domain or R2.dev URL
              access_key_id: process.env.R2_ACCESS_KEY_ID,
              secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
              region: "auto", // Cloudflare R2 uses 'auto'
              bucket: process.env.R2_BUCKET_NAME,
              endpoint: process.env.R2_ENDPOINT, // https://{account-id}.r2.cloudflarestorage.com
              cache_control: "public, max-age=31536000",
            },
          },
        ],
      },
    }] : []),

    // ===== Fulfillment Providers =====
    {
      resolve: "@medusajs/medusa/fulfillment",
      options: {
        providers: [
          {
            resolve: "@medusajs/fulfillment-manual",
            id: "manual",
          },
          {
            resolve: "./src/modules/fulfillment-rajaongkir",
            id: "rajaongkir",
            options: {
              apiKey: process.env.RAJAONGKIR_API_KEY,
              baseUrl: process.env.RAJAONGKIR_BASE_URL || "https://api.rajaongkir.com/starter",
              originCityId: process.env.RAJAONGKIR_ORIGIN_CITY_ID,
              originName: process.env.RAJAONGKIR_ORIGIN_NAME,
              originPhone: process.env.RAJAONGKIR_ORIGIN_PHONE,
              originAddress: process.env.RAJAONGKIR_ORIGIN_ADDRESS,
              originPostalCode: process.env.RAJAONGKIR_ORIGIN_POSTAL_CODE,
              deliveryPath: process.env.RAJAONGKIR_DELIVERY_PATH,
            }
          }
        ]
      }
    },

    // ===== Notification Providers =====
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/notification-local",
            id: "local-notification-provider",
            options: {
              channels: ["feed"],
            },
          },
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      }
    },

    // ===== Payment Providers =====
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-midtrans",
            id: "midtrans",
            options: {
              serverKey: process.env.MIDTRANS_SERVER_KEY,
              clientKey: process.env.MIDTRANS_CLIENT_KEY,
              isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
              enabledPayments: process.env.MIDTRANS_ENABLED_PAYMENTS
                ? process.env.MIDTRANS_ENABLED_PAYMENTS.split(",")
                : undefined,
            }
          }
        ]
      }
    },

    // ===== Fashion Module - Material & Color Management =====
    {
      resolve: "./src/modules/fashion",
    },
    {
      resolve: "@medusajs/medusa/auth",
      options: {
        providers: [
          {
            resolve: "@medusajs/auth-emailpass",
            id: "emailpass",
            options: {
              scopes: {
                admin: {
                  expiresIn: "24h",
                },
                customer: {
                  expiresIn: "7d",
                }
              }
            }
          }
        ]
      }
    }
  ]
})
