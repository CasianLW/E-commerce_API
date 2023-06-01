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
