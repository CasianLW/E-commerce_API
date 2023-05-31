const uuid = require("uuid");
const bcrypt = require("bcrypt");
const User = require("../model/user");
const UserTemp = require("../model/userTemp");
const SibApiV3Sdk = require("sib-api-v3-sdk");
const { randomFillSync } = require("crypto");
const mongoose = require("mongoose");
var ObjectId = require("mongoose").Types.ObjectId;
const jwt = require("jsonwebtoken");
const { stringify } = require("querystring");

require("dotenv").config();

const jwtKey = process.env.JWT_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;

import { PrismaClient } from "@prisma/client";

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
  subscriptionSent(req, res, next) {
    const { email, name, password, phone, isAdmin } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const patternMail =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const patternPhone = /^33\d{9}$/;
    const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;
    const patternProfil = /(?=.*[1-3])/;
    if (email && !req.body.email.match(patternMail)) {
      return res.status(400).json({ message: "Format du mail invalide!" });
    }
    if (phone && !req.body.phone.match(patternPhone)) {
      return res.status(400).json({ message: "Format du telephone invalide!" });
    }
    if (password && !req.body.password.match(patternPass)) {
      return res.status(400).json({
        message:
          "Format du mot de passe invalide! Au moins un chiffre [0-9] - Au moins un caractère minuscule [a-z] - Au moins un caractère majuscule [A-Z] - Au moins 8 caracteres - Sans caractere special",
      });
    }
    // if (avatar_nr && !req.body.avatar_nr.toString().match(patternProfil)) {
    //   return res
    //     .status(400)
    //     .json({ message: "Il faut choisir un profil entre 1 et 3 !" });
    // }
    if (!req.body.email || !email)
      return res.status(400).json({ message: "Il manque l'email !" });
    if (!req.body.name || !name)
      return res.status(400).json({ message: "Il manque pseudo !" });
    if (!req.body.password || !password)
      return res.status(400).json({ message: "Il manque le password !" });
    if (!req.body.phone || !phone)
      return res
        .status(400)
        .json({ message: "Il manque le numero de téléphone !" });
    // if (!req.body.avatar_nr || !avatar_nr)
    //   return (res
    //     .status(400)
    //     .json({ message: "Il manque votre avatar (avatar_nr)" }).res.email =
    //     email);

    res.password = password;
    res.email = email;
    res.name = name;
    res.password = bcrypt.hashSync(password, 5, salt);
    res.phone = phone;
    // res.avatar_nr = avatar_nr;
    res.isAdmin = isAdmin;
    next();
  },
  // subscriptionConfirm(req, res, next) {
  //   const { token } = req.body;

  // },

  register: async (req, res) => {
    const { name, password, email, phone, createdAt, isAdmin } = res;
    try {
      const newUserTemp = new UserTemp({
        name,
        password,
        email,
        phone,
        createdAt,
        isAdmin,
      });
      const db = mongoose.connection;
      if (db.collections.users) {
        if ((await db.collections.users.countDocuments()) === 0) {
          //Pas d'users existants dans la base de donnes
          const savedUser = await newUserTemp.save();
          const firstUser = await db.collections.temporary_users.findOne({
            name: `${savedUser["name"]}`,
          });
          db.collections.users.insertOne(firstUser);
          db.collections.temporary_users.deleteOne(firstUser);
          await db.collections.users.updateOne(
            { name: `${savedUser["name"]}` },
            {
              $set: {
                isAdmin: true,
              },
            }
          );
          return res.status(200).json({
            message: `Utilisateur admin ${firstUser["name"]} crée, pas de confirmation necessaire  !`,
          });
        } else {
          // Users existants dans la base de données

          const existingTempUser = await db.collections.temporary_users.findOne(
            {
              name: `${name}`,
            }
          );

          const existingUser = await db.collections.users.findOne({
            name: `${name}`,
          });
          const existingTempEmail =
            await db.collections.temporary_users.findOne({
              email: `${email}`,
            });

          const existingEmail = await db.collections.users.findOne({
            email: `${email}`,
          });
          // return console.log(existingUser, existingTempUser);
          // return res.status(400).json({
          //   message: `test: ${db} `,
          // });

          if (existingTempUser) {
            // utilisateur temporaire pris
            return res.status(400).json({
              message: `L'utilisateur ${name} deja pris mais pas confirmé, essayez dans 5 minutes pour voir si l'utilisateur est disponible`,
            });
          } else if (existingUser) {
            // utilisateur deja pris
            return res.status(400).json({
              message: `L'utilisateur ${name} deja pris, veuillez réessayer`,
            });
          } else if (existingEmail) {
            // email deja utilisé
            return res.status(400).json({
              message: `L'email ${email} deja utilisé pour un autre compte`,
            });
          } else if (existingTempEmail) {
            // email temporaire utilisé
            return res.status(400).json({
              message: `Un email de confirmation a deja été envoié à ${email}, verifiez votre boite mail ou réesayez dans 5 minutes`,
            });
          } else {
            // utilisateur et mail disponible

            const savedUser = await newUserTemp.save();
            // console.log(
            //   "controllers/auth-controller.js > savedUser",
            //   savedUser
            // );
            //
            // debut mailing
            //
            //
            SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey =
              process.env.API_KEY;
            new SibApiV3Sdk.TransactionalEmailsApi()
              .sendTransacEmail({
                sender: {
                  email: "ciorbacasian@yahoo.com",
                  name: "Casian Ciorba",
                },
                to: [
                  {
                    email: `${req.body.email}`,
                    name: `${req.body.name}`,
                  },
                ],
                subject: "Email de confirmation",
                htmlContent: `<!DOCTYPE html><html><body><h1>Hello ${req.body.name}</h1><p>Veuillez confirmer l'inscription via le lien suivant:</p> <br> <a href="${process.env.CLIENT_URL}/auth/signup/confirm/${savedUser._id}">${process.env.CLIENT_URL}/auth/signup/confirm/${savedUser._id}</a></body></html>`,
                params: {
                  greeting: "This is the default greeting",
                  headline: "This is the default headline",
                },
              })
              .then(
                function (data) {
                  console.log(data);
                },
                function (error) {
                  console.error(error);
                  return res.status(500).json({
                    error:
                      "Erreur lors de l'envoi du formulaire via Sendinblue",
                  });
                }
              );
            //
            //
            // debut save infos db mongo
            return res.status(201).json({
              message: `Un e-mail content un lien e confirmation a été envoyé, veuillez cliquer sur ce lien pour confirmer votre inscription`,
              name: savedUser.name,
              _id: savedUser._id,
            });
          }
        }
      } else {
        return res.status(400).json({
          message: `Collection inexistante`,
        });
      }
    } catch (error) {
      console.error("erreur dans le post/signup: ", error);

      return res.status(500).json({
        message: `erreur du serveur: ${error}`,
      });
    }
  },
  // ?token=6377ac98d4fe86f760c983ba
  confirmAccount: async (req, res) => {
    try {
      const getToken = req.params.token;
      // return res.status(500).json({ message: "ca a fonctionné! ", getToken });
      // console.log(req.params.id);
      // const { token } = req.body;
      const db = mongoose.connection;
      const checkToken = await db.collections.temporary_users.findOne({
        // _id: `{"$oid":"${getToken}"}`,
        // name: "casian-all-t5250",
        _id: ObjectId(`${getToken}`),
      });
      // console.log(checkToken["createdAt"]);
      // return res.status(400).json({
      //   message: `test: ${checkToken["createdAt"]} `,
      // });
      if (checkToken) {
        db.collections.users.insertOne(checkToken);
        db.collections.temporary_users.deleteOne(checkToken);
        return res
          .status(201)
          .json({ error: "Votre compte a bien été confirmé !" });
      } else {
        return res.status(500).json({
          error:
            "Lien de confirmation expiré ou inexistant, réessayez une nouvelle inscription",
        });
      }
    } catch (error) {
      console.error(
        "erreur dans le lien (code de 12 byts / int / 24 hex characters) <br> ",
        error
      );
      return res.status(500).json({
        message: `erreur dans le lien (code de 12 byts / int / 24 hex characters) -> code erreur: ${error}`,
      });
    }
  },
  login: async (req, res) => {
    try {
      const { name, password } = req.body;
      // console.log(req.body);

      if (!name) throw new Error("name manquant");
      else if (!password) throw new Error("mdp manquant");
      else {
        const db = mongoose.connection;
        const checkUser = await db.collections.users.findOne({
          name: `${name}`,
        });
        const checkTempUser = await db.collections.temporary_users.findOne({
          name: `${name}`,
        });
        if (checkUser) {
          if (await bcrypt.compare(password, checkUser["password"])) {
            //i
            // const JWTstatus = jwt.verify(token, jwtKey);
            // const isAdmin = checkUser["isAdmin"];
            const { name, isAdmin } = checkUser;
            const token = jwt.sign(
              {
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 60 * 60,
                isAdmin,
                name,
              },
              jwtKey
            );
            // const iat = JWTstatus["iat"];
            // const token = jwt.sign({ name, iat, isAdmin }, jwtKey, {
            //   algorithm: "HS256",
            //   expiresIn: jwtExpirySeconds + "s",
            // });
            // verification pour recuperer le iat exp et user
            // cookie non necessaire pour l'instant
            // res.cookie("token", token, { maxAge: jwtExpirySeconds * 1000 });
            // res.end();
            return res.status(201).json({
              message: `Hello ${
                checkUser["name"]
              }, connection reussie ! Votre compte est ${
                checkUser["isAdmin"] ? "ADMINISTRATEUR" : "NORMAL"
              } `,
              token,
              // name: `${JWTstatus["name"]}`,
              // JWT_iat: `${JWTstatus["iat"]}`,
              // JWT_exp: `${JWTstatus["exp"]}`,
            });
          } else {
            throw new Error("mdp incorrect");
          }
        }
        if (checkTempUser) {
          return res.status(500).json({
            error:
              "Votre compte n'est pas encore confirmé, regardez vos mails !",
          });
        } else {
          return res.status(500).json({
            error: "Utilisateur incorrect !",
          });
        }
      }
    } catch (error) {
      console.error(
        "Une erreur a survenue lors de la tentative de connection:",
        error
      );
      let status = 500;
      let message = "Erreur du serveur";
      if (error.message === "name manquant") {
        status = 400;
        message = "Veuillez entrer un name";
      }
      if (error.message === "mdp manquant") {
        status = 400;
        message = "Veuillez entrer un mot de passe !";
      }
      if (error.message === "mdp ou name incorrect") {
        status = 400;
        message = "Mot de passe incorrect !";
      }

      return res.status(status).json({
        message: `${message}`,
      });
    }
  },

  getUsers: async (req, res) => {
    // const ge = 1;
    const ge = req.params.token;

    if (ge === 1) {
      return res.status(200).json({
        error: "ca fonctionne !",
      });
    } else {
      // res.redirect("/home");
      return res.status(500).json({
        error: "pas admin, pas entré !",
      });
    }
    // try {
    //   const ge = req.params.token;

    //   // return res.status(500).json({ message: "ca a fonctionné! ", getToken });
    //   // console.log(req.params.id);
    //   // const { token } = req.body;
    //   const db = mongoose.connection;
    //   const checkToken = await db.collections.temporary_users.findOne({
    //     // _id: `{"$oid":"${getToken}"}`,
    //     // name: "casian-all-t5250",
    //     _id: ObjectId(`${getToken}`),
    //   });
    // } catch (error) {}
  },
};
