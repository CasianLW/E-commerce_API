const express = require("express");
const {
  createEvent,
  deleteEvent,
  editEvent,
  getEventsList,
  getEvent,
} = require("../controller/admin-controller");

exports.router = (() => {
  const adminRouter = express.Router();

  //   Events routes
  adminRouter.route("/events/").get(getEventsList);
  adminRouter.route("/events/").post(createEvent);
  adminRouter.route("/events/:id").get(getEvent);
  adminRouter.route("/events/:id").put(editEvent);
  adminRouter.route("/events/:id").delete(deleteEvent);
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
