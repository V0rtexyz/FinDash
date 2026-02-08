import express from "express";

const router = express.Router();

const getUserId = (req) => {
  return req.query.userId ?? req.body.userId ?? null;
};

/**
 * GET /api/alerts
 * List alerts for user. Query: userId
 */
router.get("/", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req), 10);
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    const alerts = await database.getUserAlerts(userId);

    res.json({
      success: true,
      alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error("Get alerts error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/alerts
 * Create alert. Body: { userId, type?, symbol, condition, targetValue }
 */
router.post("/", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req), 10) || parseInt(req.body.userId, 10);
    const { type, symbol, condition, targetValue } = req.body;

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }
    if (!symbol || !condition || targetValue === undefined || targetValue === null) {
      return res.status(400).json({
        success: false,
        message: "symbol, condition, and targetValue are required",
      });
    }
    if (!["above", "below"].includes(condition)) {
      return res.status(400).json({
        success: false,
        message: "condition must be 'above' or 'below'",
      });
    }

    const numValue = parseFloat(targetValue);
    if (Number.isNaN(numValue) || numValue < 0) {
      return res.status(400).json({
        success: false,
        message: "targetValue must be a positive number",
      });
    }

    const database = req.app.get("database");
    const alert = await database.createAlert(userId, {
      type: type || "currency",
      symbol: String(symbol).toUpperCase(),
      condition,
      targetValue: numValue,
    });

    res.status(201).json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error("Create alert error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete alert. Query: userId
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req), 10);
    const alertId = req.params.id;

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    const deleted = await database.deleteAlert(userId, alertId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.json({
      success: true,
      message: "Alert deleted",
    });
  } catch (error) {
    console.error("Delete alert error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
