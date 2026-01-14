export function orderCreatedTemplate(input: {
  order_id: string
  total: string
}) {
  return {
    subject: `Pesanan ${input.order_id} diterima`,
    html: `<p>Pesanan <b>${input.order_id}</b> sudah kami terima.</p><p>Total: <b>${input.total}</b></p>`,
  }
}

export function paymentConfirmedTemplate(input: { order_id: string }) {
  return {
    subject: `Pembayaran diterima - ${input.order_id}`,
    html: `<p>Pembayaran untuk <b>${input.order_id}</b> sudah kami terima. Pesanan akan diproses.</p>`,
  }
}

export function awbCreatedTemplate(input: { order_id: string; awb: string; tracking_url?: string }) {
  return {
    subject: `Resi terbit - ${input.order_id}`,
    html: `<p>Resi untuk <b>${input.order_id}</b>: <b>${input.awb}</b></p>${input.tracking_url ? `<p><a href="${input.tracking_url}">Lacak pengiriman</a></p>` : ""}`,
  }
}
