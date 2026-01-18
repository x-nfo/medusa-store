import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Text,
    Section,
    Row,
    Column,
} from "@react-email/components"
import * as React from "react"

interface OrderPlacedEmailProps {
    id: string
    email: string
    date: string
    shipping_address: {
        first_name: string
        last_name: string
        address_1: string
        city: string
        postal_code: string
    }
    items: Array<{
        title: string
        quantity: number
        unit_price: number
    }>
    currency_code: string
    total: number
}

export const OrderPlacedEmail = ({
    id,
    email,
    date,
    items = [],
    total,
    currency_code,
}: OrderPlacedEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Thank you for your order!</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Heading style={h1}>Order Confirmation</Heading>
                    <Text style={text}>
                        Thank you for your order, {email}!
                    </Text>
                    <Text style={text}>
                        Order ID: {id}<br />
                        Date: {date}
                    </Text>

                    <Section style={section}>
                        <Heading as="h2" style={h2}>Order Summary</Heading>
                        {items.map((item, index) => (
                            <Row key={index} style={row}>
                                <Column>
                                    <Text style={itemTitle}>{item.title} x {item.quantity}</Text>
                                </Column>
                                <Column style={{ textAlign: "right" }}>
                                    <Text style={itemPrice}>
                                        {item.unit_price} {currency_code?.toUpperCase()}
                                    </Text>
                                </Column>
                            </Row>
                        ))}
                        <Row style={totalRow}>
                            <Column>
                                <Text style={totalText}>Total</Text>
                            </Column>
                            <Column style={{ textAlign: "right" }}>
                                <Text style={totalPrice}>
                                    {total} {currency_code?.toUpperCase()}
                                </Text>
                            </Column>
                        </Row>
                    </Section>

                    <Text style={footer}>
                        If you have any questions, please contact us.
                    </Text>
                </Container>
            </Body>
        </Html>
    )
}

export default OrderPlacedEmail

const main = {
    backgroundColor: "#ffffff",
    fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
    margin: "0 auto",
    padding: "20px 0 48px",
    width: "560px",
}

const h1 = {
    fontSize: "24px",
    fontWeight: "600",
    lineHeight: "32px",
    margin: "0 0 20px",
}

const h2 = {
    fontSize: "20px",
    fontWeight: "600",
    lineHeight: "26px",
    margin: "0 0 16px",
}

const text = {
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px",
    color: "#333",
}

const section = {
    padding: "24px",
    border: "1px solid #e6e6e6",
    borderRadius: "4px",
    margin: "24px 0",
}

const row = {
    marginBottom: "12px",
}

const itemTitle = {
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0",
}

const itemPrice = {
    fontSize: "14px",
    lineHeight: "24px",
    margin: "0",
    fontWeight: "600",
}

const totalRow = {
    marginTop: "16px",
    borderTop: "1px solid #e6e6e6",
    paddingTop: "16px",
}

const totalText = {
    fontSize: "16px",
    fontWeight: "600",
    margin: "0",
}

const totalPrice = {
    fontSize: "16px",
    fontWeight: "600",
    margin: "0",
}

const footer = {
    color: "#8898aa",
    fontSize: "12px",
    lineHeight: "16px",
}
