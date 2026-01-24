        "shipped_total": 0,        "return_requested_total": 0,        "return_received_total": 0,        "return_dismissed_total": 0,        "write_off_total": 0,        "raw_subtotal": {          "value": "10",          "precision": 20,        },        "raw_total": {          "value": "10",          "precision": 20,        },        "raw_original_total": {          "value": "10",          "precision": 20,        },        "raw_discount_total": {          "value": "0",          "precision": 20,        },        "raw_discount_subtotal": {          "value": "0",          "precision": 20,        },        "raw_discount_tax_total": {          "value": "0",          "precision": 20,        },        "raw_tax_total": {          "value": "0",          "precision": 20,        },        "raw_original_tax_total": {          "value": "0",          "precision": 20,        },        "raw_refundable_total_per_unit": {          "value": "10",          "precision": 20,        },        "raw_refundable_total": {          "value": "10",          "precision": 20,        },        "raw_fulfilled_total": {          "value": "0",          "precision": 20,        },        "raw_shipped_total": {          "value": "0",          "precision": 20,        },        "raw_return_requested_total": {          "value": "0",          "precision": 20,        },        "raw_return_received_total": {          "value": "0",          "precision": 20,        },        "raw_return_dismissed_total": {          "value": "0",          "precision": 20,        },        "raw_write_off_total": {          "value": "0",          "precision": 20,        },      },    ],    "shipping_address": {      "id": "caaddr_01JSNXD6W0TGPH2JQD18K97B25",      "customer_id": null,      "company": "",      "first_name": "safasf",      "last_name": "asfaf",      "address_1": "asfasf",      "address_2": "",      "city": "asfasf",      "country_code": "dk",      "province": "",      "postal_code": "asfasf",      "phone": "",      "metadata": null,      "created_at": "2025-04-25T07:25:48.801Z",      "updated_at": "2025-04-25T07:25:48.801Z",      "deleted_at": null,    },    "billing_address": {      "id": "caaddr_01JSNXD6W0V7RNZH63CPG26K5W",      "customer_id": null,      "company": "",      "first_name": "safasf",      "last_name": "asfaf",      "address_1": "asfasf",      "address_2": "",      "city": "asfasf",      "country_code": "dk",      "province": "",      "postal_code": "asfasf",      "phone": "",      "metadata": null,      "created_at": "2025-04-25T07:25:48.801Z",      "updated_at": "2025-04-25T07:25:48.801Z",      "deleted_at": null,    },    "shipping_methods": [      {        "id": "ordsm_01JSNXDH9B9DDRQXJT5J5AE5V1",        "name": "Standard Shipping",        "description": null,        "is_tax_inclusive": false,        "is_custom_amount": false,        "shipping_option_id": "so_01JSNXAQA64APG6BNHGCMCTN6V",        "data": {},        "metadata": null,        "raw_amount": {          "value": "10",          "precision": 20,        },        "created_at": new Date(),        "updated_at": new Date(),        "deleted_at": null,        "tax_lines": [],        "adjustments": [],        "amount": 10,        "order_id": "order_01JSNXDH9BPJWWKVW03B9E9KW8",        "detail": {          "id": "ordspmv_01JSNXDH9B5RAF4FH3M1HH3TEA",          "version": 1,          "order_id": "order_01JSNXDH9BPJWWKVW03B9E9KW8",          "return_id": null,          "exchange_id": null,          "claim_id": null,          "created_at": new Date(),          "updated_at": new Date(),          "deleted_at": null,          "shipping_method_id": "ordsm_01JSNXDH9B9DDRQXJT5J5AE5V1",        },        "subtotal": 10,        "total": 10,        "original_total": 10,        "discount_total": 0,        "discount_subtotal": 0,        "discount_tax_total": 0,        "tax_total": 0,        "original_tax_total": 0,        "raw_subtotal": {          "value": "10",          "precision": 20,        },        "raw_total": {          "value": "10",          "precision": 20,        },        "raw_original_total": {          "value": "10",          "precision": 20,        },        "raw_discount_total": {          "value": "0",          "precision": 20,        },        "raw_discount_subtotal": {          "value": "0",          "precision": 20,        },        "raw_discount_tax_total": {          "value": "0",          "precision": 20,        },        "raw_tax_total": {          "value": "0",          "precision": 20,        },        "raw_original_tax_total": {          "value": "0",          "precision": 20,        },      },    ],    "customer": {      "id": "cus_01JSNXD6VQC1YH56E4TGC81NWX",      "company_name": null,      "first_name": null,      "last_name": null,      "email": "afsaf@gmail.com",      "phone": null,      "has_account": false,      "metadata": null,      "created_by": null,      "created_at": "2025-04-25T07:25:48.791Z",      "updated_at": "2025-04-25T07:25:48.791Z",      "deleted_at": null,    },  },}// @ts-ignoreexport default () => <OrderPlacedEmailComponent {...mockOrder} />

You create a mock order object that contains the order's details. Then, you export a default function that returns the OrderPlacedEmailComponent passing it the mock order.

The React Email CLI tool will use the function to render the email template.

Finally, add the following script to package.json:

Code
Ask AI

{  "scripts": {    "dev:email": "email dev --dir ./src/modules/resend/emails"  }}

This script will run the React Email CLI tool, passing it the directory where the email templates are located.

You can now test out the email template by running the following command:

Ask AI

npm run dev:email

This will start a development server at <http://localhost:3000>. If you open this URL, you can view your email templates in the browser.

You can make changes to the email template, and the server will automatically reload the changes.

The email template rendered in the browser
Step 6: Send Email when Order is Placed#

Medusa has an event system that emits an event when a commerce operation is performed. You can then listen and handle that event in an asynchronous function called a subscriber.

So, to send a confirmation email when a customer places an order, which is a commerce operation that Medusa already implements, you don't need to extend or hack your way into Medusa's implementation as you would do with other commerce platforms.

Instead, you'll create a subscriber that listens to the order.placed event and sends an email when the event is emitted.
Note: Learn more about Medusa's event system in this documentation.
Send Order Confirmation Email Workflow#

To send the order confirmation email, you need to retrieve the order's details first, then use the Notification Module's service to send the email. To implement this flow, you'll create a workflow.

A workflow is a series of queries and actions, called steps, that complete a task. You construct a workflow like you construct a function, but it's a special function that allows you to track its executions' progress, define roll-back logic, and configure other advanced features. Then, you execute the workflow from other customizations, such as in a subscriber.
Note: Learn more about workflows in this documentation
Send Notification Step

You'll start by implementing the step of the workflow that sends the notification. To do that, create the file src/workflows/steps/send-notification.ts with the following content:

src/workflows/steps/send-notification.ts
Ask AI

import { Modules } from "@medusajs/framework/utils"import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"import { CreateNotificationDTO } from "@medusajs/framework/types"
export const sendNotificationStep = createStep(  "send-notification",  async (data: CreateNotificationDTO[], { container }) => {    const notificationModuleService = container.resolve(      Modules.NOTIFICATION    )    const notification = await notificationModuleService.createNotifications(data)    return new StepResponse(notification)  })

You define the sendNotificationStep using the createStep function that accepts two parameters:

    A string indicating the step's unique name.
    The step's function definition as a second parameter. It accepts the step's input as a first parameter, and an object of options as a second.

The container property in the second parameter is an instance of the Medusa container, which is a registry of Framework and commerce tools, such as a module's service, that you can resolve to utilize their functionalities.
Tip: The Medusa container is accessible by all customizations, such as workflows and subscribers, except for modules. Each module has its own container with Framework tools like the Logger utility.

In the step function, you resolve the Notification Module's service, and use its createNotifications method, passing it the notification's data that the step receives as an input.

The step returns an instance of StepResponse, which must be returned by any step. It accepts as a parameter the data to return to the workflow that executed this step.
Workflow Implementation

You'll now create the workflow that uses the sendNotificationStep to send the order confirmation email.

Create the file src/workflows/send-order-confirmation.ts with the following content:

src/workflows/send-order-confirmation.ts
Ask AI

import {   createWorkflow,   when,  WorkflowResponse,} from "@medusajs/framework/workflows-sdk"import { useQueryGraphStep } from "@medusajs/medusa/core-flows"import { sendNotificationStep } from "./steps/send-notification"
type WorkflowInput = {  id: string}
export const
sendOrderConfirmationWorkflow = createWorkflow(  "send-order-confirmation",  ({ id }: WorkflowInput) => {    const { data: orders } =
useQueryGraphStep({      entity: "order",      fields: [        "id",        "display_id",        "email",        "currency_code",        "total",        "items.*",        "shipping_address.*",        "billing_address.*",        "shipping_methods.*",        "customer.*",        "total",        "subtotal",        "discount_total",        "shipping_total",        "tax_total",        "item_subtotal",        "item_total",        "item_tax_total",      ],      filters: {        id,      },      options: {        throwIfKeyNotFound: true,      },    })        const notification = when({ orders }, (data) => !!data.orders[0].email)    .then(() => {      return
sendNotificationStep([{        to: orders[0].email!,        channel: "email",        template: "order-placed",        data: {          order: orders[0],        },      }])    })
    return new WorkflowResponse({      notification,    })  })

You create a workflow using createWorkflow from the Workflows SDK. It accepts the workflow's unique name as a first parameter.

It accepts as a second parameter a constructor function, which is the workflow's implementation. The workflow has the following steps:

    useQueryGraphStep, which is a step implemented by Medusa that uses Query, a tool that allows you to retrieve data across modules. You use it to retrieve the order's details.
    Ensure that the order has an email address by using when-then. If so, you send the notification using the sendNotificationStep you implemented earlier. You pass it an object with the following properties:
        to: The address to send the email to. You pass the customer's email that is stored in the order.
        channel: The channel to send the notification through, which is email. Since you specified email in the Resend Module Provider's channel option, the Notification Module will delegate the sending to the Resend Module Provider's service.
        template: The email's template type. You retrieve the template content in the ResendNotificationProviderService's send method based on the template specified here.
        data: The data to pass to the email template, which is the order's details.

Tip: when allows you to perform steps based on a condition during execution. Learn more in the Conditions in Workflows documentation.

You'll execute the workflow when you create the subscriber next.
Add the Order Placed Subscriber

Now that you have the workflow to send an order-confirmation email, you'll execute it in a subscriber that's executed whenever an order is placed.

You create a subscriber in a TypeScript or JavaScript file under the src/subscribers directory. So, create the file src/subscribers/order-placed.ts with the following content:

src/subscribers/order-placed.ts
Ask AI

import type {  SubscriberArgs,  SubscriberConfig,} from "@medusajs/framework"import { sendOrderConfirmationWorkflow } from "../workflows/send-order-confirmation"
export default async function
orderPlacedHandler({  event: {
data },  
container,}: SubscriberArgs<{ id: string }>) {  await
sendOrderConfirmationWorkflow(container)    .run({
input: {
id: data.id,      },    })}
export const
config: SubscriberConfig = {  
event: "order.placed",}

A subscriber file exports:

    An asynchronous function that's executed whenever the associated event is emitted, which is the order.placed event.
    A configuration object with an event property indicating the event the subscriber is listening to.

The subscriber function accepts the event's details as a first parameter which has a data property that holds the data payload of the event. For example, Medusa emits the order.placed event with the order's ID in the data payload. The function also accepts as a second parameter the Medusa container.

In the function, you execute the sendOrderConfirmationWorkflow by invoking it, passing it the container, then using its run method. The run method accepts an object having an input property, which is the input to pass to the workflow. You pass the ID of the placed order as received in the event's data payload.

This subscriber now runs whenever an order is placed. You'll see this in action in the next section.
Test it Out: Place an Order#

To test out the Resend integration, you'll place an order using the Next.js Starter Storefront that you installed as part of installing Medusa.

Start your Medusa application first:

Ask AI

npm run dev

Then, in the Next.js Starter Storefront's directory (which was installed in a directory outside of the Medusa application's directory with the name {project-name}-storefront, where {project-name} is the name of the Medusa application's directory), run the following command to start the storefront:

Ask AI

npm run dev

Then, open the storefront in your browser at <http://localhost:8000> and:

    Go to Menu -> Store.

Choose Store from Menu

1. Click on a product, select its options, and add it to the cart.

Choose an option, such as size, then click on the Add to cart button

1. Click on Cart at the top right, then click Go to Cart.

Cart is at the top right. It opens a dropdown with a Go to Cart button

1. On the cart's page, click on the "Go to checkout" button.

The Go to checkout button is at the right side of the page

1. On the checkout page, when entering the shipping address, make sure to set the email to your Resend account's email if you didn't set up a custom domain.

Enter your Resend account email if you didn't set up a custom domain

1. After entering the shipping address, choose a delivery and payment methods, then click the Place Order button.

Once the order is placed, you'll find the following message logged in the Medusa application's terminal:

Terminal
Ask AI

info:    Processing order.placed which has 1 subscribers

This indicates that the order.placed event was emitted and its subscriber, which you added in the previous step, is executed.

If you check the inbox of the email address you specified in the shipping address, you'll find a new email with the order's details.

Example of order-confirmation email
Next Steps#

You've now integrated Medusa with Resend. You can add more templates for other emails, such as customer registration confirmation, user invites, and more. Check out the Events Reference for a list of all events that the Medusa application emits.
More Resend Email Templates#

Find more email templates to use with the Resend Module Provider in the following guides:

    Send Invite User Email.
    Send Reset Password Email.

Learn More About Medusa#

If you're new to Medusa, check out the main documentation, where you'll get a more in-depth learning of all the concepts you've used in this guide and more.

To learn more about the commerce features that Medusa provides, check out Medusa's Commerce Modules.
