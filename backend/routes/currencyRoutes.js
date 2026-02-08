import express from "express";

const router = express.Router();

/**
 * GET /api/currencies
 * Get list of available currencies
 */
router.get("/", async (req, res) => {
  try {
    const coinLayerService = req.app.get("coinLayerService");
    const result = await coinLayerService.getCurrenciesList();

    if (result.success) {
      res.json({
        success: true,
        currencies: result.currencies,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to fetch currencies",
      });
    }
  } catch (error) {
    console.error("Get currencies error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/currencies/rates
 * Get live exchange rates
 * Query params: symbols (comma-separated)
 */
router.get("/rates", async (req, res) => {
  try {
    const symbols = req.query.symbols
      ? req.query.symbols.split(",").map((s) => s.trim())
      : [];

    const coinLayerService = req.app.get("coinLayerService");
    const result = await coinLayerService.getLiveRates(symbols);

    res.json({
      success: result.success,
      timestamp: result.timestamp,
      rates: result.rates,
      target: result.target,
      error: result.error,
    });
  } catch (error) {
    console.error("Get rates error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/currencies/historical/:date
 * Get historical exchange rates for a specific date
 * Query params: symbols (comma-separated)
 */
router.get("/historical/:date", async (req, res) => {
  try {
    const { date } = req.params;
    const symbols = req.query.symbols
      ? req.query.symbols.split(",").map((s) => s.trim())
      : [];

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const coinLayerService = req.app.get("coinLayerService");
    const result = await coinLayerService.getHistoricalRates(date, symbols);

    res.json({
      success: result.success,
      date: result.date,
      rates: result.rates,
      target: result.target,
      error: result.error,
    });
  } catch (error) {
    console.error("Get historical rates error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

const MAX_TIMESERIES_DAYS = 365;

/**
 * GET /api/currencies/full/:symbol
 * Get live rate + timeseries in one request (reduces API calls)
 * Query params: startDate, endDate (YYYY-MM-DD format)
 */
router.get("/full/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate query parameters are required",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const coinLayerService = req.app.get("coinLayerService");
    const liveResult = await coinLayerService.getLiveRates([symbol]);
    const liveRate = liveResult.rates?.[symbol] ?? null;
    const tsResult = await coinLayerService.getTimeSeries(symbol, startDate, endDate, {
      preFetchedLiveRate: liveRate,
    });

    const price = liveResult.rates?.[symbol];
    if (price == null) {
      return res.status(404).json({
        success: false,
        message: `Currency ${symbol} not found`,
      });
    }

    res.json({
      success: true,
      symbol,
      price,
      timestamp: liveResult.timestamp,
      startDate: tsResult.startDate,
      endDate: tsResult.endDate,
      rates: tsResult.rates,
    });
  } catch (error) {
    console.error("Get full currency data error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/currencies/timeseries/:symbol
 * Get time series data for a currency
 * Query params: startDate, endDate (YYYY-MM-DD format). Max range 365 days.
 */
router.get("/timeseries/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate query parameters are required",
      });
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "endDate must be after startDate",
      });
    }

    const daysDiff = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    if (daysDiff > MAX_TIMESERIES_DAYS) {
      const newStart = new Date(end);
      newStart.setDate(newStart.getDate() - MAX_TIMESERIES_DAYS);
      startDate = newStart.toISOString().split("T")[0];
    }

    const coinLayerService = req.app.get("coinLayerService");
    const result = await coinLayerService.getTimeSeries(
      symbol,
      startDate,
      endDate
    );

    const ratesObj = result.rates || {};
    const ratesArray = Object.entries(ratesObj)
      .filter(([, rate]) => rate != null)
      .map(([date, rate]) => ({ date, rate }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: result.success,
      symbol: result.symbol,
      startDate: result.startDate,
      endDate: result.endDate,
      rates: ratesArray,
      error: result.error,
    });
  } catch (error) {
    console.error("Get time series error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
