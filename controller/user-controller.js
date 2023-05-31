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
  verifyUser: async (req, res, next) => {
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
        if (decode["isAdmin"] === false) {
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
        message =
          "Veuillez vous connecter avec un compte Normal, pas en tant qu'admin !";
      }
      return res.status(status).json({
        message: `${message}`,
      });
    }
  },
  showCreneauxUser: async (req, res) => {
    try {
      // afficher les creneaux
      // var userMap = {};
      const db = mongoose.connection;

      const creneaux = [];
      await db.collections.creneaux.find().forEach(function (myDoc) {
        const creneau = [
          {
            id: myDoc._id,
            date: myDoc.date,
            time: myDoc.time,
            available: myDoc.available,
          },
        ];
        creneaux.push(creneau);
        // console.log(creneau);
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
        creneaux,
      });
    } catch (error) {
      console.log(error.message);
      let status = 500;
      let message = "Erreur du serveur";
      if (error.message === "erreur droits") {
        status = 400;
        message = "Veuillez vous connecter avec un compte User !";
      }
      return res.status(status).json({
        message: `${message}`,
      });
    }
  },
  async setBooking(req, res) {
    const id = req.params.id;
    // console.log(id);
    const token = req.headers?.authorization?.split(" ")[1];
    let payload;
    if (!token) {
      return res.status(401).json({ message: "connectez vous" });
    }
    try {
      if (token) {
        const decode = jwt.verify(token, `${jwtKey}`);
        if (decode["nickname"]) {
          //   const connectedUser = decode["nickname"];
          //   return next();
          //   return res.status(200).json({
          //     message: "ca fonctionne, admin connecté !",
          //     connectedUser,
          //   });
          payload = decode;
          console.log("Le token est valide !", payload.exp);
          //   console.log("test user:  ", payload.nickname);
          const nowUnixSeconds = Math.round(Number(new Date()) / 1000);
          //verification du mail dans la base de donnée
          const foundSign = await User.findOne({ user: payload.nickname });
          //   console.log("test foundsign:  ", foundSign._id);

          console.log(nowUnixSeconds);
          if (!foundSign) {
            throw new Error("bdd");
          }
          if (foundSign.isAdmin) {
            throw new Error("sessionNotAdmin");
          }
          const get_id = id;
          const update = {
            available: false,
            user: foundSign._id,
          };
          const updateBook = await Booking.findByIdAndUpdate(get_id, update, {
            new: true, // Renvoie le document mis à jour au lieu de l'ancien
          });
          console.log("update :", updateBook);
          res.json({
            message: `Votre réservation à bien été prise en compte, pour le ${updateBook.date}  à ${updateBook.time} au nom de ${payload.nickname}`,
          });
        } else {
          throw new Error("false");
        }
      }

      //   const id = req.params.id;
      //   console.log(id);
      //   const authHeader = req.headers["authorization"];
      // const token = authHeader && authHeader.split(" ")[1];

      //   const tokenCheck = new Function();
      //   const decodeToken = tokenCheck.verifyJWT(
      //     token,
      //     ACCESS_TOKEN,
      //     ADMIN_TOKEN
      //   );
      //   if (!decodeToken) {
      //     console.log(decodeToken);
      //     throw new Error("false");
      //   }
      //   let payload;
      //   payload = decode;
      //   console.log("Le token est valide !", payload.exp);
      //   const nowUnixSeconds = Math.round(Number(new Date()) / 1000);
      //   //verification du mail dans la base de donnée
      //   const foundSign = await User.findOne({ user: payload.user.nickname });
      //   console.log(nowUnixSeconds);
      //   if (!foundSign) {
      //     throw new Error("bdd");
      //   }
      //   if (foundSign.isAdmin) {
      //     throw new Error("sessionNotAdmin");
      //   }
      //   const get_id = id;
      //   const update = {
      //     available: false,
      //     user: foundSign._id,
      //   };
      //   const updateBook = await Booking.findByIdAndUpdate(get_id, update, {
      //     new: true, // Renvoie le document mis à jour au lieu de l'ancien
      //   });
      //   console.log("update :", updateBook);
      //   res.json({
      //     message: `Votre réservation à bien été pris en compte, pour le ${updateBook.date}  à ${updateBook.time} `,
      //   });
    } catch (error) {
      console.error("erreur dans le post/auth/setBooking/: ", error.message);
      code = 500;
      message = "Veuillez réessayer.";
      if (error.message === "false") {
        code = 500;
        message = "token non identifié";
      }
      if (error.message === "bdd") {
        code = 409;
        message = "Erreur de connexion.";
      }
      if (error.message === "sessionNotAdmin") {
        code = 409;
        message = "Veuillez vous diriger vers le liens pour les admins";
      }
      return res.status(code).json({
        message,
      });
    }
  },
  reserverCreneau: async (req, res) => {
    return res.status(200).json({
      message: "Voici la liste des creneaux:",
    });
  },
};
