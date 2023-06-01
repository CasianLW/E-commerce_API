// middleware/verifyAdmin.js
// middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Extract the token from the Authorization header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).send("Access Denied");

  try {
    const verified = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (verified.isAdmin) {
      next();
    } else {
      res.status(403).send("Unauthorized");
    }
  } catch (err) {
    res.status(400).send("Invalid Token");
  }
};
