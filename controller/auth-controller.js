// const uuid = require("uuid");
const bcrypt = require("bcrypt");
// const User = require("../model/user");
// const UserTemp = require("../model/userTemp");
// const SibApiV3Sdk = require("sib-api-v3-sdk");
// const { randomFillSync } = require("crypto");
// const mongoose = require("mongoose");
// var ObjectId = require("mongoose").Types.ObjectId;
const jwt = require("jsonwebtoken");
// const { stringify } = require("querystring");
const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET);

require("dotenv").config();

const jwtKey = process.env.ACCESS_TOKEN_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;
const salt = bcrypt.genSaltSync(10);

// import { PrismaClient } from "@prisma/client";
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // ... you will write your Prisma Client queries here
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

module.exports = {
  registerValidation: async (req, res, next) => {
    const { email, name, password, phone, isAdmin, city, location, zip } =
      req.body;
    const patternMail =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    // const patternPhone = /^33\d{9}$/;
    const patternPhone = /^[0-9]+$/;

    const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;

    try {
      if (email && !req.body.email.match(patternMail)) {
        throw new Error("Format du mail invalide!");
      }
      if (phone && !req.body.phone.match(patternPhone)) {
        throw new Error("Format du telephone invalide!");
      }
      if (password && !req.body.password.match(patternPass)) {
        throw new Error(
          "Format du mot de passe invalide! Au moins un chiffre [0-9] - Au moins un caractère minuscule [a-z] - Au moins un caractère majuscule [A-Z] - Au moins 8 caracteres - Sans caractere special"
        );
      }
      if (!req.body.location || !location) {
        throw new Error("Il manque l'adresse' !");
      }
      if (!req.body.zip || !zip) {
        throw new Error("Il manque le code postal !");
      }
      if (!req.body.city || !city) {
        throw new Error("Il manque la ville !");
      }
      if (!req.body.email || !email) {
        throw new Error("Il manque l'email !");
      }
      if (!req.body.name || !name) {
        throw new Error("Il manque pseudo !");
      }
      if (!req.body.password || !password) {
        throw new Error("Il manque le password !");
      }
      if (!req.body.phone || !phone) {
        throw new Error("Il manque le numero de téléphone !");
      }
      res.password = password;
      res.email = email;
      res.name = name;
      res.password = bcrypt.hashSync(password, 5, salt);
      res.phone = phone;
      res.isAdmin = isAdmin;
      res.zip = zip;
      res.city = city;
      res.location = location;
      next();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
    // next();
  },

  register: async (req, res) => {
    const { name, password, email, phone, isAdmin, zip, city, location } =
      req.body;
    console.log("validation worked");
    console.log("validation worked");
    console.log("validation worked");
    console.log("validation worked");

    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          // OR: [{ name: name }, { email: email }],
          OR: [{ email: email }],
        },
      });

      if (existingUser) {
        // if (existingUser.name === name) {
        //   return res.status(400).json({
        //     message: `Username ${name} is already taken`,
        //   });
        // }
        if (existingUser.email === email) {
          return res.status(400).json({
            message: `Email ${email} is already used`,
          });
        }
      } else {
        const token = jwt.sign(
          {
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60 * 60,
            isAdmin,
            name,
          },
          jwtKey
        );

        const customer = await stripe.customers.create({
          email: email, // user's email
          name: name, // user's name
          address: {
            line1: location, // Replace with user's street address
            city: city,
            postal_code: zip,
            // state: 'CA', // Replace with user's state
            // country: 'US' // Replace with user's country
          },
          // add other customer information
        });
        const stripeCustomerId = customer.id;

        const newUser = await prisma.user.create({
          data: {
            name: name,
            email: email,
            password: bcrypt.hashSync(password, 5, salt), // Make sure to hash the password before saving
            phone: phone,
            // createdAt: new Date(),
            // isAdmin: isAdmin || false,
            city: city,
            location: location,
            zip: zip,
            stripeCustomerId: stripeCustomerId,
            token: token,
          },
        });

        return res.status(201).json({
          message: `Utilisateur ${newUser.name} enregisté avec succès !`,
        });
      }
    } catch (error) {
      console.error("An error occurred during registration: ", error);
      return res.status(500).json({
        message: `Server error: ${error}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  // login: async (req, res) => {
  //   try {
  //     const { name, password } = req.body;
  //     // console.log(req.body);

  //     if (!name) throw new Error("name manquant");
  //     else if (!password) throw new Error("mdp manquant");
  //     else {
  //       const db = mongoose.connection;
  //       const checkUser = await db.collections.users.findOne({
  //         name: `${name}`,
  //       });
  //       const checkTempUser = await db.collections.temporary_users.findOne({
  //         name: `${name}`,
  //       });
  //       if (checkUser) {
  //         if (await bcrypt.compare(password, checkUser["password"])) {
  //           //i
  //           // const JWTstatus = jwt.verify(token, jwtKey);
  //           // const isAdmin = checkUser["isAdmin"];
  //           const { name, isAdmin } = checkUser;
  //           const token = jwt.sign(
  //             {
  //               iat: Math.floor(Date.now() / 1000),
  //               exp: Math.floor(Date.now() / 1000) + 60 * 60,
  //               isAdmin,
  //               name,
  //             },
  //             jwtKey
  //           );
  //           // const iat = JWTstatus["iat"];
  //           // const token = jwt.sign({ name, iat, isAdmin }, jwtKey, {
  //           //   algorithm: "HS256",
  //           //   expiresIn: jwtExpirySeconds + "s",
  //           // });
  //           // verification pour recuperer le iat exp et user
  //           // cookie non necessaire pour l'instant
  //           // res.cookie("token", token, { maxAge: jwtExpirySeconds * 1000 });
  //           // res.end();
  //           return res.status(201).json({
  //             message: `Hello ${
  //               checkUser["name"]
  //             }, connection reussie ! Votre compte est ${
  //               checkUser["isAdmin"] ? "ADMINISTRATEUR" : "NORMAL"
  //             } `,
  //             token,
  //             // name: `${JWTstatus["name"]}`,
  //             // JWT_iat: `${JWTstatus["iat"]}`,
  //             // JWT_exp: `${JWTstatus["exp"]}`,
  //           });
  //         } else {
  //           throw new Error("mdp incorrect");
  //         }
  //       }
  //       if (checkTempUser) {
  //         return res.status(500).json({
  //           error:
  //             "Votre compte n'est pas encore confirmé, regardez vos mails !",
  //         });
  //       } else {
  //         return res.status(500).json({
  //           error: "Utilisateur incorrect !",
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     console.error(
  //       "Une erreur a survenue lors de la tentative de connection:",
  //       error
  //     );
  //     let status = 500;
  //     let message = "Erreur du serveur";
  //     if (error.message === "name manquant") {
  //       status = 400;
  //       message = "Veuillez entrer un name";
  //     }
  //     if (error.message === "mdp manquant") {
  //       status = 400;
  //       message = "Veuillez entrer un mot de passe !";
  //     }
  //     if (error.message === "mdp ou name incorrect") {
  //       status = 400;
  //       message = "Mot de passe incorrect !";
  //     }

  //     return res.status(status).json({
  //       message: `${message}`,
  //     });
  //   }
  // },

  // getUsers: async (req, res) => {
  //   // const ge = 1;
  //   const ge = req.params.token;

  //   if (ge === 1) {
  //     return res.status(200).json({
  //       error: "ca fonctionne !",
  //     });
  //   } else {
  //     // res.redirect("/home");
  //     return res.status(500).json({
  //       error: "pas admin, pas entré !",
  //     });
  //   }
  //   // try {
  //   //   const ge = req.params.token;

  //   //   // return res.status(500).json({ message: "ca a fonctionné! ", getToken });
  //   //   // console.log(req.params.id);
  //   //   // const { token } = req.body;
  //   //   const db = mongoose.connection;
  //   //   const checkToken = await db.collections.temporary_users.findOne({
  //   //     // _id: `{"$oid":"${getToken}"}`,
  //   //     // name: "casian-all-t5250",
  //   //     _id: ObjectId(`${getToken}`),
  //   //   });
  //   // } catch (error) {}
  // },
};
