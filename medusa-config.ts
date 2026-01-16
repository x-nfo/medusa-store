import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
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
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/payment-midtrans",
            options: {
              isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
              serverKey: process.env.MIDTRANS_SERVER_KEY,
              clientKey: process.env.MIDTRANS_CLIENT_KEY,
            }
          }
        ]
      }
    },
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
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/notification-gmail",
            id: "np_gmail",
            options: {
              channels: ["email"],
              host: process.env.EMAIL_HOST,
              port: process.env.GMAIL_PORT ? parseInt(process.env.GMAIL_PORT) : 587,
              user: process.env.GMAIL_USER,
              pass: process.env.GMAIL_APP_PASSWORD,
              from: process.env.EMAIL_FROM_ADDRESS
            }
          }
        ]
      }
    }
  ]
})
