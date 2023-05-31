const express = require("express");
const {
  register,
  registerValidation,
  confirmAccount,
  login,
  getUsers,
} = require("../controller/auth-controller");

exports.router = (() => {
  const authRouter = express.Router();

  authRouter.route("/register/").post(registerValidation, register);
  // authRouter.route("/register/confirm/:token").get(confirmAccount);
  authRouter.route("/login/").post(login);
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

  return authRouter;
})();
