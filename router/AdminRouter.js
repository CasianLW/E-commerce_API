const express = require("express");
const {
  createUser,
  deleteUser,
  editUser,
  getUsersList,
  getUser,
  createEvent,
  deleteEvent,
  editEvent,
  getEventsList,
  getEvent,
} = require("../controller/admin-controller");

exports.router = (() => {
  const adminRouter = express.Router();

  //   Users routes
  adminRouter.route("/users/").get(getUsersList);
  adminRouter.route("/users/").post(createUser);
  adminRouter.route("/users/:id").get(getUser);
  adminRouter.route("/users/:id").put(editUser);
  adminRouter.route("/users/:id").delete(deleteUser);

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
