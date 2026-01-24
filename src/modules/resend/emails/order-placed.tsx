import {
    Body,
    Container,
    Column,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Row,
    Section,
    Text,
} from "@react-email/components"
import * as React from "react"

interface OrderPlacedEmailProps {
    order_id: string
    display_id: string
    order_date: string
    customer_email: string
    customer_name: string
    shipping_address: {
        first_name: string
        last_name: string
        address_1: string
        city: string
        province: string
        postal_code: string
        phone: string
    }
    shipping_method: string
    items: Array<{
        title: string
        variant: string
        quantity: number
        unit_price: string
        total: string
        thumbnail: string
    }>
    subtotal: string
    shipping_total: string
    tax_total: string
    discount_total: string
    total: string
}

export const OrderPlacedEmail = ({
    order_id,
    display_id,
    order_date,
    customer_email,
    customer_name,
    shipping_address,
    shipping_method,
    items,
    subtotal,
    shipping_total,
    tax_total,
    discount_total,
    total,
}: OrderPlacedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Order Confirmation #{display_id}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={{ textAlign: "center", marginBottom: "32px" }}>
                        <Heading style={h1}>Order Confirmed!</Heading>
                        <Text style={text}>
                            Hi {customer_name}, thank you for your purchase. We've received your order and are getting it ready!
                        </Text>
                    </Section>

                    <Section style={card}>
                        <Row style={{ borderBottom: "1px solid #e6ebf1", paddingBottom: "12px", marginBottom: "12px" }}>
                            <Column>
                                <Text style={subtitle}>Order ID</Text>
                                <Text style={value}>#{display_id}</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={subtitle}>Date</Text>
                                <Text style={value}>{order_date}</Text>
                            </Column>
                        </Row>

                        <Text style={{ ...subtitle, marginBottom: "8px" }}>Items</Text>
                        {items?.map((item, index) => (
                            <Row key={index} style={itemRow}>
                                <Column style={{ width: "64px" }}>
                                    {item.thumbnail ? (
                                        <Img
                                            src={item.thumbnail}
                                            width="64"
                                            height="64"
                                            alt={item.title}
                                            style={productImage}
                                        />
                                    ) : (
                                        <div style={{ width: "64px", height: "64px", background: "#f3f4f6", borderRadius: "4px" }} />
                                    )}
                                </Column>
                                <Column style={{ paddingLeft: "16px" }}>
                                    <Text style={productTitle}>{item.title}</Text>
                                    {item.variant && <Text style={productVariant}>{item.variant}</Text>}
                                    <Text style={productMeta}>Qty: {item.quantity} x {item.unit_price}</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={productPrice}>{item.total}</Text>
                                </Column>
                            </Row>
                        ))}

                        <Hr style={hr} />

                        <Row style={summaryRow}>
                            <Column>
                                <Text style={summaryLabel}>Subtotal</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={summaryValue}>{subtotal}</Text>
                            </Column>
                        </Row>
                        <Row style={summaryRow}>
                            <Column>
                                <Text style={summaryLabel}>Shipping ({shipping_method})</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={summaryValue}>{shipping_total}</Text>
                            </Column>
                        </Row>
                        {tax_total && (
                            <Row style={summaryRow}>
                                <Column>
                                    <Text style={summaryLabel}>Tax</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={summaryValue}>{tax_total}</Text>
                                </Column>
                            </Row>
                        )}
                        {discount_total && (
                            <Row style={summaryRow}>
                                <Column>
                                    <Text style={summaryLabel}>Discount</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={summaryValue}>-{discount_total}</Text>
                                </Column>
                            </Row>
                        )}
                        <Row style={{ ...summaryRow, borderTop: "1px solid #e6ebf1", paddingTop: "12px", marginTop: "12px" }}>
                            <Column>
                                <Text style={totalLabel}>Total</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={totalValue}>{total}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Section style={{ marginTop: "24px" }}>
                        <Row>
                            <Column style={{ paddingRight: "12px", width: "50%", verticalAlign: "top" }}>
                                <Section style={card}>
                                    <Text style={cardTitle}>Shipping Address</Text>
                                    <Text style={addressText}>
                                        {shipping_address?.first_name} {shipping_address?.last_name}<br />
                                        {shipping_address?.address_1}<br />
                                        {shipping_address?.city}, {shipping_address?.province}<br />
                                        {shipping_address?.postal_code}<br />
                                        {shipping_address?.phone}
                                    </Text>
                                </Section>
                            </Column>
                            <Column style={{ paddingLeft: "12px", width: "50%", verticalAlign: "top" }}>
                                <Section style={card}>
                                    <Text style={cardTitle}>Customer Info</Text>
                                    <Text style={addressText}>
                                        {customer_name}<br />
                                        {customer_email}
                                    </Text>
                                </Section>
                            </Column>
                        </Row>
                    </Section>

                    <Text style={footer}>
                        If you have any questions, reply to this email or contact us at customercare@mastro-store.com
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
    fontSize: "12px",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    fontWeight: "600",
    margin: "0 0 4px 0",
}

const value = {
    fontSize: "14px",
    color: "#111827",
    fontWeight: "500",
    margin: "0",
}

const itemRow = {
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
}

const productImage = {
    borderRadius: "6px",
    objectFit: "cover" as const,
    border: "1px solid #e5e7eb",
}

const productTitle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0 0 4px 0",
}

const productVariant = {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0 0 4px 0",
}

const productMeta = {
    fontSize: "12px",
    color: "#6b7280",
    margin: "0",
}

const productPrice = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    margin: "0",
}

const hr = {
    borderColor: "#e5e7eb",
    margin: "20px 0",
}

const summaryRow = {
    marginBottom: "8px",
}

const summaryLabel = {
    fontSize: "14px",
    color: "#6b7280",
    margin: "0",
}

const summaryValue = {
    fontSize: "14px",
    fontWeight: "500",
    color: "#111827",
    margin: "0",
}

const totalLabel = {
    fontSize: "16px",
    fontWeight: "600",
    color: "#111827",
    margin: "0",
}

const totalValue = {
    fontSize: "16px",
    fontWeight: "700",
    color: "#111827",
    margin: "0",
}

const cardTitle = {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
    marginBottom: "12px",
    margin: "0 0 12px 0",
}

const addressText = {
    fontSize: "14px",
    color: "#4b5563",
    lineHeight: "20px",
    margin: "0",
}

const footer = {
    fontSize: "12px",
    color: "#9ca3af",
    textAlign: "center" as const,
    marginTop: "24px",
}

export default OrderPlacedEmail

