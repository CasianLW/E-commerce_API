const express = require("express");
const bodyParser = require("body-parser");

const {
  editUser,
  getUser,
} = require("../controller/admin/adminUsers-controller");
const {
  getEventsList,
  getEvent,
} = require("../controller/admin/adminEvents-controller");
const {
  getGame,
  listAllGames,
  getSubscription,
  listAllSubscriptions,
  getCollection,
  listAllCollections,
} = require("../controller/admin/adminShop-controller");
const cors = require("cors");
const {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  userCookieCheck,
} = require("../controller/StripeController");

const verifyConnected = require("../middleware/verifyConnected");

exports.router = (() => {
  const storeRouter = express.Router();
  storeRouter.use(cors());
  // Define the /webhook route before any other routes
  storeRouter.post(
    "/webhook",
    express.raw({ type: "application/json" }),
    handleWebhook
  );

  // Apply the bodyParser.json() middleware
  storeRouter.use(bodyParser.json());

  //   Events routes
  storeRouter.route("/events").get(getEventsList);
  storeRouter.route("/events/:id").get(getEvent);

  //   Games/products routes
  storeRouter.route("/games").get(listAllGames);
  storeRouter.route("/games/:id").get(getGame);

  //   Subscriptions routes
  storeRouter.route("/subscriptions").get(listAllSubscriptions);
  storeRouter.route("/subscriptions/:id").get(getSubscription);

  //   Collections routes
  storeRouter.route("/collections").get(listAllCollections);
  storeRouter.route("/collections/:id").get(getCollection);

  //   storeRouter.route("/users").use(verifyConnected);
  storeRouter.route("/users").all(verifyConnected);
  storeRouter.route("/users/:id").put(editUser);
  storeRouter.route("/users/:id").get(getUser);

  // Stripe checkout endpoint
  storeRouter.get("/user-info", userCookieCheck);
  storeRouter.post("/create-checkout-session", createCheckoutSession);
  storeRouter.post("/create-portal-session", createPortalSession);

  // storeRouter.post(
  //   "/webhook",
  //   express.raw({ type: "application/json" }),
  //   handleWebhook
  // );

  return storeRouter;
})();
