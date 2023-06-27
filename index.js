const express = require("express");
require("dotenv").config();
const port = process.env.VITE_APP_PORT || 3000;
// const fs = require("fs");
const compression = require("compression");
const cors = require("cors");
const app = express();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bodyParser = require("body-parser");
const https = require("https");
const cookieParser = require("cookie-parser");

const verifyConnected = require("./middleware/verifyConnected");

const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET); // Add this line

// const sslOptions = {
//   key: fs.readFileSync("./server/localhost-key.pem"),
//   cert: fs.readFileSync("./server/localhost.pem"),
// };
// console.log("CLIENT_URL:", process.env.CLIENT_URL);

app.use(cookieParser());
const corsOptions = {
  origin: [
    `${process.env.CLIENT_URL}`,
    `${process.env.ADMIN_URL}`,
    "http://localhost:8100",
    "https://tubular-cajeta-6a6a49.netlify.app",
    "https://649b718f2568a208c970d935--tubular-cajeta-6a6a49.netlify.app",
  ],
  // origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(compression());
// app.use(cors());
app.use(async (req, res, next) => {
  req.prisma = prisma;
  next();
});

const AuthRouter = require("./router/AuthRouter").router;
const AdminRouter = require("./router/AdminRouter").router;
const ProfilRouter = require("./router/ProfilRouter").router;
const StoreRouter = require("./router/StoreRouter").router;

// const StoreRouter = require("./router/StoreRouter").router;
// const ProfileRouter = require("./router/ProfileRouter").router;

// app.use(bodyParser.json());
// app.use('/api', (req, res) => {
//     res.send('Hello to Yuniq store Api !')
// })
app.use("/api/profil", bodyParser.json(), ProfilRouter);
app.use("/api/auth", bodyParser.json(), AuthRouter);
app.use("/api/admin", bodyParser.json(), AdminRouter);
app.use("/api/store", StoreRouter);
// app.use("/api/admin", AdminRouter);

// stripe checkout endpoint
app.post("/create-checkout-session", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Product name",
            // you can modify above line based on your product name
          },
          unit_amount: 2000, // amount in cents, 2000 cents = 20.00 dollars
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${YOUR_DOMAIN}/success.html`,
    cancel_url: `${YOUR_DOMAIN}/cancel.html`,
  });

  res.json({ id: session.id });
});

// app.use("/api/admin", AdminRouter);
// app.use("/api/admin", AdminRouter);

// app.use("/api/admin", AdminRouter);
// app.use("/api/profile", ProfileRouter);
// app.use("/api/store", StoreRouter);
prisma
  .$connect()
  .then(() => console.log("Prisma connected to database !"))
  .catch((err) => console.log(err));

// https.createServer(sslOptions, app).listen(port, () => {
//     console.log(`Server running on port ${port}`)
// }).on('error', (err) => {
//     console.log(err)
// })

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// function startServer() {
//   const server = app.listen(port, () => {
//     console.log(`Server running on port ${port}`);
//   });

//   server.on("error", (err) => {
//     console.log(err);
//     console.log("Restarting server in 3 seconds...");
//     setTimeout(() => {
//       startServer();
//     }, 3000);
//   });
// }

// startServer();

// // restart the server if nodemon crash
// process.on("unhandledRejection", (err) => {
//   console.log(err);
//   console.log("Restarting server in 3 seconds...");
//   setTimeout(() => {
//     startServer();
//   }, 3000);
// });
