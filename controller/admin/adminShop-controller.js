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

  //
  // Subscription CRUD
  //
  createSubscription: async (req, res) => {
    try {
      const { name, description, image, interval, intervalCount, price } =
        req.body;

      if (!name || !description || !price || !interval || !intervalCount) {
        throw new Error("All fields are required");
      }

      // Create the product on Stripe
      const product = await stripe.products.create({
        name: name,
        description: description,
        images: [image],
      });

      const priceObj = await stripe.prices.create({
        unit_amount: price * 100,
        currency: "eur",
        product: product.id,
        recurring: { interval: interval, interval_count: intervalCount },
      });

      // Store the product in the local database
      const createdSubscription = await prisma.subscription.create({
        data: {
          name,
          description,
          image,
          interval,
          intervalCount,
          price,
          stripeProductId: product.id,
          stripePriceId: priceObj.id,
        },
      });

      return res.status(200).json({
        message: `Subscription ${createdSubscription.id} created successfully`,
        subscription: createdSubscription,
      });
    } catch (error) {
      console.error("An error occurred during subscription creation: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    } finally {
      await prisma.$disconnect();
    }
  },

  // Fetch all subscriptions
  listAllSubscriptions: async (req, res) => {
    try {
      const subscriptions = await prisma.subscription.findMany();
      return res.status(200).json({ subscriptions });
    } catch (error) {
      console.error("An error occurred while fetching subscriptions: ", error);
      return res
        .status(500)
        .json({ message: `Server error: ${error.message}` });
    } finally {
      await prisma.$disconnect();
    }
  },

  // Fetch a specific subscription
  getSubscription: async (req, res) => {
    const { id } = req.params;
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: Number(id) },
      });

      if (!subscription)
        return res.status(404).json({ message: "Subscription not found" });

      return res.status(200).json({ subscription });
    } catch (error) {
      console.error(
        "An error occurred while fetching the subscription: ",
        error
      );
      return res
        .status(500)
        .json({ message: `Server error: ${error.message}` });
    } finally {
      await prisma.$disconnect();
    }
  },

  // // Make the old price inactive
  // await stripe.prices.update(game.stripePriceId, { active: false });

  // const newPriceObj = await stripe.prices.create({
  //   unit_amount: price * 100,
  //   currency: "eur",
  //   product: game.stripeProductId,
  // });
  // Update a subscription
  editSubscription: async (req, res) => {
    const { id } = req.params;
    const { name, description, image, interval, intervalCount, price } =
      req.body;

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: Number(id) },
      });

      if (!subscription)
        return res.status(404).json({ message: "Subscription not found" });

      // Update the product on Stripe
      const product = await stripe.products.update(
        subscription.stripeProductId,
        {
          name: name,
          description: description,
          images: [image],
        }
      );

      // // delete the old price (not working rn)
      // await stripe.prices.update(product.stripePriceId, { active: false });

      // Create the new price
      const newPriceObj = await stripe.prices.create({
        unit_amount: price * 100,
        currency: "eur",
        product: product.id,
        recurring: { interval: interval, interval_count: intervalCount },
      });

      // Update the subscription in the local database
      const updatedSubscription = await prisma.subscription.update({
        where: { id: Number(id) },
        data: {
          name,
          description,
          image,
          interval,
          intervalCount,
          price,
          stripeProductId: product.id,
          stripePriceId: newPriceObj.id,
        },
      });

      return res.status(200).json({
        message: "Subscription updated successfully",
        subscription: updatedSubscription,
      });
    } catch (error) {
      console.error(
        "An error occurred while updating the subscription: ",
        error
      );
      return res
        .status(500)
        .json({ message: `Server error: ${error.message}` });
    } finally {
      await prisma.$disconnect();
    }
  },

  // Delete a subscription
  deleteSubscription: async (req, res) => {
    const { id } = req.params;

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { id: Number(id) },
      });

      if (!subscription)
        return res.status(404).json({ message: "Subscription not found" });

      // Set product as inactive in Stripe
      await stripe.products.update(subscription.stripeProductId, {
        active: false,
      });

      // Delete from local database
      await prisma.subscription.delete({
        where: { id: Number(id) },
      });

      return res
        .status(200)
        .json({ message: "Subscription deleted successfully" });
    } catch (error) {
      console.error(
        "An error occurred while deleting the subscription: ",
        error
      );
      return res
        .status(500)
        .json({ message: `Server error: ${error.message}` });
    } finally {
      await prisma.$disconnect();
    }
  },

  //
  // Collections CRUD
  //
  listAllCollections: async (req, res) => {
    try {
      const collections = await prisma.collection.findMany();
      res.status(200).json({
        message: "Collections fetched successfully",
        collections: collections,
      });
    } catch (error) {
      console.error("An error occurred while fetching collections: ", error);
      res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    }
  },

  getCollection: async (req, res) => {
    const { id } = req.params;

    try {
      const collection = await prisma.collection.findUnique({
        where: { id: Number(id) },
      });

      if (!collection) {
        return res.status(404).json({
          message: "No collection found with the given id.",
        });
      }

      return res.status(200).json({
        message: "Collection fetched successfully",
        collection: collection,
      });
    } catch (error) {
      console.error("An error occurred while fetching collection: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    }
  },

  createCollection: async (req, res) => {
    const { name, image, description, status } = req.body;

    try {
      const newCollection = await prisma.collection.create({
        data: { name, image, description, status },
      });

      return res.status(201).json({
        message: "Collection created successfully",
        collection: newCollection,
      });
    } catch (error) {
      console.error("An error occurred during collection creation: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    }
  },

  editCollection: async (req, res) => {
    const { id } = req.params;
    const { name, image, description, status } = req.body;

    try {
      const updatedCollection = await prisma.collection.update({
        where: { id: Number(id) },
        data: { name, image, description, status },
      });

      return res.status(200).json({
        message: "Collection updated successfully",
        collection: updatedCollection,
      });
    } catch (error) {
      console.error("An error occurred during collection update: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    }
  },

  deleteCollection: async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.collection.delete({
        where: { id: Number(id) },
      });

      return res.status(204).json({
        message: "Collection deleted successfully",
      });
    } catch (error) {
      console.error("An error occurred during collection deletion: ", error);
      return res.status(500).json({
        message: `Server error: ${error.message}`,
      });
    }
  },
};
