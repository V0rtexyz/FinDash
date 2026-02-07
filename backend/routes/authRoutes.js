import express from "express";
import crypto from "crypto";

const router = express.Router();

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", async (req, res) => {
  try {
    const { login, passwordHash, password } = req.body;

    if (!login || (!passwordHash && !password)) {
      return res.status(400).json({
        success: false,
        message: "Login and passwordHash are required",
      });
    }

    const authService = req.app.get("authService");
    const result = await authService.authenticate(
      login,
      passwordHash || password,
      password
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Authentication successful",
        userId: result.userId,
        userName: result.userName,
      });
    } else {
      res.status(401).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/auth/register
 * Register new user
 */
router.post("/register", async (req, res) => {
  try {
    const { login, passwordHash, password } = req.body;

    if (!login || (!passwordHash && !password)) {
      return res.status(400).json({
        success: false,
        message: "Login and passwordHash are required",
      });
    }

    const authService = req.app.get("authService");
    // If client sent plain password, compute sha256 to store in DB
    let storeHash = passwordHash;
    if (!storeHash && password) {
      storeHash = crypto.createHash("sha256").update(password).digest("hex");
    }
    const result = await authService.register(login, storeHash);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: result.message,
        userId: result.userId,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
