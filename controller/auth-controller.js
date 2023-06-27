// const uuid = require("uuid");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { add, isPast } = require("date-fns");
// const User = require("../model/user");
// const UserTemp = require("../model/userTemp");
const SibApiV3Sdk = require("sib-api-v3-sdk");
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
    const { email, name, password, phone, city, location, zip } = req.body;
    const patternMail =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    // const patternPhone = /^33\d{9}$/;
    const patternPhone = /^(\+33|0|0033)[1-9](\d{2}){4}$/;

    const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;

    try {
      if (email && !req.body.email.match(patternMail)) {
        throw new Error("Format du mail invalide!");
      }

      if (phone && !req.body.phone.toString().match(patternPhone)) {
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
      // res.isAdmin = isAdmin;
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
    const { name, password, email, phone, zip, city, location } = req.body;
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
        // const token = jwt.sign(
        //   {
        //     iat: Math.floor(Date.now() / 1000),
        //     exp: Math.floor(Date.now() / 1000) + 60 * 60,
        //     isAdmin: false,
        //     name: name,
        //   },
        //   jwtKey
        // );

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
            token: "",
          },
        });

        const payload = {
          user: {
            id: newUser.id,
          },
        };

        const token = jwt.sign(payload, jwtKey, { expiresIn: "1h" });

        addUserToken = await prisma.user.update({
          data: {
            token: token,
          },
          where: {
            id: newUser.id,
          },
        });
        // Now let's send a confirmation email
        SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey =
          process.env.SENDINBLUE_API_KEY;
        new SibApiV3Sdk.TransactionalEmailsApi()
          .sendTransacEmail({
            sender: {
              email: process.env.SENDING_EMAIL,
              name: process.env.SENDING_NAME,
            },
            to: [
              {
                email: email,
                name: name,
              },
            ],
            subject: "Registration Confirmation",
            htmlContent: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    .container {
                      background-color: #000;
                      color: #fff;
                      font-family: Arial, sans-serif;
                      padding: 20px;
                      border-radius: 20px;
                    }
                  
                    .header {
                      background-color: #7458EA;
                      padding: 20px;
                      border-radius: 20px;
                    }
                  
                    .message {
                      background-color: #D3FE57;
                      padding: 20px;
                      margin-top: 20px;
                      border-radius: 20px;
                      color:white;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Hello ${req.body.name}</h1>
                    </div>
                    <div class="message">
                      <p>Votre compte a bien été crée.</p>
                      <p>Connectez-vous pour modifier les informations              liées à votre compte.</p>
                    </div>
                  </div>
                </body>
              </html>`,
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
            }
          );

        return res.status(201).json({
          message: `Utilisateur ${newUser.name} enregisté avec succès !`,
          token: token,
          user: newUser,
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

  login: async (req, res) => {
    console.log(req.body);

    try {
      const { email, password } = req.body;

      if (!email) throw new Error("Email missing");
      if (!password) throw new Error("Password missing");

      const existingUser = await prisma.user.findFirst({
        where: { email: email },
      });

      if (existingUser) {
        const isPasswordValid = bcrypt.compareSync(
          password,
          existingUser.password
        );
        if (!isPasswordValid) throw new Error("Incorrect password");

        const payload = {
          user: {
            id: existingUser.id,
          },
        };

        const token = jwt.sign(payload, jwtKey, { expiresIn: "1h" });

        console.log(token);
        return res.status(200).json({
          token,
          user: existingUser,
        });
      } else {
        throw new Error("Invalid user");
      }
    } catch (error) {
      console.error("An error occurred during login: ", error);
      let status = 500;
      let message = "Server error";
      if (error.message === "Email missing") {
        status = 400;
        message = "Please enter an email";
      }
      if (error.message === "Password missing") {
        status = 400;
        message = "Please enter a password!";
      }
      if (
        error.message === "Incorrect password" ||
        error.message === "Invalid user"
      ) {
        status = 400;
        message = "Incorrect password or email!";
      }

      return res.status(status).json({
        message: `${message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) throw new Error("Email is required");

      const user = await prisma.user.findUnique({ where: { email: email } });
      if (!user) throw new Error("User not found");

      const resetPasswordToken = crypto.randomBytes(20).toString("hex");
      const resetPasswordExpires = add(new Date(), { minutes: 10 });

      const updatedUser = await prisma.user.update({
        where: { email: email },
        data: {
          resetPasswordToken: resetPasswordToken,
          resetPasswordExpires: resetPasswordExpires,
        },
      });

      SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey =
        process.env.SENDINBLUE_API_KEY;
      new SibApiV3Sdk.TransactionalEmailsApi()
        .sendTransacEmail({
          sender: {
            email: process.env.SENDING_EMAIL,
            name: process.env.SENDING_NAME,
          },
          to: [
            {
              email: email,
              name: user.name,
            },
          ],
          subject: "Password Reset Request",
          htmlContent: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                  <style>
                  .container {
                      background-color: #000;
                      color: #fff;
                      font-family: Arial, sans-serif;
                      padding: 20px;
                      border-radius: 20px;
                  }
                  .header {
                      background-color: #7458EA;
                      padding: 20px;
                      border-radius: 20px;
                  }
                  .message {
                      background-color: #D3FE57;
                      padding: 20px;
                      margin-top: 20px;
                      border-radius: 20px;
                      color: #000;
                  }
                  </style>
                  </head>
                  <body>
                  <div class="container">
                      <div class="header">
                      <h1>Hello ${user.name}</h1>
                      </div>
                      <div class="message">
                      <p>You recently requested to reset your password. Click the link below to reset it. (Expires in 10 minutes)</p>
                      <a href="${process.env.PATH_TO_RESET_PASSWORD}/?${resetPasswordToken}">Reset your password</a>
                      </div>
                  </div>
                  </body>
                  </html>`,
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
          }
        );

      return res.status(200).json({
        message: `Password reset link sent to ${email}`,
      });
    } catch (error) {
      console.error("An error occurred during forgot password: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  resetPassword: async (req, res) => {
    try {
      const { resetToken } = req.params;
      const { password } = req.body;

      if (!resetToken || !password)
        throw new Error("Reset token and new password are required");

      const patternPass = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,}$/;

      if (password && !req.body.password.match(patternPass)) {
        throw new Error(
          "Format du mot de passe invalide! Au moins un chiffre [0-9] - Au moins un caractère minuscule [a-z] - Au moins un caractère majuscule [A-Z] - Au moins 8 caracteres - Sans caractere special"
        );
      }

      const user = await prisma.user.findUnique({
        where: { resetPasswordToken: resetToken },
      });
      if (!user) throw new Error("Invalid reset token");

      if (isPast(user.resetPasswordExpires)) {
        throw new Error("Reset token has expired");
      }

      const hashedPassword = bcrypt.hashSync(password, salt);

      const updatedUser = await prisma.user.update({
        where: { resetPasswordToken: resetToken },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      return res.status(200).json({
        message: `Password has been changed`,
      });
    } catch (error) {
      console.error("An error occurred during password reset: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};
