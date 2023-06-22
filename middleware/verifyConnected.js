// middleware/verifyConnected.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Extract the token from the Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  try {
    if (!token) return res.status(401).send("Access Denied");
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (!verified) {
      throw new Error("no decoded");
    }
    req.user = verified.user;
    next();
  } catch (err) {
    console.log(err);
    res.status(400).send({ mesage: err.mesage });
  }
};
