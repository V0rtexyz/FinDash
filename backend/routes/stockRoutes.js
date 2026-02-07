import express from "express";

const router = express.Router();

/**
 * GET /api/stocks/quote/:symbol
 * Get real-time stock quote
 */
router.get("/quote/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;

    const alphaVantageService = req.app.get("alphaVantageService");
    const result = await alphaVantageService.getQuote(symbol);

    if (result.success) {
      res.json({
        success: true,
        quote: result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to fetch stock quote",
      });
    }
  } catch (error) {
    console.error("Get stock quote error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/stocks/timeseries/:symbol
 * Get time series data for a stock
 * Query params: interval (daily, weekly, monthly, intraday)
 */
router.get("/timeseries/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const interval = req.query.interval || "daily";

    if (!["daily", "weekly", "monthly", "intraday"].includes(interval)) {
      return res.status(400).json({
        success: false,
        message: "Invalid interval. Use: daily, weekly, monthly, or intraday",
      });
    }

    const alphaVantageService = req.app.get("alphaVantageService");
    const result = await alphaVantageService.getTimeSeries(symbol, interval);

    if (result.success) {
      res.json({
        success: true,
        symbol: result.symbol,
        interval: result.interval,
        lastRefreshed: result.lastRefreshed,
        timezone: result.timezone,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to fetch time series",
        data: result.data, // Return mock data if available
      });
    }
  } catch (error) {
    console.error("Get stock time series error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/stocks/search
 * Search for stocks by keyword
 * Query params: keywords
 */
router.get("/search", async (req, res) => {
  try {
    const { keywords } = req.query;

    if (!keywords) {
      return res.status(400).json({
        success: false,
        message: "keywords query parameter is required",
      });
    }

    const alphaVantageService = req.app.get("alphaVantageService");
    const result = await alphaVantageService.searchSymbol(keywords);

    res.json({
      success: result.success,
      matches: result.matches,
      error: result.error,
    });
  } catch (error) {
    console.error("Search stocks error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/stocks/quotes
 * Get multiple stock quotes at once
 * Body: { symbols: ['AAPL', 'MSFT', ...] }
 */
router.post("/quotes", async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: "symbols array is required",
      });
    }

    const alphaVantageService = req.app.get("alphaVantageService");
    const result = await alphaVantageService.getMultipleQuotes(symbols);

    res.json({
      success: result.success,
      quotes: result.quotes,
      errors: result.errors,
    });
  } catch (error) {
    console.error("Get multiple quotes error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
