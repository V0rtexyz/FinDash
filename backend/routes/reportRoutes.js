import express from "express";
const router = express.Router();

/**
 * GET /api/reports
 * Get user's reports
 * Query params: userId
 */
router.get("/", async (req, res) => {
  try {
    const userId = parseInt(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId query parameter is required",
      });
    }

    const database = req.app.get("database");
    const reports = await database.getUserReports(userId);

    res.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (error) {
    console.error("Get reports error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/reports/currency-comparison
 * Generate currency comparison report
 * Body: { userId, symbols: [], startDate, endDate }
 */
router.post("/currency-comparison", async (req, res) => {
  try {
    const { userId, symbols, startDate, endDate } = req.body;

    if (!userId || !symbols || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "userId, symbols, startDate, and endDate are required",
      });
    }

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: "symbols must be a non-empty array",
      });
    }

    const reportService = req.app.get("reportService");
    const result = await reportService.generateCurrencyComparisonReport(
      userId,
      symbols,
      startDate,
      endDate
    );

    if (result.success) {
      res.status(201).json({
        success: true,
        message: "Report generated successfully",
        report: result.report,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to generate report",
      });
    }
  } catch (error) {
    console.error("Generate currency comparison report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /api/reports/portfolio
 * Generate portfolio report
 * Body: { userId }
 */
router.post("/portfolio", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const reportService = req.app.get("reportService");
    const result = await reportService.generatePortfolioReport(userId);

    if (result.success) {
      res.status(201).json({
        success: true,
        message: "Report generated successfully",
        report: result.report,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to generate report",
      });
    }
  } catch (error) {
    console.error("Generate portfolio report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * GET /api/reports/:reportId/download
 * Download report in specified format
 * Query params: format (csv, json)
 */
router.get("/:reportId/download", async (req, res) => {
  try {
    const { reportId } = req.params;
    const format = req.query.format || "json";

    if (!["csv", "json"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "format must be 'csv' or 'json'",
      });
    }

    const database = req.app.get("database");
    const userId = parseInt(req.query.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId query parameter is required",
      });
    }

    const reports = await database.getUserReports(userId);
    const report = reports.find((r) => r.id === parseInt(reportId));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const reportService = req.app.get("reportService");
    let content;
    let contentType;
    let filename;

    if (format === "csv") {
      content = reportService.formatReportAsCSV(report);
      contentType = "text/csv";
      filename = `report-${reportId}.csv`;
    } else {
      content = reportService.formatReportAsJSON(report);
      contentType = "application/json";
      filename = `report-${reportId}.json`;
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  } catch (error) {
    console.error("Download report error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export { router as default };
