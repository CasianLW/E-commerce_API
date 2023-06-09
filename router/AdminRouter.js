const express = require("express");
const {
  createUser,
  deleteUser,
  editUser,
  getUsersList,
  getUser,
  getAdmin,
} = require("../controller/admin/adminUsers-controller");
const {
  createEvent,
  deleteEvent,
  editEvent,
  getEventsList,
  getEvent,
} = require("../controller/admin/adminEvents-controller");
const {
  createGame,
  deleteGame,
  editGame,
  getGame,
  listAllGames,
  createSubscription,
  deleteSubscription,
  editSubscription,
  getSubscription,
  listAllSubscriptions,
  createCollection,
  deleteCollection,
  editCollection,
  getCollection,
  listAllCollections,
  createPurchase,
  deletePurchase,
  editPurchase,
  getPurchase,
  getAllPurchases,
} = require("../controller/admin/adminShop-controller");
const verifyAdmin = require("../middleware/verifyAdmin");
const verifyConnected = require("../middleware/verifyConnected");

exports.router = (() => {
  const adminRouter = express.Router();
  adminRouter.use(verifyConnected);
  adminRouter.use(verifyAdmin);

  adminRouter.route("/").get(getAdmin);

  //   Users routes
  adminRouter.route("/users").get(getUsersList);
  adminRouter.route("/users").post(createUser);
  adminRouter.route("/users/:id").get(getUser);
  adminRouter.route("/users/:id").put(editUser);
  adminRouter.route("/users/:id").delete(deleteUser);

  //   Events routes
  adminRouter.route("/events").get(getEventsList);
  adminRouter.route("/events").post(createEvent);
  adminRouter.route("/events/:id").get(getEvent);
  adminRouter.route("/events/:id").put(editEvent);
  adminRouter.route("/events/:id").delete(deleteEvent);

  //   Games/products routes
  adminRouter.route("/games").get(listAllGames);
  adminRouter.route("/games").post(createGame);
  adminRouter.route("/games/:id").get(getGame);
  adminRouter.route("/games/:id").put(editGame);
  adminRouter.route("/games/:id").delete(deleteGame);

  //   Subscriptions routes
  adminRouter.route("/subscriptions").get(listAllSubscriptions);
  adminRouter.route("/subscriptions").post(createSubscription);
  adminRouter.route("/subscriptions/:id").get(getSubscription);
  adminRouter.route("/subscriptions/:id").put(editSubscription);
  adminRouter.route("/subscriptions/:id").delete(deleteSubscription);

  //   Collections routes
  adminRouter.route("/collections").get(listAllCollections);
  adminRouter.route("/collections").post(createCollection);
  adminRouter.route("/collections/:id").get(getCollection);
  adminRouter.route("/collections/:id").put(editCollection);
  adminRouter.route("/collections/:id").delete(deleteCollection);
  //   Purchases routes

  adminRouter.route("/purchases").get(getAllPurchases);
  adminRouter.route("/purchases").post(createPurchase);
  adminRouter.route("/purchases/:id").get(getPurchase);
  adminRouter.route("/purchases/:id").put(editPurchase);
  adminRouter.route("/purchases/:id").delete(deletePurchase);

  // adminRouter.route("/register/confirm/:token").get(confirmAccount);
  // authRouter.route("/home");
  // authRouter.route("/admin/users/:token").get(getUsers);
  // authRouter.route("/signin/").post(signin);

  // authRouter
  //   .route("/auth/register?token=")
  //   .post(subscriptionSent, registerConfirm);

  //
  // authRouter.get("/auth/register?token=", function (req, res) {
  //   console.log(req.params["_id"]);
  //   res.send();
  // });

  return adminRouter;
})();
