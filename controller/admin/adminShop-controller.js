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
  listAllGames: async (req, res) => {
    try {
      const games = await prisma.game.findMany();

      if (games.length === 0) throw new Error("No games found");

      return res.status(200).json({
        message: "Games fetched successfully",
        games: games,
      });
    } catch (error) {
      console.error("An error occurred while fetching games: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  editGame: async (req, res) => {
    try {
      const { id } = req.params;
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

      if (!id) throw new Error("Game ID is required");

      const game = await prisma.game.findUnique({
        where: { id: Number(id) },
      });

      if (!game) throw new Error("Game not found");

      await stripe.products.update(game.stripeProductId, {
        name: name,
        description: description,
        images: [image_url, image_url2, image_url3],
      });

      // Make the old price inactive
      await stripe.prices.update(game.stripePriceId, { active: false });

      const newPriceObj = await stripe.prices.create({
        unit_amount: price * 100,
        currency: "eur",
        product: game.stripeProductId,
      });

      const updatedGame = await prisma.game.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          author,
          size,
          compatibility,
          price,
          stock,
          status: status,
          stripePriceId: newPriceObj.id,
        },
      });

      return res.status(200).json({
        message: `Game ${updatedGame.id} updated successfully`,
        game: updatedGame,
      });
    } catch (error) {
      console.error("An error occurred during game update: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  deleteGame: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) throw new Error("Game ID is required");

      const game = await prisma.game.findUnique({
        where: { id: Number(id) },
      });

      if (!game) throw new Error("Game not found");

      await stripe.products.del(game.stripeProductId);

      const deletedGame = await prisma.game.delete({
        where: { id: Number(id) },
      });

      return res.status(200).json({
        message: `Game ${deletedGame.id} deleted successfully`,
        game: deletedGame,
      });
    } catch (error) {
      console.error("An error occurred during game deletion: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  getGame: async (req, res) => {
    try {
      const { id } = req.params;

      if (!id) throw new Error("Game ID is required");

      const game = await prisma.game.findUnique({
        where: { id: Number(id) },
      });

      if (!game) throw new Error(`No game found with id: ${id}`);

      return res.status(200).json({
        message: "Game fetched successfully",
        game: game,
      });
    } catch (error) {
      console.error("An error occurred while fetching game: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },
};
