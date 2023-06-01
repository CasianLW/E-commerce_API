const jwt = require("jsonwebtoken");

require("dotenv").config();
const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET);

const jwtKey = process.env.ACCESS_TOKEN_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;

const { PrismaClient } = require("@prisma/client");
const { register } = require("./auth-controller");

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

  //
  // Events CRUD
  //
  createEvent: async (req, res) => {
    try {
      const { title, content, image, author } = req.body;
      // Error management
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      if (!author) {
        return res.status(400).json({ error: "Author is required" });
      }

      const newEvent = await prisma.event.create({
        data: {
          title: title,
          content: content,
          image: image, // it's optional
          author: author,
          published: false, // default value
        },
      });

      return res.status(201).json({
        message: `Event ${newEvent.title} created successfully`,
        event: newEvent,
      });
    } catch (error) {
      console.error("An error occurred during event creation: ", error);
      return res.status(500).json({
        message: `Server error: ${error}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
  // deleteEvent method
  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      const event = await prisma.event.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({
        message: `Event ${event.id} deleted successfully`,
        event: event,
      });
    } catch (error) {
      console.error("An error occurred during event deletion: ", error);
      return res.status(500).json({
        message: `Server error: ${error}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  // editEvent method
  editEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content, image, author, published } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Event ID is required" });
      }

      const updatedEvent = await prisma.event.update({
        where: { id: Number(id) },
        data: { title, content, image, author, published },
      });

      return res.status(200).json({
        message: `Event ${updatedEvent.id} updated successfully`,
        event: updatedEvent,
      });
    } catch (error) {
      console.error("An error occurred during event update: ", error);
      return res.status(500).json({
        message: `Server error: ${error}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
  // getEventsList method
  getEventsList: async (req, res) => {
    try {
      const events = await prisma.event.findMany();

      if (events.length === 0) {
        throw new Error("No events found");
      }

      return res.status(200).json({
        message: "Events fetched successfully",
        events: events,
      });
    } catch (error) {
      console.error("An error occurred while fetching events: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  // getEvent method
  getEvent: async (req, res) => {
    try {
      const { id } = req.params;
      // const id = req.params.id;

      if (!id) {
        throw new Error("Event ID is required");
      }

      const event = await prisma.event.findUnique({
        where: { id: Number(id) },
      });

      if (!event) {
        throw new Error(`No event found with id: ${id}`);
      }

      return res.status(200).json({
        message: "Event fetched successfully",
        event: event,
      });
    } catch (error) {
      console.error("An error occurred while fetching the event: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};
