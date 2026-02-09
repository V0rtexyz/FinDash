import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import CoinLayerService from "../../services/CoinLayerService.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("CoinLayerService", () => {
  let service;

  beforeEach(() => {
    service = new CoinLayerService("test-api-key");
    jest.clearAllMocks();
  });

  describe("getLiveRates", () => {
    it("should fetch live rates successfully", async () => {
      const mockResponse = {
        success: true,
        timestamp: 1234567890,
        target: "USD",
        rates: {
          BTC: 50000,
          ETH: 3000,
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getLiveRates(["BTC", "ETH"]);

      expect(result.success).toBe(true);
      expect(result.rates).toEqual(mockResponse.rates);
      expect(result.target).toBe("USD");
    });

    it("should handle API failure and return mock data", async () => {
      const mockResponse = {
        success: false,
        error: { info: "API error" },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getLiveRates(["BTC"]);

      expect(result.success).toBe(false);
      expect(result.rates).toBeDefined();
      expect(result.rates.BTC).toBeDefined();
    });

    it("should handle network errors", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await service.getLiveRates(["USD"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.rates).toBeDefined();
    });

    it("should fetch all currencies when no symbols specified", async () => {
      const mockResponse = {
        success: true,
        timestamp: 1234567890,
        target: "USD",
        rates: { BTC: 50000 },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      await service.getLiveRates([]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("access_key=test-api-key")
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.not.stringContaining("symbols=")
      );
    });
  });

  describe("getHistoricalRates", () => {
    it("should fetch historical rates successfully", async () => {
      const mockResponse = {
        success: true,
        date: "2024-01-01",
        target: "USD",
        rates: {
          BTC: 45000,
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getHistoricalRates("2024-01-01", ["BTC"]);

      expect(result.success).toBe(true);
      expect(result.date).toBe("2024-01-01");
      expect(result.rates.BTC).toBe(45000);
    });

    it("should handle API failure", async () => {
      const mockResponse = {
        success: false,
        error: { info: "Invalid date" },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getHistoricalRates("invalid-date", ["BTC"]);

      expect(result.success).toBe(false);
      expect(result.rates).toBeDefined();
    });
  });

  describe("getTimeFrameRates", () => {
    it("should fetch timeframe rates successfully", async () => {
      const mockResponse = {
        success: true,
        rates: {
          "2024-01-01": { BTC: 45000 },
          "2024-01-02": { BTC: 46000 },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeFrameRates(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result["2024-01-01"]).toBe(45000);
      expect(result["2024-01-02"]).toBe(46000);
    });

    it("should return empty object on failure", async () => {
      const mockResponse = {
        success: false,
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeFrameRates(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result).toEqual({});
    });

    it("should filter out invalid rates", async () => {
      const mockResponse = {
        success: true,
        rates: {
          "2024-01-01": { BTC: 45000 },
          "2024-01-02": { BTC: -100 },
          "2024-01-03": { BTC: "invalid" },
          "2024-01-04": { BTC: null },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeFrameRates(
        "BTC",
        "2024-01-01",
        "2024-01-04"
      );

      expect(result["2024-01-01"]).toBe(45000);
      expect(result["2024-01-02"]).toBeUndefined();
      expect(result["2024-01-03"]).toBeUndefined();
      expect(result["2024-01-04"]).toBeUndefined();
    });

    it("should handle network errors", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await service.getTimeFrameRates(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result).toEqual({});
    });
  });

  describe("getTimeSeries", () => {
    it("should use timeframe API when available", async () => {
      const mockTimeframeResponse = {
        success: true,
        rates: {
          "2024-01-01": { BTC: 45000 },
          "2024-01-02": { BTC: 46000 },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockTimeframeResponse,
      });

      const result = await service.getTimeSeries(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result.success).toBe(true);
      expect(result.rates["2024-01-01"]).toBe(45000);
    });

    it("should fallback to historical API", async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: false }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            rates: { BTC: 50000 },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            date: "2024-01-01",
            rates: { BTC: 45000 },
          }),
        });

      const result = await service.getTimeSeries(
        "BTC",
        "2024-01-01",
        "2024-01-01"
      );

      expect(result.success).toBe(true);
      expect(result.rates["2024-01-01"]).toBe(45000);
    });

    it("should fill gaps with last known rate", async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({ success: false }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            rates: { BTC: 50000 },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            rates: { BTC: 45000 },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
          }),
        });

      const result = await service.getTimeSeries(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result.rates["2024-01-01"]).toBeDefined();
      expect(result.rates["2024-01-02"]).toBeDefined();
    });

    it("should handle complete API failure with mock fallback", async () => {
      global.fetch.mockRejectedValue(new Error("Complete failure"));

      const result = await service.getTimeSeries(
        "BTC",
        "2024-01-01",
        "2024-01-02"
      );

      expect(result.success).toBe(true);
      expect(result.rates).toBeDefined();
      expect(Object.keys(result.rates).length).toBeGreaterThan(0);
    });
  });

  describe("getCurrenciesList", () => {
    it("should fetch currencies list successfully", async () => {
      const mockResponse = {
        success: true,
        crypto: {
          BTC: "Bitcoin from API",
          ETH: "Ethereum from API",
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getCurrenciesList();

      expect(result.success).toBe(true);
      // Should merge API data with mock data
      expect(result.currencies.BTC).toBe("Bitcoin from API");
      expect(result.currencies.ETH).toBe("Ethereum from API");
      // Should include other mock currencies
      expect(result.currencies.USD).toBe("US Dollar");
      expect(result.currencies.EUR).toBe("Euro");
      // Should have all 25 mock currencies
      expect(Object.keys(result.currencies).length).toBeGreaterThanOrEqual(25);
    });

    it("should fallback to mock currencies on failure", async () => {
      const mockResponse = {
        success: false,
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getCurrenciesList();

      expect(result.success).toBe(false);
      expect(result.currencies).toBeDefined();
      expect(result.currencies.BTC).toBe("Bitcoin");
    });
  });

  describe("Helper methods", () => {
    describe("getDateRange", () => {
      it("should generate date range correctly", () => {
        const dates = service.getDateRange("2024-01-01", "2024-01-03");

        expect(dates).toEqual(["2024-01-01", "2024-01-02", "2024-01-03"]);
      });

      it("should handle single day range", () => {
        const dates = service.getDateRange("2024-01-01", "2024-01-01");

        expect(dates).toEqual(["2024-01-01"]);
      });

      it("should handle month boundaries", () => {
        const dates = service.getDateRange("2024-01-30", "2024-02-02");

        expect(dates).toContain("2024-01-30");
        expect(dates).toContain("2024-01-31");
        expect(dates).toContain("2024-02-01");
        expect(dates).toContain("2024-02-02");
      });
    });

    describe("getMockRates", () => {
      it("should return all mock rates when no symbols specified", () => {
        const rates = service.getMockRates([]);

        expect(rates.BTC).toBeDefined();
        expect(rates.ETH).toBeDefined();
        expect(rates.USD).toBe(1.0);
      });

      it("should filter mock rates by symbols", () => {
        const rates = service.getMockRates(["BTC", "ETH"]);

        expect(rates.BTC).toBeDefined();
        expect(rates.ETH).toBeDefined();
        expect(rates.USD).toBeUndefined();
      });

      it("should return empty object for unknown symbols", () => {
        const rates = service.getMockRates(["UNKNOWN"]);

        expect(Object.keys(rates)).toHaveLength(0);
      });
    });

    describe("getMockCurrenciesList", () => {
      it("should return mock currencies list", () => {
        const currencies = service.getMockCurrenciesList();

        expect(currencies.BTC).toBe("Bitcoin");
        expect(currencies.USD).toBe("US Dollar");
      });
    });
  });
});

