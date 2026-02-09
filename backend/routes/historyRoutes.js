import express from "express";

const router = express.Router();

// Middleware to extract userId
const getUserId = (req) => {
  return req.query.userId || req.body.userId || null;
};

/**
 * GET /api/history
 * Get user's history
 * Query params: userId, type (optional: 'currency' or 'stock'), limit (default: 20)
 */
router.get("/", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req));
    const type = req.query.type;
    const limit = parseInt(req.query.limit) || 20;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    const history = await database.getUserHistory(userId, type, limit);

    res.json({
      success: true,
      history,
      count: history.length,
    });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/history
 * Add item to history
 * Body: { userId, type: 'currency' | 'stock', symbol, name, price, change24h }
 */
router.post("/", async (req, res) => {
  try {
    const { userId, type, symbol, name, price, change24h } = req.body;

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
    const historyItem = await database.addToHistory(
      userId,
      type,
      symbol,
      name,
      price || 0,
      change24h || 0
    );

    res.status(201).json({
      success: true,
      message: "Added to history successfully",
      historyItem,
    });
  } catch (error) {
    console.error("Add to history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * DELETE /api/history/:id
 * Remove item from history
 * Query params: userId
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);
    const historyId = req.params.id;

    if (!userId || !historyId) {
      return res.status(400).json({
        success: false,
        message: "userId and historyId are required",
      });
    }

    const database = req.app.get("database");
    const removed = await database.removeFromHistory(userId, historyId);

    if (removed) {
      res.json({
        success: true,
        message: "Removed from history successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "History item not found",
      });
    }
  } catch (error) {
    console.error("Remove from history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * DELETE /api/history
 * Clear all user history
 * Query params: userId
 */
router.delete("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    await database.clearUserHistory(userId);

    res.json({
      success: true,
      message: "History cleared successfully",
    });
  } catch (error) {
    console.error("Clear history error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;

