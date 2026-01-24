import {
    Body,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Link,
    Preview,
    Section,
    Text,
} from "@react-email/components"
import * as React from "react"

interface DeliveryConfirmedEmailProps {
    order_id: string
    display_id: string
    customer_name: string
    awb: string
    courier?: string
    delivery_date?: string
}

export const DeliveryConfirmedEmail = ({
    order_id,
    display_id,
    customer_name,
    awb,
    courier,
    delivery_date,
}: DeliveryConfirmedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Paket Anda Sudah Diterima! Order #{display_id}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={{ textAlign: "center", marginBottom: "32px" }}>
                        <div style={iconContainer}>
                            <span style={checkIcon}>✓</span>
                        </div>
                        <Heading style={h1}>Paket Telah Diterima!</Heading>
                        <Text style={text}>
                            Hi {customer_name || "Pelanggan"}, paket dari pesanan Anda telah sampai di tujuan.
                        </Text>
                    </Section>

                    <Section style={card}>
                        <Text style={subtitle}>Detail Pengiriman</Text>
                        <Hr style={hr} />

                        <table style={detailTable}>
                            <tbody>
                                <tr>
                                    <td style={detailLabel}>Order ID</td>
                                    <td style={detailValue}>#{display_id}</td>
                                </tr>
                                <tr>
                                    <td style={detailLabel}>No. Resi (AWB)</td>
                                    <td style={detailValue}>{awb}</td>
                                </tr>
                                {courier && (
                                    <tr>
                                        <td style={detailLabel}>Kurir</td>
                                        <td style={detailValue}>{courier}</td>
                                    </tr>
                                )}
                                {delivery_date && (
                                    <tr>
                                        <td style={detailLabel}>Tanggal Diterima</td>
                                        <td style={detailValue}>{delivery_date}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Section>

                    <Section style={ctaSection}>
                        <Text style={ctaText}>
                            Puas dengan pesanan Anda? Kami sangat menghargai review dan testimoni dari Anda!
                        </Text>
                    </Section>

                    <Text style={footer}>
                        Terima kasih telah berbelanja di Mastro Store. Jika ada pertanyaan, hubungi kami di customercare@mastro-store.com
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

const main = {
    backgroundColor: "#f3f4f6",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
    margin: "0 auto",
    padding: "40px 0 48px",
    maxWidth: "600px",
}

const iconContainer = {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    backgroundColor: "#10b981",
    display: "inline-block",
    lineHeight: "64px",
    marginBottom: "16px",
}

const checkIcon = {
    color: "#ffffff",
    fontSize: "32px",
    fontWeight: "bold" as const,
}

const card = {
    backgroundColor: "#ffffff",
    padding: "24px",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
}

const h1 = {
    fontSize: "24px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
}

const text = {
    fontSize: "16px",
    color: "#4b5563",
    margin: "0",
    lineHeight: "24px",
}

const subtitle = {
    fontSize: "16px",
    fontWeight: "600" as const,
    color: "#111827",
    margin: "0 0 8px 0",
}

const hr = {
    borderColor: "#e5e7eb",
    margin: "12px 0 16px 0",
}

const detailTable = {
    width: "100%",
    borderCollapse: "collapse" as const,
}

const detailLabel = {
    fontSize: "14px",
    color: "#6b7280",
    padding: "8px 0",
    width: "40%",
}

const detailValue = {
    fontSize: "14px",
    fontWeight: "500" as const,
    color: "#111827",
    padding: "8px 0",
    textAlign: "right" as const,
}

const ctaSection = {
    backgroundColor: "#fef3c7",
    padding: "16px 24px",
    borderRadius: "8px",
    marginTop: "24px",
    textAlign: "center" as const,
}

const ctaText = {
    fontSize: "14px",
    color: "#92400e",
    margin: "0",
}

const footer = {
    fontSize: "12px",
    color: "#9ca3af",
    textAlign: "center" as const,
    marginTop: "24px",
}

export default DeliveryConfirmedEmail
