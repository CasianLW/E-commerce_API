const express = require("express");
const {
  createUser,
  deleteUser,
  editUser,
  getUsersList,
  getUser,
} = require("../controller/admin-controller");

exports.router = (() => {
  const profilRouter = express.Router();

  //   Users routes
  profilRouter.route("/users/:id").get(getUser);
  profilRouter.route("/users/:id").put(editUser);
  return profilRouter;
})();
