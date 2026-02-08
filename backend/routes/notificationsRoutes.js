import express from "express";

const router = express.Router();

const getUserId = (req) => {
  return req.query.userId ?? req.body.userId ?? null;
};

/**
 * GET /api/notifications
 * List notifications for user. Query: userId, unreadOnly? (true/false)
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

    const unreadOnly = req.query.unreadOnly === "true";

    const database = req.app.get("database");
    const notifications = await database.getUserNotifications(userId, unreadOnly);

    res.json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read. Query: userId
 */
router.patch("/:id/read", async (req, res) => {
  try {
    const userId = parseInt(getUserId(req), 10);
    const notificationId = req.params.id;

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const database = req.app.get("database");
    const updated = await database.markNotificationRead(userId, notificationId);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
