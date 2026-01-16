import { PaymentActions, PaymentSessionStatus } from "@medusajs/framework/utils"
import { mapMidtransStatus } from "../service"

describe("mapMidtransStatus", () => {
  it("maps settlement to captured", () => {
    const result = mapMidtransStatus("settlement")
    expect(result.action).toEqual(PaymentActions.SUCCESSFUL)
    expect(result.sessionStatus).toEqual(PaymentSessionStatus.CAPTURED)
  })

  it("maps pending to pending", () => {
    const result = mapMidtransStatus("pending")
    expect(result.action).toEqual(PaymentActions.PENDING)
    expect(result.sessionStatus).toEqual(PaymentSessionStatus.PENDING)
  })

  it("maps deny to failed", () => {
    const result = mapMidtransStatus("deny")
    expect(result.action).toEqual(PaymentActions.FAILED)
    expect(result.sessionStatus).toEqual(PaymentSessionStatus.ERROR)
  })

  it("maps challenge to requires_more", () => {
    const result = mapMidtransStatus("challenge")
    expect(result.action).toEqual(PaymentActions.REQUIRES_MORE)
    expect(result.sessionStatus).toEqual(PaymentSessionStatus.REQUIRES_MORE)
  })
})
