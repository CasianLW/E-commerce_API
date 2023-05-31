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
  createCreneau: async (req, res) => {
    try {
      const { available, user, time, date } = req.body;
      // gestion erreurs
      const patternDate =
        /^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/;
      const patternTime = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (date && !req.body.date.match(patternDate)) {
        throw new Error("erreur date invalide");
      }
      if ((!req.body.available || !available) && isNaN(available)) {
        throw new Error("erreur dispo");
      }

      if (time && !req.body.time.match(patternTime)) {
        throw new Error("erreur temps invalide");
      }
      if (!req.body.user || !user) {
        throw new Error("erreur pseudo");
      }
      // if (user.isNaN) {
      //   console.log("dhadazdz");
      //   throw new Error("erreur inex");
      // }
      if (!req.body.time || !time) {
        throw new Error("erreur temps");
      }
      if (!req.body.date || !date) {
        throw new Error("erreur date");
      }

      if (available !== true && available !== false) {
        throw new Error("erreur dispo format");
      }
      res.available = available;
      res.user = user;
      res.time = time;
      res.date = date;
      // res.isAdmin = isAdmin;

      // creation creneau
      const creneau = new Booking({
        available,
        user,
        time,
        date,
      });
      console.log(user + " = nom de l'utillisateur assigné au creneau crée");
      const db = mongoose.connection;
      // console.log(await db.collections);
      if (db.collections.creneaux) {
        // Users existants dans la base de données

        const existingCreneau = await db.collections.creneaux.findOne({
          date: `${date}`,
        });
        if (existingCreneau) {
          return res.status(400).json({
            message: `creneau du ${existingCreneau.date} à ${existingCreneau.time} déja existant`,
          });
        } else {
          // utilisateur et mail disponible
          const creneauSave = await creneau.save();
          return res.status(400).json({
            message: `Creneau enregistré ${creneauSave}`,
          });
        }
      } else {
        return res.status(400).json({
          message: `Collection inexistante`,
        });
      }

      //
      //
      //
      return res.status(200).json({
        message: "Ca fonctionne, creneau crée !",
        available,
        user,
        time,
        date,
      });
    } catch (error) {
      console.log(error.message);
      let status = 500;
      let message =
        "Erreur du serveur, assurez vous d'être connecté en tant qu'admin.";

      if (error.message === "erreur date invalide") {
        status = 400;
        message =
          "Format date invalide, format accepté jour/mois/année ex: 30/12/2022";
      }
      if (error.message === "erreur temps invalide") {
        status = 400;
        message =
          "Format temps invalide, format accepté heure:minutes ex: 19:15";
      }
      if (error.message === "erreur dispo format") {
        status = 400;
        message =
          "Format disponibilité invalide, format accepté : vrai/faux (true / false)";
      }
      if (error.message === "erreur pseudo") {
        status = 400;
        message = "Il manque l'utilisateur !";
      }
      if (error.message === "erreur dispo") {
        status = 400;
        message = "Il manque la disponibilité !";
      }
      if (error.message === "erreur date") {
        status = 400;
        message = "Il manque la date !";
      }
      if (error.message === "erreur temps") {
        status = 400;
        message = "Il manque le temps !";
      }
      return res.status(status).json({
        message: `${message}`,
      });
    }
  },
  showCreneaux: async (req, res) => {
    try {
      // afficher les creneaux
      // var userMap = {};
      const db = mongoose.connection;

      const creneaux2 = [];

      // findOne({
      //   date: `${date}`,
      // });

      const creneaux = await Booking.find().populate("user");
      // const test2 = await db.collections.creneaux.find().populate("user");
      // console.log(test);

      creneaux.forEach(function (myDoc) {
        // await db.collections.creneaux.find().forEach(function (myDoc) {
        // console.log(myDoc.user);
        // const userNickname = await db.collections.users.findOne({
        //   _id: ObjectId(myDoc.user),
        // });
        const creneau = [
          {
            id: myDoc._id,
            date: myDoc.date,
            time: myDoc.time,
            available: myDoc.available,
            userId: myDoc.user?._id,
            userName: myDoc.user?.nickname,
          },
        ];
        creneaux2.push(creneau);
        // console.log(creneaux[3]);
        // console.log(
        //   await db.collections.users.findOne({
        //     _id: ObjectId(myDoc.user),
        //   })
        // );
        //   return creneau[1];
      });
      //   console.log(creneau);
      //   console.log(creneaux);
      // (await db.collections.creneaux.distinct("date")) +
      // ":" +
      // (await db.collections.creneaux.distinct("time"));
      // .distinct("nickname")
      return res.status(200).json({
        message: "Voici la liste des creneaux:",
        creneaux2,
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
  },
};

// const db = mongoose.connection;
// const checkToken = await db.collections.temporary_users.findOne({
//   // _id: `{"$oid":"${getToken}"}`,
//   // nickname: "casian-all-t5250",
//   _id: ObjectId(`${getToken}`),
// });
