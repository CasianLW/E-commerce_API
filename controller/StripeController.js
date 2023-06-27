const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET);
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const cookieParser = require("cookie-parser");
const { where } = require("sequelize");
const SibApiV3Sdk = require("sib-api-v3-sdk");

const YOUR_DOMAIN = process.env.CLIENT_URL;
// const YOUR_DOMAIN = "http://localhost:8100";

// Create a checkout session
async function createCheckoutSession(req, res) {
  //   console.log(YOUR_DOMAIN);
  //   console.log(req.body);
  //   const prices = await stripe.prices.list({
  //     lookup_keys: [req.body.lookup_key],
  //     expand: ['data.product'],
  //   });
  const price_id = req.body.price_id;
  const customer_id = req.body.customer_id;
  const session = await stripe.checkout.sessions.create({
    billing_address_collection: "auto",
    customer: customer_id, // use the customer id
    line_items: [
      {
        price: price_id,
        // For metered billing, do not pass quantity
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${YOUR_DOMAIN}/checkout/success/?success=true&session_id={CHECKOUT_SESSION_ID}`,
    // cancel_url: `${YOUR_DOMAIN}/checkout/?canceled=true`,
    cancel_url: `${YOUR_DOMAIN}/checkout/failed/?success=false&session_id={CHECKOUT_SESSION_ID}`,
  });

  //   res.redirect(303, session.url);
  res.json({ url: session.url });
}

// Create a portal session
async function createPortalSession(req, res) {
  console.log(req.body);
  const { session_id } = req.body;
  const checkoutSession = await stripe.checkout.sessions.retrieve(session_id);
  const returnUrl = YOUR_DOMAIN;

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: checkoutSession.customer,
    return_url: returnUrl,
  });

  res.redirect(303, portalSession.url);
}

// Handle webhook
async function handleWebhook(request, response) {
  console.log("working webhook");
  //   console.log("body: ", request.body);
  //   console.log("rawBody: ", request.rawBody);

  let event = request.body;

  const endpointSecret = process.env.VITE_APP_STRIPE_WEBHOOK_SECRET;
  if (endpointSecret) {
    const signature = request.headers["stripe-signature"];
    console.log("signature: ", signature);
    console.log("endpointSecret: ", endpointSecret);
    try {
      event = stripe.webhooks.constructEvent(
        // request.body,
        event,
        signature,
        endpointSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  let subscription;
  let status;
  console.log(event.type);
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      const subscriptionId = session.subscription;

      try {
        // Retrieve the customer object from Stripe API
        const customer = await stripe.customers.retrieve(session.customer);
        const customerEmail = customer.email;
        // console.log(`Customer email: ${customerEmail}`);
        // console.log(`Subscription ID: ${subscriptionId}`);

        if (customerEmail) {
          // Update the user based on the email
          const updatedUser = await prisma.user.update({
            where: { email: customerEmail },
            data: {
              subscription: subscriptionId,
            },
          });
          console.log("User updated:", updatedUser);
          // Set a secure HTTP-only cookie with the user information
          response.cookie("user", JSON.stringify(updatedUser), {
            httpOnly: true,
            secure: true,
          });
        } else {
          console.log(
            `Email not found for customer with ID: ${session.customer}`
          );
        }
      } catch (error) {
        console.log("Error retrieving customer from Stripe:", error);
      }
    //   break;

    case "customer.subscription.updated":
      subscription = event.data.object;
      status = subscription.status;
      console.log(`Subscription status is ${status}.`);
    //   break;

    case "invoice.payment_succeeded":
      const invoice = event.data.object;
      console.log("event.data: ", invoice.id);
      console.log("event.data: ", invoice);
      const customerId = invoice.customer;

      try {
        // Retrieve the customer object from Stripe API
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;

        // Generate the receipt URL
        // const receiptUrl = `https://dashboard.stripe.com/invoices/${invoice.id}`;
        const receiptUrl = invoice.hosted_invoice_url;

        // Fetch user's name from your database. Let's say user's name is stored in a variable 'userName'.
        // You may need to adjust this part based on your actual data model.
        const user = await prisma.user.findUnique({
          where: { email: customerEmail },
        });
        const userName = user.name;
        // Add new purchase to the database
        const newPurchase = await prisma.purchase.create({
          data: {
            price: invoice.total / 100, // convert from cents to dollars
            user: {
              connect: {
                id: user.id,
              },
            },
            stripeUserId: customerId,
            status: "paid",
            invoiceUrl: invoice.hosted_invoice_url,
            tokenSaas: event.data.object.subscription,
          },
        });
        const localSubscription = await prisma.subscription.findFirst({
          where: { stripeProductId: event.data.object.subscription },
        });

        // Then, update the user in the local database
        const updatedUser = await prisma.user.update({
          where: { email: customerEmail },
          data: {
            subscription: {
              connect: {
                id: localSubscription.id,
              },
            },
          },
        });

        // Construct the items array from invoice.lines.data
        const items = invoice.lines.data.map((line) => ({
          name: line.description,
          quantity: line.quantity,
          price: line.price.unit_amount / 100, // convert from cents to dollars
        }));

        // Construct the total amount
        const total = invoice.total / 100; // convert from cents to dollars

        // Prepare the data for the email
        const emailData = {
          email: customerEmail,
          name: userName,
          total: total,
          items: items,
          receipt_url: receiptUrl,
        };
        console.log("Email data:", emailData);

        // send the email receipt
        sendReceiptMail({ body: emailData }, response);
      } catch (error) {
        console.log(
          "Error retrieving customer from Stripe or sending email:",
          error
        );
      }

      break;

    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  response.send();
}
const userCookieCheck = async (req, res) => {
  const { userCookie } = req.cookies;

  if (!userCookie) {
    return res.status(401).json({ message: "No user cookie provided" });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userCookie.id, // Assuming the user cookie contains the user id
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
const sendReceiptMail = async (req, res) => {
  const { email, name, total, items, receipt_url } = req.body;
  console.log("Email data got:", req.body);

  // validate parameters
  if (!email || !name || !total || !items || !receipt_url) {
    // return res.status(400).json({ message: "Invalid request parameters" });
  }

  try {
    // Configure SendinBlue
    SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey =
      process.env.SENDINBLUE_API_KEY;

    // Create receipt details
    let receiptDetails = "";
    items.forEach((item) => {
      receiptDetails += `<p>${item.name} - ${item.quantity} x $${item.price}</p>`;
    });

    // Create and send transactional email
    new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: {
        email: process.env.SENDING_EMAIL,
        name: process.env.SENDING_NAME,
      },
      to: [
        {
          email: email,
          name: name,
        },
      ],
      subject: "Your Purchase Receipt",
      htmlContent: `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  .container {
                    background-color: #f5f5f5;
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    border-radius: 20px;
                  }

                  .header {
                    background-color: #7458EA;
                    padding: 20px;
                    border-radius: 20px;
                    color: #D3FE57;
                  }

                  .message {
                    background-color: #ffffff;
                    padding: 20px;
                    margin-top: 20px;
                    border-radius: 20px;
                    color: #000;
                  }
                  .button-r {
                    padding: 20px 12px;
                    background-color: #7458EA;
                    border-radius: 10px;
                    color: #fff;

                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Dear ${name},</h1>
                  </div>
                  <div class="message">
                    <p>Thank you for your purchase. Here is your receipt:</p>
                    ${receiptDetails}
                    <p>Total: $${total}</p>
                    <br />
                    <br />
                    <a class="button-r" href="${receipt_url}">View your receipt on Stripe</a>
                    <br />
                    <br />
                    <br />
                    ${receipt_url}
                  </div>
                </div>
              </body>
            </html>`,
      params: {
        greeting: "Hello",
        headline: "Purchase Receipt",
      },
    });
    //   .then(
    //     function (data) {
    //       console.log("Email sent successfully:", data);
    //       return res.status(200).json({
    //         message: "Receipt email sent successfully.",
    //       });
    //     },
    //     function (error) {
    //       console.error("Error sending email:", error);
    //       return res.status(500).json({
    //         message: `Error sending receipt email: ${error.message}`,
    //       });
    //     }
    //   );
  } catch (error) {
    console.error("An error occurred while sending receipt email:", error);
    return res.status(500).json({
      message: `Server error: ${error.message}`,
    });
  }
};

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  userCookieCheck,
};
