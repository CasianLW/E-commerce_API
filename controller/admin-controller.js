const uuid = require("uuid");
const bcrypt = require("bcrypt");
const User = require("../model/user");
const UserTemp = require("../model/userTemp");
const Booking = require("../model/booking");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { randomFillSync } = require("crypto");
const mongoose = require("mongoose");
var ObjectId = require("mongoose").Types.ObjectId;
const jwt = require("jsonwebtoken");
const { stringify } = require("querystring");
const { nextTick } = require("process");

require("dotenv").config();

const jwtKey = process.env.JWT_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;

module.exports = {
  verifyAdmin: async (req, res, next) => {
    try {
      // console.log(token);
      // if (
      //   req.headers &&
      //   req.headers.authorisation &&
      //   req.headers.authorization.split(" ")[0]
      // ) {
      // ou bien
      // console.log("avant token");
      const token = req.headers?.authorization?.split(" ")[1];
      // console.log(token);
      if (token) {
        // const token = req.headers.authorization.split(" ")[0];
        const decode = jwt.verify(token, `${jwtKey}`);
        // console.log(decode["isAdmin"]);
        if (decode["isAdmin"] === true) {
          return next();
          // return res.status(200).json({
          //   message: "ca fonctionne, admin connecté !",
          // });
        } else {
          throw new Error("erreur droits");
        }
      } else {
        throw new Error("erreur connexion");
      }
      next();
    } catch (error) {
      console.log(error.message);
      let status = 500;
      let message = "Erreur du serveur";
      if (error.message === "erreur connexion") {
        status = 400;
        message = "Probleme de connexion, verifiez votre token JWT du lien !";
      }
      if (error.message === "invalid token") {
        status = 400;
        message = "Problème JWT: invalid token !";
      }
      if (error.message === "erreur droits") {
        status = 400;
        message = "Veuillez vous connecter avec un compte Admin !";
      }
      return res.status(status).json({
        message: `${message}`,
      });
    }
  },

  getUsers: async (req, res) => {
    // const ge = 1;
    // console.log("test next");

    try {
      // afficher les users
      // var userMap = {};
      const db = mongoose.connection;
      const users = await db.collections.users.distinct("nickname");
      console.log(users);
      return res.status(200).json({
        message: "Admin connecté ! Voici la liste des users:",
        users,
      });
    } catch (error) {
      console.log(error.message);
      let status = 500;
      let message = "Erreur du serveur";
      if (error.message === "erreur droits") {
        status = 400;
        message = "Veuillez vous connecter avec un compte Admin !";
      }
      return res.status(status).json({
        message: `${message}`,
      });
    }

    // if (ge === 1) {
    //   return res.status(200).json({
    //     error: "ca fonctionne !",
    //   });
    // } else {
    //   // res.redirect("/home");
    //   return res.status(500).json({
    //     error: "pas admin, pas entré !",
    //   });
    // }
    // try {
    //   const ge = req.params.token;

    //   // return res.status(500).json({ message: "ca a fonctionné! ", getToken });
    //   // console.log(req.params.id);
    //   // const { token } = req.body;
    //   const db = mongoose.connection;
    //   const checkToken = await db.collections.temporary_users.findOne({
    //     // _id: `{"$oid":"${getToken}"}`,
    //     // nickname: "casian-all-t5250",
    //     _id: ObjectId(`${getToken}`),
    //   });
    // } catch (error) {}
  },
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

// const db = mongoose.connection;
// const checkToken = await db.collections.temporary_users.findOne({
//   // _id: `{"$oid":"${getToken}"}`,
//   // nickname: "casian-all-t5250",
//   _id: ObjectId(`${getToken}`),
// });
