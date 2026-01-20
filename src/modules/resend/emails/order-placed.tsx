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
    items: Array<{
        title: string
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
                    <Heading style={h1}>Order Confirmation</Heading>
                    <Text style={text}>
                        Hi {customer_name}, thank you for your order!
                    </Text>
                    <Text style={text}>
                        We have received your order #{display_id} placed on {order_date}.
                    </Text>

                    <Section style={section}>
                        <Heading style={h2}>Order Summary</Heading>
                        {items?.map((item, index) => (
                            <Row key={index} style={row}>
                                <Column style={{ width: "64px" }}>
                                    {item.thumbnail && (
                                        <Img
                                            src={item.thumbnail}
                                            width="64"
                                            height="64"
                                            alt={item.title}
                                            style={productImage}
                                        />
                                    )}
                                </Column>
                                <Column style={{ paddingLeft: "12px" }}>
                                    <Text style={{ ...text, fontWeight: "bold" }}>{item.title}</Text>
                                    <Text style={text}>Qty: {item.quantity}</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={text}>{item.total}</Text>
                                </Column>
                            </Row>
                        ))}
                    </Section>

                    <Hr style={hr} />

                    <Section style={section}>
                        <Row>
                            <Column style={{ width: "70%" }}>
                                <Text style={text}>Subtotal</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={text}>{subtotal}</Text>
                            </Column>
                        </Row>
                        <Row>
                            <Column>
                                <Text style={text}>Shipping</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={text}>{shipping_total}</Text>
                            </Column>
                        </Row>
                        {tax_total && (
                            <Row>
                                <Column>
                                    <Text style={text}>Tax</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={text}>{tax_total}</Text>
                                </Column>
                            </Row>
                        )}
                        {discount_total && (
                            <Row>
                                <Column>
                                    <Text style={text}>Discount</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={text}>-{discount_total}</Text>
                                </Column>
                            </Row>
                        )}
                        <Row style={{ marginTop: "12px", fontWeight: "bold" }}>
                            <Column>
                                <Text style={text}>Total</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={text}>{total}</Text>
                            </Column>
                        </Row>
                    </Section>

                    <Hr style={hr} />

                    <Section style={section}>
                        <Heading style={h2}>Shipping Address</Heading>
                        <Text style={text}>
                            {shipping_address?.first_name} {shipping_address?.last_name}<br />
                            {shipping_address?.address_1}<br />
                            {shipping_address?.city}, {shipping_address?.province} {shipping_address?.postal_code}<br />
                            {shipping_address?.phone}
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    )
}

const main = {
    backgroundColor: "#ffffff",
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
    margin: "0 auto",
    padding: "20px 0 48px",
    maxWidth: "560px",
}

const h1 = {
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
    margin: "0 0 20px 0",
}

const h2 = {
    fontSize: "18px",
    fontWeight: "600",
    lineHeight: "24px",
    margin: "0 0 12px 0",
}

const section = {
    margin: "24px 0",
}

const row = {
    marginBottom: "12px",
}

const text = {
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0",
}

const hr = {
    borderColor: "#e6ebf1",
    margin: "20px 0",
}

const productImage = {
    borderRadius: "4px",
    objectFit: "cover" as const,
}

export default OrderPlacedEmail
