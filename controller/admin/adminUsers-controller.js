const jwt = require("jsonwebtoken");

require("dotenv").config();
const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET);

const jwtKey = process.env.ACCESS_TOKEN_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;

const { PrismaClient } = require("@prisma/client");
const { register } = require("../auth-controller");

const prisma = new PrismaClient();

module.exports = {
  //
  // User CRUD
  //
  createUser: async (req, res) => {
    // we are using register since it works the same way and so we can modify it in only one place
    register(req, res);
  },

  editUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { email, name, password, avatar, phone, city, location, zip } =
        req.body;

      if (!id) throw new Error("User ID is required");

      // First, fetch the user from the database to get the stripeCustomerId
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
      });

      if (!user) throw new Error("User not found");

      // Ensure stripeCustomerId exists before trying to update the customer on Stripe
      if (user.stripeCustomerId) {
        // First, update the Stripe customer
        await stripe.customers.update(user.stripeCustomerId, {
          email: email,
          name: name,
          address: {
            line1: location,
            city: city,
            postal_code: zip,
          },
        });
      } else {
        throw new Error(
          "stripeCustomerId is required to update Stripe customer"
        );
      }

      // Then, update the user in the local database
      const updatedUser = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          email,
          name,
          password,
          avatar,
          phone,
          city,
          location,
          zip,
        },
      });

      return res.status(200).json({
        message: `User ${updatedUser.id} updated successfully`,
        user: updatedUser,
      });
    } catch (error) {
      console.error("An error occurred during user update: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) throw new Error("User ID is required");

      // Fetch the user before deletion to get the Stripe customer ID
      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
      });

      // Delete the Stripe customer
      await stripe.customers.del(user.stripeCustomerId);

      // Then, delete the user from the local database
      const deletedUser = await prisma.user.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({
        message: `User ${deletedUser.id} deleted successfully`,
        user: deletedUser,
      });
    } catch (error) {
      console.error("An error occurred during user deletion: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  getUsersList: async (req, res) => {
    try {
      const users = await prisma.user.findMany();

      if (users.length === 0) throw new Error("No users found");

      return res.status(200).json({
        message: "Users fetched successfully",
        users: users,
      });
    } catch (error) {
      console.error("An error occurred while fetching users: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  getUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) throw new Error("User ID is required");

      const user = await prisma.user.findUnique({
        where: { id: Number(id) },
      });

      if (!user) throw new Error(`No user found with id: ${id}`);

      return res.status(200).json({
        message: "User fetched successfully",
        user: user,
      });
    } catch (error) {
      console.error("An error occurred while fetching the user: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};
