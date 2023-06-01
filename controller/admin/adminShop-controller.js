const jwt = require("jsonwebtoken");

require("dotenv").config();
const stripe = require("stripe")(process.env.VITE_APP_STRIPE_API_SECRET);

const jwtKey = process.env.ACCESS_TOKEN_SECRET;
const jwtExpirySeconds = process.env.JWT_EXPIRES_IN;

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = {
  //
  // Game CRUD
  //
  createGame: async (req, res) => {
    try {
      const {
        name,
        description,
        author,
        size,
        compatibility,
        price,
        stock,
        status,
        image_url,
        image_url2,
        image_url3,
      } = req.body;
      if (!name || !description || !price || !stock) {
        throw new Error("All fields are required");
      }
      // First, create the product on Stripe
      const product = await stripe.products.create({
        name: name,
        description: description,
        images: [image_url, image_url2, image_url3], // Update this with your image URLs
      });

      const priceObj = await stripe.prices.create({
        unit_amount: price * 100, // price is in cents
        currency: "eur",
        product: product.id,
      });

      // Then, store the product in the local database
      const createdGame = await prisma.game.create({
        data: {
          name,
          description,
          author,
          size,
          compatibility,
          price,
          stock,
          status: status,
          stripeProductId: product.id,
          stripePriceId: priceObj.id,
        },
      });

      return res.status(200).json({
        message: `Game ${createdGame.id} created successfully`,
        game: createdGame,
      });
    } catch (error) {
      console.error("An error occurred during game creation: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};
