import express from "express";

const router = express.Router();

// Middleware to extract userId (in production, use JWT token)
const getUserId = (req) => {
  // For now, get from query or body
  // In production, extract from JWT token
  return req.query.userId || req.body.userId || null;
};

/**
 * GET /api/favorites
 * Get user's favorite currencies and stocks
 * Query params: userId, type (optional: 'currency' or 'stock')
 */
router.get("/", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req));
    const type = req.query.type; // 'currency' or 'stock'

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    const favorites = await database.getUserFavorites(userId, type);

    res.json({
      success: true,
      favorites,
      count: favorites.length,
    });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/favorites
 * Add a currency or stock to favorites
 * Body: { userId, type: 'currency' | 'stock', symbol }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, type, symbol } = req.body;

    if (!userId || !type || !symbol) {
      return res.status(400).json({
        success: false,
        message: "userId, type, and symbol are required",
      });
    }

    if (!["currency", "stock"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be 'currency' or 'stock'",
      });
    }

    const database = req.app.get("database");
    const favorite = await database.addFavorite(userId, type, symbol);

    if (favorite) {
      res.status(201).json({
        success: true,
        message: "Favorite added successfully",
        favorite,
      });
    } else {
      res.status(409).json({
        success: false,
        message: "Favorite already exists",
      });
    }
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * DELETE /api/favorites
 * Remove a currency or stock from favorites
 * Query params: userId, type, symbol
 */
router.delete("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);
    const { type, symbol } = req.query;

    if (!userId || !type || !symbol) {
      return res.status(400).json({
        success: false,
        message: "userId, type, and symbol query parameters are required",
      });
    }

    if (!["currency", "stock"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be 'currency' or 'stock'",
      });
    }

    const database = req.app.get("database");
    const removed = await database.removeFavorite(userId, type, symbol);

    if (removed) {
      res.json({
        success: true,
        message: "Favorite removed successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Favorite not found",
      });
    }
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
