// middleware/verifyAdmin.js
// middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async (req, res, next) => {
  // Extract the token from the Authorization header
  // const authHeader = req.headers["authorization"];
  // const token = authHeader && authHeader.split(" ")[1];

  // if (!token) return res.status(401).send("Access Denied");

  try {
    const user = req.user.id;
    console.log(user);
    const check = await prisma.user.findUnique({
      where: {
        id: user,
      },
    });
    if (!check) {
      throw new Error("no check");
    }
    console.log(check);
    if (!check.isAdmin) {
      throw new Error("not authorized");
    }
    next();
  } catch (err) {
    res.status(500).send({ mesage: err.mesage });
  }
};
