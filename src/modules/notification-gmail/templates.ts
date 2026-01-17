import { OrderCreatedPayload, OrderItem, ShippingAddress } from "./types"

const STORE_NAME = process.env.STORE_NAME || "Syari Store"
const STORE_LOGO = process.env.STORE_LOGO_URL || ""

const greeting = (customerName?: string) =>
  customerName ? `Halo ${customerName},` : "Halo,"

const formatItemRow = (item: OrderItem) => `
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
      <div style="display: flex; align-items: center;">
        ${item.thumbnail ? `<img src="${item.thumbnail}" alt="${item.title}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; margin-right: 12px;">` : ""}
        <div>
          <div style="font-weight: 500; color: #1f2937;">${item.title}</div>
          <div style="font-size: 13px; color: #6b7280;">Qty: ${item.quantity} × ${item.unit_price}</div>
        </div>
      </div>
    </td>
    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">
      ${item.total}
    </td>
  </tr>
`

const formatItemsTable = (items?: OrderItem[]) => {
  if (!items || items.length === 0) return ""

  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <thead>
        <tr style="border-bottom: 2px solid #e5e7eb;">
          <th style="text-align: left; padding: 8px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Produk</th>
          <th style="text-align: right; padding: 8px 0; color: #6b7280; font-weight: 500; font-size: 13px;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(formatItemRow).join("")}
      </tbody>
    </table>
  `
}

const formatAddress = (addr?: ShippingAddress) => {
  if (!addr) return "-"

  const parts = [
    addr.first_name && addr.last_name ? `${addr.first_name} ${addr.last_name}` : addr.first_name,
    addr.address_1,
    [addr.city, addr.province].filter(Boolean).join(", "),
    addr.postal_code,
    addr.phone ? `📞 ${addr.phone}` : null,
  ].filter(Boolean)

  return parts.join("<br>")
}

const formatSummaryRow = (label: string, value?: string, isTotal = false) => {
  if (!value) return ""
  const style = isTotal
    ? "font-weight: 600; font-size: 16px; color: #1f2937;"
    : "color: #6b7280;"
  return `
    <tr>
      <td style="padding: 4px 0; ${style}">${label}</td>
      <td style="padding: 4px 0; text-align: right; ${style}">${value}</td>
    </tr>
  `
}

const wrapTemplate = (title: string, body: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center;">
        ${STORE_LOGO ? `<img src="${STORE_LOGO}" alt="${STORE_NAME}" style="height: 40px; margin-bottom: 12px;">` : `<div style="font-size: 24px; font-weight: bold;">${STORE_NAME}</div>`}
        <div style="font-size: 16px; opacity: 0.9; margin-top: 8px;">${title}</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 24px; color: #374151; line-height: 1.6;">
        ${body}
      </div>
      
      <!-- Footer -->
      <div style="padding: 20px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
        <div style="font-size: 13px; color: #6b7280;">
          Ada pertanyaan? Balas email ini atau hubungi kami.
        </div>
        <div style="font-size: 12px; color: #9ca3af; margin-top: 8px;">
          © ${new Date().getFullYear()} ${STORE_NAME}. All rights reserved.
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`

export function orderCreatedTemplate(input: OrderCreatedPayload) {
  const subject = `Pesanan ${input.order_id} diterima`

  const summaryTable = `
    <table style="width: 100%; border-collapse: collapse; margin-top: 16px; background: #f9fafb; border-radius: 8px; padding: 16px;">
      ${formatSummaryRow("Subtotal", input.subtotal)}
      ${formatSummaryRow("Ongkos Kirim", input.shipping_total)}
      ${input.tax_total ? formatSummaryRow("Pajak", input.tax_total) : ""}
      ${input.discount_total ? formatSummaryRow("Diskon", `-${input.discount_total}`) : ""}
      <tr><td colspan="2" style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;"></td></tr>
      ${formatSummaryRow("Total", input.total, true)}
    </table>
  `

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">${greeting(input.customer_name)}</p>
    
    <p style="margin: 0 0 20px 0;">
      Terima kasih sudah berbelanja! Pesanan Anda dengan nomor <strong style="color: #0f172a;">${input.order_id}</strong> berhasil dibuat${input.order_date ? ` pada ${input.order_date}` : ""}.
    </p>

    <!-- Order Items -->
    <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-weight: 600; color: #1f2937; margin-bottom: 12px; font-size: 15px;">📦 Detail Pesanan</div>
      ${formatItemsTable(input.items) || "<p style='color: #6b7280;'>-</p>"}
      ${summaryTable}
    </div>

    <!-- Shipping Address -->
    <div style="margin: 20px 0;">
      <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 15px;">📍 Alamat Pengiriman</div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 14px; line-height: 1.6;">
        ${formatAddress(input.shipping_address)}
      </div>
    </div>

    ${input.payment_method ? `
    <!-- Payment Method -->
    <div style="margin: 20px 0;">
      <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px; font-size: 15px;">💳 Metode Pembayaran</div>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; color: #4b5563; font-size: 14px;">
        ${input.payment_method}
      </div>
    </div>
    ` : ""}

    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <div style="color: #065f46; font-weight: 500;">✅ Pesanan sedang diproses</div>
      <div style="color: #047857; font-size: 14px; margin-top: 4px;">Kami akan mengirimkan email lagi saat pesanan sudah dikirim.</div>
    </div>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}

type PaymentConfirmedTemplateInput = {
  order_id: string
  customer_name?: string
}

export function paymentConfirmedTemplate(input: PaymentConfirmedTemplateInput) {
  const subject = `Pembayaran diterima - ${input.order_id}`
  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Pembayaran untuk pesanan <strong>${input.order_id}</strong> sudah kami terima.</p>
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="color: #065f46; font-weight: 500;">✅ Pembayaran berhasil</div>
      <div style="color: #047857; font-size: 14px; margin-top: 4px;">Pesanan sedang kami siapkan untuk dikirim.</div>
    </div>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}

type AwbCreatedTemplateInput = {
  order_id: string
  awb: string
  tracking_url?: string
  customer_name?: string
  courier?: string
}

export function awbCreatedTemplate(input: AwbCreatedTemplateInput) {
  const subject = `Pesanan ${input.order_id} dalam pengiriman 🚚`
  const trackingButton = input.tracking_url
    ? `<a href="${input.tracking_url}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 16px;">Lacak Pengiriman</a>`
    : ""

  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Kabar baik! Pesanan <strong>${input.order_id}</strong> sudah dalam perjalanan menuju alamat Anda.</p>
    
    <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      ${input.courier ? `<div style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">Ekspedisi: ${input.courier}</div>` : ""}
      <div style="font-size: 13px; color: #6b7280;">Nomor Resi</div>
      <div style="font-size: 24px; font-weight: 600; color: #1f2937; letter-spacing: 1px; margin-top: 4px;">${input.awb}</div>
      ${trackingButton}
    </div>

    <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="color: #1e40af; font-weight: 500;">📦 Tips</div>
      <div style="color: #1e3a8a; font-size: 14px; margin-top: 4px;">Pastikan seseorang ada di alamat untuk menerima paket.</div>
    </div>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}

type DeliveryConfirmedTemplateInput = {
  order_id: string
  awb: string
  customer_name?: string
  delivery_date?: string
}

export function deliveryConfirmedTemplate(input: DeliveryConfirmedTemplateInput) {
  const subject = `Pesanan ${input.order_id} telah diterima ✅`

  const body = `
    <p>${greeting(input.customer_name)}</p>
    <p>Pesanan Anda dengan nomor <strong>${input.order_id}</strong> sudah sampai di tujuan${input.delivery_date ? ` pada ${input.delivery_date}` : ""}.</p>
    
    <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
      <div style="font-size: 18px; font-weight: 600; color: #065f46;">Pesanan Berhasil Diterima</div>
      <div style="font-size: 13px; color: #047857; margin-top: 8px;">Nomor Resi: ${input.awb}</div>
    </div>

    <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="color: #92400e; font-weight: 500;">⭐ Bagikan Pengalaman Anda</div>
      <div style="color: #78350f; font-size: 14px; margin-top: 4px;">Kami sangat menghargai ulasan dari pelanggan. Berikan rating untuk produk yang Anda beli!</div>
    </div>

    <p style="color: #6b7280; font-size: 14px;">
      Terima kasih sudah berbelanja di ${STORE_NAME}. Kami berharap Anda puas dengan pesanan Anda!
    </p>
  `

  return {
    subject,
    html: wrapTemplate(subject, body),
  }
}
