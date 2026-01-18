import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const RESERVATION_DESCRIPTION_PREFIX = "checkout"
const RESERVATION_STATUS_CONFIRMED = "confirmed"
const DEFAULT_PAGE_SIZE = 200

export default async function releaseExpiredReservations(
  container: MedusaContainer
) {
  if (process.env.NODE_ENV === "test") {
    return
  }

  const inventoryService = container.resolve(Modules.INVENTORY)
  const now = Date.now()
  let offset = 0
  let total = 0

  do {
    const [reservations, count] =
      await inventoryService.listAndCountReservationItems(
        {
          // description filter removed to avoid operator error, filtering in memory below
        },
        {
          take: DEFAULT_PAGE_SIZE,
          skip: offset,
        }
      )

    total = count
    offset += reservations.length

    const expiredIds = reservations
      .filter((reservation) => {
        // Filter by description prefix in memory
        if (reservation.description && !reservation.description.startsWith(RESERVATION_DESCRIPTION_PREFIX)) {
          return false
        }

        const metadata = reservation.metadata ?? {}
        const status = metadata.status as string | undefined
        if (status === RESERVATION_STATUS_CONFIRMED) {
          return false
        }

        const expiresAt = metadata.expires_at
        if (!expiresAt) {
          return false
        }

        const parsed = Date.parse(String(expiresAt))
        if (Number.isNaN(parsed)) {
          return false
        }

        return parsed <= now
      })
      .map((reservation) => reservation.id)

    if (expiredIds.length) {
      await inventoryService.deleteReservationItems(expiredIds)
    }
  } while (offset < total)
}

export const config = {
  name: "release-expired-reservations",
  schedule: "*/5 * * * *",
}
