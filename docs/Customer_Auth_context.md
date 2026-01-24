Register Customer in Storefront

In this guide, you'll learn how to register a customer in your storefront.

This guide covers registration using email and password. For authentication with third-party providers, refer to the Third-Party Login guide.
Register Customer Flow#

To register a customer, you implement the following steps:

A diagram illustrating the flow of the register customer flow

    Show the customer a form to enter their details.
    Send a POST request to the /auth/customer/emailpass/register Get Registration Token API route to obtain a registration JWT token.
    Send a request to the Register Customer API route passing the registration JWT token in the header.

However, a customer may enter an email that's already used either by an admin user, another customer, or a custom actor type. To handle this scenario:

    Try to obtain a login token by sending a POST request to the /auth/customer/emailpass Authenticate Customer API route. The customer is only allowed to register if their email and password match the existing identity. This allows admin users to log in or register as customers.
    If you obtained the login token successfully, register the customer using the login JWT token instead of the registration token. This will not remove the existing identity. So, for example, an admin user can also become a customer.

When you're using the JS SDK, this flow is simplified with quick registration and login methods. The rest of this guide uses the JS SDK to demonstrate the registration flow. However, if you're not using the JS SDK, you can still implement the same flow using the API routes.
Tip: Learn how to install and configure the JS SDK in the JS SDK documentation.
How to Implement the Register Customer Flow#

An example implementation of the registration flow in a storefront:

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { sdk } from "@/lib/sdk"import { FetchError } from "@medusajs/js-sdk"
export default function Register() {  const [loading, setLoading] = useState(false)  const [firstName, setFirstName] = useState("")  const [lastName, setLastName] = useState("")  const [email, setEmail] = useState("")  const [password, setPassword] = useState("")
  const handleRegistration = async (    e: React.MouseEvent<HTMLButtonElement, MouseEvent>  ) => {    e.preventDefault()    if (!firstName || !lastName || !email || !password) {      return    }    setLoading(true)
    try {      await sdk.auth.
register("customer", "emailpass", {        email,        password,      })    } 
catch (error) {      const fetchError = error as FetchError            if (fetchError.statusText !== "Unauthorized" || fetchError.message !== "Identity with email already exists") {        alert(`An error occurred while creating account: ${fetchError}`)        return      }      // another identity (for example, admin user)      // exists with the same email. So, use the auth      // flow to login and create a customer.      const 
loginResponse = (await sdk.auth.login("customer", "emailpass", {        email,        password,      }).
catch((e) => {        alert(`An error occurred while creating account: ${e}`)      }))
      if (!loginResponse) {        return      }
      if (typeof loginResponse !== "string") {        alert("Authentication requires more actions, which isn't supported by this flow.")        return      }    }
    // create customer    try {      const { customer } = await sdk.store.customer.
create({        first_name: firstName,        last_name: lastName,        email,      })        setLoading(false)
      console.log(customer)      // TODO redirect to login page    } 
catch (error) {      console.error(error)      alert("Error: " + error)      return    }  }
  return (    <form>      <input 

In the above example, you create a handleRegistration function that:

    Obtains a registration JWT token from the /auth/customer/emailpass/register API route using the auth.register method. If an error is thrown:
        If the error is an existing identity error, try retrieving the login JWT token from /auth/customer/emailpass API route using the auth.login method. This will fail if the existing identity has a different password, which doesn't allow the customer from registering.
        For other errors, show an alert and exit execution.
        The JS SDK automatically stores an re-uses the authentication headers or session in the auth.register and auth.login methods. So, if you're not using the JS SDK, make sure to pass the received authentication tokens as explained in the API reference
    Send a request to the Register Customer API route to register the customer in Medusa.
        If an error occurs, show an alert and exit execution.
        As mentioned, the JS SDK automatically sends the authentication headers or session in all requests after registration or logging in. If you're not using the JS SDK, make sure to pass the received authentication tokens as explained in the API reference.
    Once the customer is registered successfully, you can either redirect the customer to the login page or log them in automatically, as explained in the Login guide.

## Login

Login Customer Methods#

There are two ways to login a customer in your storefront:

    Using a JWT token. This JWT token is obtained from the /auth/customer/emailpass API route and is used as a bearer token in the authorization header of all requests.
    Using a cookie session. This method uses the /auth/session API route to set the authenticated session ID in the cookies.

The JS SDK simplifies the login approach in a single auth.login method. The upcoming sections explain the authentication approach whether you're using the JS SDK or not.
Which Authentication Method Should You Use?#

The authentication method you choose depends on your use case and the type of storefront you're building.

Refer to the JS SDK Authentication guide to learn more about the differences between JWT and session authentication and which one is best for your use case.
JS SDK Authentication Configuration#

Before implementing the login flow, you need to configure in the JS SDK the authentication method you're using in your storefront. This defines how the JS SDK will handle sending authenticated requests after the customer is authenticated.

For example, add the following configuration to your JS SDK initialization:
Tip: Learn how to install and configure the JS SDK in the JS SDK documentation.

Ask AI

export const sdk = new Medusa({  // ...  auth: {    type: "jwt",  },})

The JS SDK will now pass the JWT token or the session ID cookie in the authorization header of all subsequent requests based on the authentication method you've configured.

Refer to the JS SDK Authentication guide for more information about these configurations, as well as other authentication configurations.
Tip: By default, when you choose the jwt method, the JWT token is stored in the browser's localStorage. However, you can change how the token is stored, which is useful in environments where localStorage is not available. For example, in React Native.To learn how to change the storage method with an example for a React Native storefront, refer to the JS SDK Authentication guide.
Authentication with JS SDK#

The JS SDK provides an auth.login method that handles all authentication steps based on the configured authentication method. Then, all subsequent requests will have the necessary authentication headers or cookies.

For example, to implement the login flow in your storefront with the JS SDK:

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { sdk } from "@/lib/sdk"
export default function Login() {  const [loading, setLoading] = useState(false)  const [email, setEmail] = useState("")  const [password, setPassword] = useState("")    const handleLogin = async (    e: React.MouseEvent<HTMLButtonElement, MouseEvent>  ) => {    e.preventDefault()    if (!email || !password) {      return    }
    setLoading(true)
    let token: string | { location: string }
    try {      token = await sdk.auth.
login("customer", "emailpass", {        email,        password,      })    } 
catch (error) {      alert(`An error occurred while logging in: ${error}`)      return    }
    if (typeof token !== "string") {      alert("Authentication requires more actions, which isn't supported by this flow.")      return    }
    // all next requests will be authenticated    const { customer } = await sdk.store.customer.
retrieve()
    console.log(customer)    setLoading(false)  }
  return (    <form>      <input 

In the example above, you:

    Create a handleLogin function that logs in a customer.
    In the function, you log in the customer using the sdk.auth.login method.
        If an error occurs, show an alert and exit execution.
        The method may return an object with a location property. This occurs when using third-party authentication providers. Learn more about implementing third-party authentication in the Third-Party Login guide.
        Otherwise, the authentication was successful.
    All subsequent requests are now authenticated. As an example, you send a request to obtain the logged-in customer's details.

Authentication without JS SDK#

If you're not using the JS SDK, the next sections cover the general flow for authenticating a customer in your storefront for both methods.
1. Using a JWT Token#

The first authentication approach is to pass an authenticated JWT token in the authorization header of all requests. You can do that by:

    Retrieving a JWT token from the /auth/customer/emailpass Authenticate Customer API route:

Code
Ask AI

curl -X POST '{backend_url}/auth/customer/emailpass' \-H 'Content-Type: application/json' \--data-raw '{  "email": "customer@gmail.com",  "password": "supersecret"}'

    Passing the token in the authorization header of all subsequent requests, as explained in the API reference:

Terminal
Ask AI

Authorization: Bearer {jwt_token}

You can store the obtained JWT token based on your use case. For example, you can store it in the browser's localStorage or sessionStorage. This way, you can retrieve it later and pass it in the authorization header of all requests.
2. Using a Cookie Session#

The second authentication approach is to authenticate the customer with a cookie session. You do that by:

    Retrieving a JWT token from the /auth/customer/emailpass Authenticate Customer API route:

Code
Ask AI

curl -X POST '{backend_url}/auth/customer/emailpass' \-H 'Content-Type: application/json' \--data-raw '{  "email": "customer@gmail.com",  "password": "supersecret"}'

    Sending a request to the /auth/session Authentication Session API route passing in the authorization header the token as a Bearer token. This sets the authenticated session ID in the cookies:

Code
Ask AI

curl -X POST '{backend_url}/auth/session' \-H 'Authorization: Bearer {jwt_token}'

    Passing the cookie session ID in all subsequent requests:

Ask AI

curl '{backend_url}/store/products' \-H 'Cookie: connect.sid={sid}'

## Reset Password

Reset Customer Password in Storefront

In this guide, you'll learn how to implement the flow to reset a customer's password in your storefront.
Reset Password Flow in Storefront#

Customers need to reset their password if they forget it. To implement the flow to reset a customer's password, you need two pages in your storefront:

    Request Reset Password Page: A page to request the password reset.
        When the customer requests to reset their password, they would receive an email (or other notification) with a URL to the Reset Password Page.
    Reset Password Page: A page that prompts the customer to enter a new password.

To send the customer an email (or other notification) with the URL to reset their password, you must implement the subscriber that handles the notification.↗
1. Request Reset Password Page#

The request password reset page prompts the customer to enter their email. Then, it sends a request to the Request Reset Password Token API route to request resetting the password.

This API route will then handle sending an email or another type of notification, if you handle it as explained in the Reset Password Guide.

For example, you can implement the following functionality in your storefront to request resetting the password:
Tip: Learn how to install and configure the JS SDK in the JS SDK documentation.

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { sdk } from "@/lib/sdk"
export default function RequestResetPassword() {  const [loading, setLoading] = useState(false)  const [email, setEmail] = useState("")
  const handleSubmit = async (    e: React.FormEvent<HTMLFormElement>  ) => {    e.preventDefault()    if (!email) {      alert("Email is required")      return    }    setLoading(true)
    sdk.auth.
resetPassword("customer", "emailpass", {      
identifier: email,    })    .then(() => {      alert("If an account exists with the specified email, it'll receive instructions to reset the password.")    })    .catch((error) => {      alert(error.message)    })    .finally(() => {      setLoading(false)    })  }
  return (    <form onSubmit={handleSubmit}>      <label>Email</label>      <input         placeholder="Email"         type="email"         value={email}         onChange={(e) => setEmail(e.target.value)}      />      <button type="submit" disabled={loading}>        Request Password Reset      </button>    </form>  )}

In this example, you send a request to the Request Reset Password Token API route when the form that has the email field is submitted.

In the request body, you pass an identifier parameter, which is the customer's email.
Tip: The Request Reset Password Token API route returns a successful response always, even if the customer's email doesn't exist. This ensures that customer emails that don't exist are not exposed.
2. Reset Password Page#

Once the customer requests to reset their password, you should handle sending them a notification, such as an email, as explained in the Reset Password Guide.

The notification should include a URL in your storefront that allows the customer to update their password. In this step, you'll implement this page.

The reset password page should receive a token and email query parameters. Then, it prompts the customer for a new password, and sends a request to the Reset Password API route to update the password.
Note: If you followed this guide to set up a subscriber that sends the customer an email, make sure to use the URL of this page in the notification's data payload.

For example:

Ask AI

"use client" // include with Next.js 13+
import { useMemo, useState } from "react"import { sdk } from "@/lib/sdk"
export default function ResetPassword() {  const [loading, setLoading] = useState(false)  const [password, setPassword] = useState("")  // for other than Next.js  const searchParams = useMemo(() => {    if (typeof window === "undefined") {      return    }
    return new URLSearchParams(      window.location.search    )  }, [])  const 
token = useMemo(() => {    return searchParams?.get("token")  }, [searchParams])  const 
email = useMemo(() => {    return searchParams?.get("email")  }, [searchParams])
  const handleSubmit = async (    e: React.FormEvent<HTMLFormElement>  ) => {    e.preventDefault()    if (!token) {      return    }    if (!password) {      alert("Password is required")      return    }    setLoading(true)
    sdk.auth.
updateProvider("customer", "emailpass", {      email,      
password,    }, token)    .then(() => {      alert("Password reset successfully!")    })    .catch((error) => {      alert(`Couldn't reset password: ${error.message}`)    })    .finally(() => {      setLoading(false)    })  }
  return (    <form onSubmit={handleSubmit}>      <label>Password</label>      <input         placeholder="Password"         type="password"         value={password}         onChange={(e) => setPassword(e.target.value)}      />      <button type="submit" disabled={loading}>        Reset Password      </button>    </form>  )}

In this example, you receive the token and email from the page's query parameters.

Then, when the form that has the password field is submitted, you send a request to the Reset Password API route, passing it the token, email, and new password.

Notice that the JS SDK passes the token in the Authorization: Bearer header. So, if you're implementing this flow without using the JS SDK, make sure to pass the token accordingly.
Note: Before Medusa v2.6, you passed the token as a query parameter. Now, you must pass it in the Authorization: Bearer header.

Retrieve Logged-In Customer in Storefront

In this guide, you'll learn how to retrieve a customer after they've been authenticated in your storefront.
Prerequisites: Set the Customer's Authentication Token#

When using the JS SDK, make sure that you've set the customer's authentication token using the setToken function:

Code
Ask AI

sdk.client.setToken(token)

You can learn more in the Login Customer and Third-Party Login guides.
Retrieve Logged-In Customer#

To retrieve the logged-in customer, send a request to the Get Customer API route:

Code
Ask AI

sdk.store.customer.retrieve().then(({ customer }) => {  // use customer...  console.log(customer)})

This will retrieve the authenticated customer's details. The Get Customer API route returns a customer field, which is a customer object.

Notice that the JS SDK automatically passes the necessary authentication headers or cookies based on your authentication configurations, as explained in the Login Customer guide.

If you're not using the JS SDK, you need to pass the authentication token in the request headers or cookies accordingly:

    If you authenticate the customer with bearer authorization, pass the token in the authorization header of the request.
    If you authenticate the customer with cookie session, pass the credentials: include option to the fetch function.

Restrict Access to Authenticated Customers#

In your storefront, it's common to restrict access to certain pages to authenticated customers only.

For example, you may want to restrict access to the customer's profile page to authenticated customers only.

To do this, you can try to retrieve the customer's details. If the request fails, you can redirect the customer to the login page.

For example:

Code
Ask AI

sdk.store.customer.retrieve().then(({ customer }) => {  // use customer...  console.log(customer)}).catch(() => {  // redirect to login page})

The catch block will only execute if the request fails, which means that the customer is not authenticated. You can add the redirect logic to the catch block based on your storefront framework.

Customer Context in Storefront

In this guide, you'll learn how to create a customer context in your storefront.
Why Create a Customer Context?#

Throughout your storefront, you'll need to access the logged-in customer to perform different actions, such as associating it with a cart.

So, if your storefront is React-based, you can create a customer context and add it at the top of your components tree. Then, you can access the logged-in customer anywhere in your storefront.
Create Customer Context Provider#

For example, create the following file that exports a CustomerProvider component and a useCustomer hook:
Tip: Learn how to install and configure the JS SDK in the JS SDK documentation.

Code
Ask AI

"use client" // include with Next.js 13+
import {   createContext,   useContext,   useEffect,   useState,} from "react"import { HttpTypes } from "@medusajs/types"import { sdk } from "@/lib/sdk"
type CustomerContextType = {  
customer: HttpTypes.StoreCustomer | undefined  
setCustomer: React.Dispatch<    React.SetStateAction<HttpTypes.StoreCustomer | undefined>  >}
const CustomerContext = createContext<CustomerContextType | null>(null)
type CustomerProviderProps = {  children: React.ReactNode}
export const 
CustomerProvider = ({  children,}: CustomerProviderProps) => {  const [customer, setCustomer] = useState<    HttpTypes.StoreCustomer  >()
  useEffect(() => {    if (customer) {      return    }
    sdk.store.customer.
retrieve()    .then(({ customer }) => {      setCustomer(customer)    })    .catch((err) => {      // customer isn't logged in    })  }, [])
  return (    <CustomerContext.Provider value={{      customer,      setCustomer,    }}>      {children}    </CustomerContext.Provider>  )}
export const 
useCustomer = () => {  const context = useContext(CustomerContext)
  if (!context) {    throw new Error("useCustomer must be used within a CustomerProvider")  }
  return context}

The CustomerProvider handles retrieving the authenticated customer from the Medusa application. This assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

The useCustomer hook returns the value of the CustomerContext. Child components of CustomerProvider use this hook to access customer or setCustomer.
Use CustomerProvider in Component Tree#

To use the customer context's value, add the CustomerProvider high in your component tree.

For example, if you're using Next.js, add it to the app/layout.tsx or src/app/layout.tsx file:

app/layout.tsx
Ask AI

}
export default function RootLayout({  children,}: Readonly<{  children: React.ReactNode;}>) {  return (    <html lang="en">      <body className={inter.className}>        <RegionProvider>          <CustomerProvider>            {/* Other providers... */}            <CartProvider>              {children}            </CartProvider>          </CustomerProvider>        </RegionProvider>      </body>    </html>  )}

Use useCustomer Hook#

Now, you can use the useCustomer hook in child components of CustomerProvider.

For example:

Code
Ask AI

"use client" // include with Next.js 13+// ...import { useCustomer } from "@/providers/customer"
export default function Profile() {  const { customer } = useCustomer()  // ...}


Edit Customer Profile in Storefront

In this guide, you'll learn how to edit the customer's profile in the storefront, which is useful if you're adding a profile page to your storefront that allows the customer to view and edit their details.

To edit the customer's profile in the storefront, send a request to the Update Customer API route.

For example:
Tip: 

    Learn how to install and configure the JS SDK in the JS SDK documentation.
    This example uses the useCustomer hook defined in the Customer Context guide.
    Since only authenticated customers can edit their profile, this example assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { 
useCustomer } from "@/providers/customer"import { sdk } from "@/lib/sdk"
export default function EditProfile() {  const { customer, setCustomer } = useCustomer()  console.log(customer)  const [firstName, setFirstName] = useState(    customer?.first_name || ""  )  const [lastName, setLastName] = useState(    customer?.last_name || ""  )  const [company, setCompany] = useState(    customer?.company_name || ""  )  const [phone, setPhone] = useState(    customer?.phone || ""  )  const [loading, setLoading] = useState(false)
  const handleEdit = (    e: React.MouseEvent<HTMLButtonElement, MouseEvent>  ) => {    e.preventDefault()
    if (!customer) {      return    }
    setLoading(true)
    sdk.store.customer.update({      first_name: firstName,      last_name: lastName,      company_name: company,      phone,    })    .then(({ customer: updatedCustomer }) => {      setCustomer(updatedCustomer)    })    .finally(() => setLoading(false))  }
  return (    <form>      <input 

In the example above, you send a request to the Update Customer API route to update the customer's details.

The response of the request has a customer field which is a customer object

Manage Customer Addresses in Storefront

In this guide, you'll learn how to manage a customer's addresses in a storefront. This is useful in the customer's profile page, or when the customer adds an address during checkout and you want to save it for future orders.
List Customer Addresses#

To retrieve the list of customer addresses, send a request to the List Customer Addresses API route:
Tip: 

    Learn how to install and configure the JS SDK in the JS SDK documentation.
    Since only authenticated customers can view their addresses, this example assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

Ask AI

"use client" // include with Next.js 13+
import { HttpTypes } from "@medusajs/types"import { useEffect, useState } from "react"import { sdk } from "@/lib/sdk"
export default function Addresses() {  const [addresses, setAddresses] = useState<    HttpTypes.StoreCustomerAddress[]  >([])  const [loading, setLoading] = useState(true)  const limit = 20  const [currentPage, setCurrentPage] = useState(1)  const [hasMorePages, setHasMorePages] = useState(false)
  useEffect(() => {    if (!loading) {      return    }
    const 
offset = (currentPage - 1) * limit
    sdk.store.customer.
listAddress({      limit,      offset,    })    .then(({ addresses: addressesData, 
count }) => {      setAddresses((prev) => {        if (prev.length > offset) {          // addresses already added because           // the same request has already been sent          return prev        }        return [          ...prev,          ...addressesData,        ]      })      
setHasMorePages(count > limit * currentPage)    })    .finally(() => setLoading(false))  }, [loading])
  return (    <div>      {loading && <span>Loading...</span>}      {!loading && !addresses.length && (        <span>You have no addresses</span>      )}      <ul>        {addresses.map((address) => (          <li key={address.id}>

The List Customer Addresses API route accepts pagination parameters to paginate the address.

The request returns in the response the addresses field, which is an array of addresses. You can check its structure in the customer schema.

The request also returns the count field, which is the total number of addresses in the Medusa application. You can use it to check if there are more addresses to retrieve.
Add Customer Address#

To add a new address for the customer, send a request to the Add Customer Address API route:
Tip: 

    This example uses the useRegion hook defined in the Region Context guide.
    This example uses the useCustomer hook defined in the Customer Context guide.
    Since only authenticated customers can add addresses, this example assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { 
useRegion } from "@/providers/region"import { 
useCustomer } from "@/providers/customer"import { sdk } from "@/lib/sdk"
export default function AddAddress() {  const { region } = useRegion()  const { setCustomer } = useCustomer()
  const [loading, setLoading] = useState(false)  const [firstName, setFirstName] = useState("")  const [lastName, setLastName] = useState("")  const [address1, setAddress1] = useState("")  const [company, setCompany] = useState("")  const [postalCode, setPostalCode] = useState("")  const [city, setCity] = useState("")  const [countryCode, setCountryCode] = useState("")  const [province, setProvince] = useState("")  const [phoneNumber, setPhoneNumber] = useState("")
  const handleAdd = (    e: React.MouseEvent<HTMLButtonElement, MouseEvent>  ) => {    e.preventDefault()    setLoading(false)
    sdk.store.customer.createAddress({      first_name: firstName,      last_name: lastName,      address_1: address1,      company,      postal_code: postalCode,      city,      country_code: countryCode,      province,      phone: phoneNumber,    })    .then(({ customer }) => {      setCustomer(customer)    })    .finally(() => setLoading(false))  }
  return (    <form>      <input 

In this example, you send a request to the Add Customer Address API route to add a new address for the customer.

The response of the request has a customer field, which is a customer object. You can access the new address in the addressesCopy to Clipboard property of the customer object.
Edit an Address#

To edit an address, send a request to the Update Customer Address API route:
Tip: 

    This example uses the useRegion hook defined in the Region Context guide.
    This example uses the useCustomer hook defined in the Customer Context guide.
    Since only authenticated customers can edit their addresses, this example assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

Ask AI

"use client" // include with Next.js 13+
import { useState } from "react"import { 
useRegion } from "@/providers/region"import { 
useCustomer } from "@/providers/customer"import { sdk } from "@/lib/sdk"
type Props = {  id: string}
export default function EditAddress(  { id }: Props) {  const { customer, setCustomer } = useCustomer()  const { region } = useRegion()
  const 
address = customer?.addresses.find(    (address) => address.id === id  )  const [loading, setLoading] = useState(false)  const [firstName, setFirstName] = useState(    address?.first_name || ""  )  const [lastName, setLastName] = useState(    address?.last_name || ""  )  const [address1, setAddress1] = useState(    address?.address_1 || ""  )  const [company, setCompany] = useState(    address?.company || ""  )  const [postalCode, setPostalCode] = useState(    address?.postal_code || ""  )  const [city, setCity] = useState(    address?.city || ""  )  const [countryCode, setCountryCode] = useState(    address?.country_code || ""  )  const [province, setProvince] = useState(    address?.province || ""  )  const [phoneNumber, setPhoneNumber] = useState(    address?.phone || ""  )
  const handleEdit = (    e: React.MouseEvent<HTMLButtonElement, MouseEvent>  ) => {    e.preventDefault()    if (!customer || !address) {      return    }    setLoading(true)
    sdk.store.customer.updateAddress(address.id, {      first_name: firstName,      last_name: lastName,      address_1: address1,      company,      postal_code: postalCode,      city,      country_code: countryCode,      province,      phone: phoneNumber,    })    .then(({ customer }) => {      setCustomer(customer)    })    .finally(() => setLoading(false))  }
  return (    <form>      <input 

In this example, you send a request to the Update Customer Address API route to edit an address.

The response of the request has a customer field, which is a customer object. You can access the updated address in the addresses property of the customer object.
Delete Customer Address#

To delete a customer's address, send a request to the Delete Customer Address API route:
Tip: Since only authenticated customers can delete their addresses, this example assumes that the JS SDK is already configured for authentication and the customer's authentication token was set as explained in the Login in Storefront and Third-Party Login guides.

Code
Ask AI

sdk.store.customer.deleteAddress(
addrId).then(({ 
parent: customer }) => {  // use customer...  console.log(customer)})

In this example, you send a request to the Delete Customer Address API route to delete an address.

The response of the request has a parent field, which is a customer object. You can access the updated customer in the parent property of the response.


Log-out Customer in Storefront

In this guide, you'll learn how to log-out a customer in the storefront based on the authentication method.
Log-out using the JS SDK#

If you're using the JS SDK, you can use the auth.logout method to log-out the customer:

Code
Ask AI

sdk.auth.logout().then(() => {  // TODO redirect customer to login page})

The JS SDK will handle the necessary actions based on the authentication method you're using:

    If you're using the session authentication method, the JS SDK will send a DELETE request to the /auth/session route. Then, it will remove any stored tokens from the configured storage method (by default, localStorage).
    If you're using the jwt authentication method, the JS SDK will only remove the JWT token from the configured storage method (by default, localStorage).

Once the operation succeeds, you can redirect the customer to the login page.
Log-out without the JS SDK#

If you're not using the JS SDK, you need to log out the customer based on the authentication method you're using.
Log-out for JWT Token#

If you're authenticating the customer with their JWT token, remove the JWT token stored locally in your storefront based on your storage method.

For example, if you're storing the JWT token in localStorage, remove the item from it:

Code
Ask AI

localStorage.removeItem(`token`)

Where token is the key of the JWT token in the localStorage.
Log-out for Cookie Session#

If you're authenticating the customer with their cookie session ID, you need to send a DELETE request to the /auth/session route. This will remove the session cookie from the customer's browser.

For example:

Code
Ask AI

fetch(`http://localhost:9000/auth/session`, {  credentials: "include",  method: "DELETE",}).then((res) => res.json()).then(() => {  // TODO redirect customer to login page})

The API route returns nothing in the response. If the request was successful, you can perform any necessary work to unset the customer and redirect them to the login page.
