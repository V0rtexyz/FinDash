import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import ReportService from "../../services/ReportService.js";

describe("ReportService", () => {
  let service;
  let mockDatabase;

  beforeEach(() => {
    mockDatabase = {
      createReport: jest.fn(),
      getUserFavorites: jest.fn(),
      getUserReports: jest.fn(),
    };
    service = new ReportService(mockDatabase);
  });

  describe("generateCurrencyComparisonReport", () => {
    it("should generate currency comparison report successfully", async () => {
      const mockReport = {
        id: 1,
        type: "currency_comparison",
        userId: 1,
        generatedAt: "2024-01-01",
      };

      mockDatabase.createReport.mockResolvedValue(mockReport);

      const result = await service.generateCurrencyComparisonReport(
        1,
        ["BTC", "ETH"],
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.success).toBe(true);
      expect(result.report).toEqual(mockReport);
      expect(mockDatabase.createReport).toHaveBeenCalled();
    });

    it("should include correct report structure", async () => {
      mockDatabase.createReport.mockImplementation((userId, reportData) => {
        return Promise.resolve({
          ...reportData,
          id: 1,
        });
      });

      const result = await service.generateCurrencyComparisonReport(
        1,
        ["BTC", "ETH", "USD"],
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.success).toBe(true);
      expect(result.report.type).toBe("currency_comparison");
      expect(result.report.symbols).toEqual(["BTC", "ETH", "USD"]);
      expect(result.report.data.summary.symbolsCount).toBe(3);
    });

    it("should handle database errors", async () => {
      mockDatabase.createReport.mockRejectedValue(
        new Error("Database error")
      );

      const result = await service.generateCurrencyComparisonReport(
        1,
        ["BTC"],
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });

    it("should include date range in report", async () => {
      mockDatabase.createReport.mockImplementation((userId, reportData) => {
        return Promise.resolve(reportData);
      });

      const result = await service.generateCurrencyComparisonReport(
        1,
        ["BTC"],
        "2024-01-01",
        "2024-01-31"
      );

      expect(result.report.startDate).toBe("2024-01-01");
      expect(result.report.endDate).toBe("2024-01-31");
      expect(result.report.data.summary.dateRange).toBe(
        "2024-01-01 to 2024-01-31"
      );
    });
  });

  describe("generatePortfolioReport", () => {
    it("should generate portfolio report successfully", async () => {
      const mockFavorites = [
        { id: 1, userId: 1, type: "currency", symbol: "BTC" },
        { id: 2, userId: 1, type: "currency", symbol: "ETH" },
        { id: 3, userId: 1, type: "stock", symbol: "AAPL" },
      ];

      mockDatabase.getUserFavorites.mockResolvedValue(mockFavorites);
      mockDatabase.createReport.mockResolvedValue({
        id: 1,
        type: "portfolio",
        userId: 1,
      });

      const result = await service.generatePortfolioReport(1);

      expect(result.success).toBe(true);
      expect(result.report.type).toBe("portfolio");
      expect(mockDatabase.getUserFavorites).toHaveBeenCalledWith(1);
    });

    it("should categorize favorites by type", async () => {
      const mockFavorites = [
        { id: 1, userId: 1, type: "currency", symbol: "BTC" },
        { id: 2, userId: 1, type: "stock", symbol: "AAPL" },
      ];

      mockDatabase.getUserFavorites.mockResolvedValue(mockFavorites);
      mockDatabase.createReport.mockImplementation((userId, reportData) => {
        return Promise.resolve(reportData);
      });

      const result = await service.generatePortfolioReport(1);

      expect(result.report.data.favorites.currencies).toHaveLength(1);
      expect(result.report.data.favorites.stocks).toHaveLength(1);
      expect(result.report.data.summary.currenciesCount).toBe(1);
      expect(result.report.data.summary.stocksCount).toBe(1);
      expect(result.report.data.summary.totalItems).toBe(2);
    });

    it("should handle empty favorites", async () => {
      mockDatabase.getUserFavorites.mockResolvedValue([]);
      mockDatabase.createReport.mockImplementation((userId, reportData) => {
        return Promise.resolve(reportData);
      });

      const result = await service.generatePortfolioReport(1);

      expect(result.success).toBe(true);
      expect(result.report.data.summary.totalItems).toBe(0);
    });

    it("should handle database errors", async () => {
      mockDatabase.getUserFavorites.mockRejectedValue(
        new Error("Database error")
      );

      const result = await service.generatePortfolioReport(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database error");
    });
  });

  describe("formatReportAsCSV", () => {
    it("should format currency comparison report as CSV", () => {
      const report = {
        type: "currency_comparison",
        data: {
          rates: {},
          changes: {},
        },
      };

      const csv = service.formatReportAsCSV(report);

      expect(csv).toContain("Date,Currency,Rate,Change");
    });

    it("should format portfolio report as CSV", () => {
      const report = {
        type: "portfolio",
        data: {
          favorites: {
            currencies: [
              { symbol: "BTC", createdAt: "2024-01-01" },
              { symbol: "ETH", createdAt: "2024-01-02" },
            ],
            stocks: [{ symbol: "AAPL", createdAt: "2024-01-03" }],
          },
        },
      };

      const csv = service.formatReportAsCSV(report);

      expect(csv).toContain("Type,Symbol,Added Date");
      expect(csv).toContain("Currency,BTC,2024-01-01");
      expect(csv).toContain("Currency,ETH,2024-01-02");
      expect(csv).toContain("Stock,AAPL,2024-01-03");
    });

    it("should return empty string for unknown report type", () => {
      const report = {
        type: "unknown",
        data: {},
      };

      const csv = service.formatReportAsCSV(report);

      expect(csv).toBe("");
    });

    it("should handle empty portfolio", () => {
      const report = {
        type: "portfolio",
        data: {
          favorites: {
            currencies: [],
            stocks: [],
          },
        },
      };

      const csv = service.formatReportAsCSV(report);

      expect(csv).toBe("Type,Symbol,Added Date\n");
    });
  });

  describe("formatReportAsJSON", () => {
    it("should format report as JSON", () => {
      const report = {
        type: "portfolio",
        userId: 1,
        data: {
          summary: { totalItems: 2 },
        },
      };

      const json = service.formatReportAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual(report);
      expect(parsed.type).toBe("portfolio");
      expect(parsed.userId).toBe(1);
    });

    it("should format with pretty print (indentation)", () => {
      const report = {
        type: "test",
        data: {},
      };

      const json = service.formatReportAsJSON(report);

      expect(json).toContain("\n");
      expect(json).toContain("  ");
    });

    it("should handle complex nested data", () => {
      const report = {
        type: "currency_comparison",
        data: {
          rates: {
            "2024-01-01": { BTC: 50000, ETH: 3000 },
            "2024-01-02": { BTC: 51000, ETH: 3100 },
          },
          changes: {
            BTC: 0.02,
            ETH: 0.033,
          },
        },
      };

      const json = service.formatReportAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.data.rates["2024-01-01"].BTC).toBe(50000);
      expect(parsed.data.changes.BTC).toBe(0.02);
    });

    it("should handle null values", () => {
      const report = {
        type: "test",
        data: null,
      };

      const json = service.formatReportAsJSON(report);
      const parsed = JSON.parse(json);

      expect(parsed.data).toBeNull();
    });
  });
});

