const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()
process.env.NODE_ENV = "test"
