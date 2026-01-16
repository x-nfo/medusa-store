type BaseTemplateInput = {
  order_id: string
  customer_name?: string
}

type OrderCreatedTemplateInput = BaseTemplateInput & {
  total: string
}

type PaymentConfirmedTemplateInput = BaseTemplateInput

type AwbCreatedTemplateInput = BaseTemplateInput & {
  awb: string
  tracking_url?: string
}

const greeting = (customerName?: string) =>
  customerName ? `Hi ${customerName},` : "Hi,"

const wrapTemplate = (title: string, body: string) => `
  <div style="font-family: Arial, sans-serif; background:#f7f7f9; padding:20px;">
    <div style="max-width:600px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
      <div style="background:#0f172a; color:#ffffff; padding:16px 20px; font-size:16px; font-weight:bold;">
        ${title}
      </div>
      <div style="padding:20px; color:#0f172a; line-height:1.5;">
        ${body}
      </div>
      <div style="padding:16px 20px; font-size:12px; color:#6b7280; border-top:1px solid #e5e7eb;">
        Email ini dikirim otomatis. Abaikan jika sudah diterima sebelumnya.
      </div>
    </div>
  </div>
`

export function orderCreatedTemplate(input: OrderCreatedTemplateInput) {
  const subject = `Pesanan ${input.order_id} diterima`
  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Terima kasih sudah berbelanja. Pesanan <strong>${input.order_id}</strong> berhasil dibuat.</p>
    <p><strong>Total:</strong> ${input.total}</p>
    <p>Kami akan memproses pesanan Anda dan mengabari jika ada perkembangan berikutnya.</p>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}

export function paymentConfirmedTemplate(input: PaymentConfirmedTemplateInput) {
  const subject = `Pembayaran diterima - ${input.order_id}`
  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Pembayaran untuk pesanan <strong>${input.order_id}</strong> sudah kami terima.</p>
    <p>Pesanan sedang kami siapkan untuk dikirim.</p>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}

export function awbCreatedTemplate(input: AwbCreatedTemplateInput) {
  const subject = `Resi terbit - ${input.order_id}`
  const tracking = input.tracking_url
    ? `<p><a href="${input.tracking_url}" style="color:#2563eb;">Lacak pengiriman</a></p>`
    : ""

  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Pesanan <strong>${input.order_id}</strong> sudah dikirim.</p>
    <p><strong>Resi:</strong> ${input.awb}</p>
    ${tracking}
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}
