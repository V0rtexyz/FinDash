import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Services
import DatabaseService from "./services/DatabaseService.js";
import AuthService from "./services/AuthService.js";
import CoinLayerService from "./services/CoinLayerService.js";
import AlphaVantageService from "./services/AlphaVantageService.js";
import ReportService from "./services/ReportService.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import currencyRoutes from "./routes/currencyRoutes.js";
import stockRoutes from "./routes/stockRoutes.js";
import favoritesRoutes from "./routes/favoritesRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

// Load environment variables
// Look for .env in backend/ first, then project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, ".env") });
dotenv.config({ path: join(__dirname, "..", ".env") });

const PORT = process.env.PORT || 3500;
const NODE_ENV = process.env.NODE_ENV || "development";

// Initialize services
const database = new DatabaseService();
const authService = new AuthService(database);
const coinLayerService = new CoinLayerService(process.env.COINLAYER_API_KEY);
const alphaVantageService = new AlphaVantageService(
  process.env.ALPHA_VANTAGE_API_KEY
);
const reportService = new ReportService(database);

// Connected WebSocket clients storage: Map<WebSocket, {userId: number, login: string}>
const connectedClients = new Map();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Store services in app for route access
app.set("database", database);
app.set("authService", authService);
app.set("coinLayerService", coinLayerService);
app.set("alphaVantageService", alphaVantageService);
app.set("reportService", reportService);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FinDash Server is running",
    version: "1.0.0",
    environment: NODE_ENV,
    endpoints: {
      health: "/health",
      api: "/api",
      websocket: `ws://localhost:${PORT}`,
    },
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    connectedClients: connectedClients.size,
    services: {
      database: "connected",
      coinLayer: coinLayerService.apiKey ? "configured" : "using mock data",
      alphaVantage: alphaVantageService.apiKey
        ? "configured"
        : "using mock data",
    },
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/currencies", currencyRoutes);
app.use("/api/stocks", stockRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/reports", reportRoutes);

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "FinDash API",
    version: "1.0.0",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
      },
      currencies: {
        list: "GET /api/currencies",
        rates: "GET /api/currencies/rates?symbols=USD,EUR",
        historical: "GET /api/currencies/historical/:date?symbols=USD,EUR",
        timeseries:
          "GET /api/currencies/timeseries/:symbol?startDate=2024-01-01&endDate=2024-01-31",
      },
      stocks: {
        quote: "GET /api/stocks/quote/:symbol",
        timeseries: "GET /api/stocks/timeseries/:symbol?interval=daily",
        search: "GET /api/stocks/search?keywords=apple",
        quotes: "POST /api/stocks/quotes",
      },
      favorites: {
        list: "GET /api/favorites?userId=1&type=currency",
        add: "POST /api/favorites",
        remove: "DELETE /api/favorites?userId=1&type=currency&symbol=USD",
      },
      reports: {
        list: "GET /api/reports?userId=1",
        currencyComparison: "POST /api/reports/currency-comparison",
        portfolio: "POST /api/reports/portfolio",
        download: "GET /api/reports/:reportId/download?userId=1&format=csv",
      },
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
  });
});

// Dev-only debug endpoint to inspect user records (masked hash)
if (process.env.DEBUG_API === "true" || NODE_ENV === "development") {
  app.get("/api/debug/user", async (req, res) => {
    try {
      const login = req.query.login;
      if (!login)
        return res
          .status(400)
          .json({ success: false, message: "Missing login query param" });
      const db = req.app.get("database");
      if (!db)
        return res
          .status(500)
          .json({ success: false, message: "Database unavailable" });
      const user = await db.findUserByLogin(login);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      const masked = (user.passwordHash || "").slice(0, 8) + "...";
      // Do not return raw hash in response (for safety) but include masked preview
      return res.json({
        success: true,
        user: {
          id: user.id,
          login: user.login,
          passwordHashPreview: masked,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error("Debug endpoint error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Internal error" });
    }
  });
}

// Error handling middleware
// Error handling middleware with 4 args to be recognized by Express
app.use((err, req, res) => {
  console.error("Server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: NODE_ENV === "development" ? err.message : undefined,
  });
});

// Create HTTP server with Express
const httpServer = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("New WebSocket client connected");

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "welcome",
      message:
        "Connected to FinDash WebSocket server. Send 'login' event to authenticate.",
    })
  );

  // Handle incoming messages
  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, login, passwordHash, password } = message;

      console.log(`Received WebSocket message type: ${type}`);

      switch (type) {
        case "login": {
          if (!login || (!passwordHash && !password)) {
            ws.send(
              JSON.stringify({
                type: "login:response",
                success: false,
                message: "Login and passwordHash are required",
              })
            );
            break;
          }
          // Calculate provided hash preview for logs
          const providedPreview = passwordHash
            ? `${passwordHash.slice(0, 8)}...`
            : password
            ? `${password.slice(0, 8)}... (plain)`
            : "<none>";
          console.debug(
            `WS login attempt login='${login}' provided=${providedPreview}`
          );

          // Debug: fetch user from DB and log masked hash for easier diagnosis
          try {
            const dbUser = await database.findUserByLogin(login);
            if (dbUser) {
              const dbHashPreview = dbUser.passwordHash
                ? dbUser.passwordHash.slice(0, 8) + "..."
                : "<no-hash>";
              console.debug(
                `WS login: DB user found id=${dbUser.id} login=${dbUser.login} hash=${dbHashPreview}`
              );
            } else {
              console.debug(`WS login: DB user not found for login='${login}'`);
            }
          } catch (err) {
            console.error("WS login: error reading DB user", err);
          }

          const result = await authService.authenticate(
            login,
            passwordHash || password,
            password
          );

          if (result.success) {
            // Store authenticated client
            connectedClients.set(ws, {
              userId: result.userId,
              login: result.userName,
            });

            // Notify user of successful login
            ws.send(
              JSON.stringify({
                type: "login:response",
                success: true,
                message: "Authentication successful",
                userId: result.userId,
                userName: result.userName,
              })
            );

            // Broadcast user joined
            broadcastToAll(
              {
                type: "user:joined",
                message: `User '${result.userName}' joined the server`,
                userName: result.userName,
              },
              ws
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "login:response",
                success: false,
                message: result.message,
              })
            );
          }
          break;
        }

        case "register": {
          if (!login || (!passwordHash && !password)) {
            ws.send(
              JSON.stringify({
                type: "register:response",
                success: false,
                message: "Login and passwordHash are required",
              })
            );
            break;
          }
          // If plain password provided, compute sha256 here (consistent with REST register)
          let storeHash = passwordHash;
          if (!storeHash && password) {
            storeHash = crypto
              .createHash("sha256")
              .update(password)
              .digest("hex");
          }

          const result = await authService.register(login, storeHash);

          ws.send(
            JSON.stringify({
              type: "register:response",
              success: result.success,
              message: result.message,
              userId: result.userId,
            })
          );
          break;
        }

        case "subscribe:rates": {
          // Subscribe to real-time currency rate updates
          const clientData = connectedClients.get(ws);
          if (!clientData) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "You must be logged in to subscribe to rates",
              })
            );
            break;
          }

          // In production, this would set up a subscription to push rate updates
          ws.send(
            JSON.stringify({
              type: "subscribe:rates:response",
              success: true,
              message: "Subscribed to rate updates",
            })
          );
          break;
        }

        case "users": {
          // Get list of connected users
          const users = Array.from(connectedClients.values()).map((u) => ({
            userId: u.userId,
            login: u.login,
          }));

          ws.send(
            JSON.stringify({
              type: "users:list",
              users,
              count: users.length,
            })
          );
          break;
        }

        default: {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Unknown message type: ${type}`,
            })
          );
        }
      }
    } catch (error) {
      console.error("Message handling error:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Error processing message",
        })
      );
    }
  });

  // Handle client disconnect
  ws.on("close", () => {
    const clientData = connectedClients.get(ws);

    if (clientData) {
      console.log(`User '${clientData.login}' disconnected`);
      connectedClients.delete(ws);

      // Broadcast user left
      broadcastToAll({
        type: "user:left",
        message: `User '${clientData.login}' left the server`,
        userName: clientData.login,
      });
    } else {
      console.log("Anonymous client disconnected");
    }
  });

  // Handle errors
  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
    connectedClients.delete(ws);
  });
});

// Helper function to broadcast message to all connected clients
function broadcastToAll(message, excludeWs = null) {
  wss.clients.forEach((client) => {
    // Skip the excluded client (usually the sender for some messages)
    if (excludeWs && client === excludeWs) return;

    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Start server only after we check DB connectivity
async function start() {
  try {
    await database.init();
    console.log("Database connectivity verified or fallback to mock if needed");
  } catch (err) {
    console.error(
      "Database init failed; starting server with fallback/mock data",
      err && err.message ? err.message : err
    );
  }

  httpServer.listen(PORT, () => {
    console.log(`FinDash Server running on http://localhost:${PORT}`);
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`API Documentation: http://localhost:${PORT}/api`);
    if (!coinLayerService.apiKey) {
      console.log(`CoinLayer API key not set - using mock data`);
    }
    if (!alphaVantageService.apiKey) {
      console.log(`Alpha Vantage API key not set - using mock data`);
    }
  });
}

start().catch((err) => console.error("Start failed:", err));

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Global error handlers to avoid silent failures
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err && err.stack ? err.stack : err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
