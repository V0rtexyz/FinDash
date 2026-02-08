import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import AlphaVantageService from "../../services/AlphaVantageService.js";

// Mock fetch globally
global.fetch = jest.fn();

describe("AlphaVantageService", () => {
  let service;

  beforeEach(() => {
    service = new AlphaVantageService("test-api-key");
    jest.clearAllMocks();
  });

  describe("getQuote", () => {
    it("should fetch quote successfully", async () => {
      const mockResponse = {
        "Global Quote": {
          "01. symbol": "AAPL",
          "02. open": "150.00",
          "03. high": "152.00",
          "04. low": "149.00",
          "05. price": "151.00",
          "06. volume": "1000000",
          "07. latest trading day": "2024-01-01",
          "08. previous close": "150.50",
          "09. change": "0.50",
          "10. change percent": "0.33%",
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getQuote("AAPL");

      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.price).toBe(151.0);
      expect(result.volume).toBe(1000000);
    });

    it("should handle API error messages", async () => {
      const mockResponse = {
        "Error Message": "Invalid API call",
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getQuote("INVALID");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid API call");
    });

    it("should handle API rate limit", async () => {
      const mockResponse = {
        Note: "API call frequency exceeded",
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getQuote("AAPL");

      expect(result.success).toBe(false);
      expect(result.error).toContain("API call frequency exceeded");
    });

    it("should handle empty quote data", async () => {
      const mockResponse = {
        "Global Quote": {},
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getQuote("UNKNOWN");

      expect(result.success).toBe(false);
      expect(result.symbol).toBeDefined();
    });

    it("should return mock data on network error", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result = await service.getQuote("AAPL");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(result.price).toBeDefined();
    });
  });

  describe("getTimeSeries", () => {
    it("should fetch daily time series successfully", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
          "3. Last Refreshed": "2024-01-01",
          "5. Time Zone": "US/Eastern",
        },
        "Time Series (Daily)": {
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "152.00",
            "3. low": "149.00",
            "4. close": "151.00",
            "5. volume": "1000000",
          },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "daily");

      expect(result.success).toBe(true);
      expect(result.symbol).toBe("AAPL");
      expect(result.interval).toBe("daily");
      expect(result.data).toHaveLength(1);
      expect(result.data[0].close).toBe(151.0);
    });

    it("should handle weekly time series", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
        },
        "Weekly Time Series": {
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "152.00",
            "3. low": "149.00",
            "4. close": "151.00",
            "5. volume": "5000000",
          },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "weekly");

      expect(result.success).toBe(true);
      expect(result.interval).toBe("weekly");
    });

    it("should handle monthly time series", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
        },
        "Monthly Time Series": {
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "155.00",
            "3. low": "148.00",
            "4. close": "154.00",
            "5. volume": "20000000",
          },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "monthly");

      expect(result.success).toBe(true);
      expect(result.interval).toBe("monthly");
    });

    it("should handle intraday time series", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
        },
        "Time Series (5min)": {
          "2024-01-01 09:30:00": {
            "1. open": "150.00",
            "2. high": "150.50",
            "3. low": "149.80",
            "4. close": "150.20",
            "5. volume": "10000",
          },
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "intraday");

      expect(result.success).toBe(true);
      expect(result.interval).toBe("intraday");
    });

    it("should handle API errors", async () => {
      const mockResponse = {
        "Error Message": "Invalid symbol",
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("INVALID", "daily");

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();
    });

    it("should handle missing time series data", async () => {
      const mockResponse = {
        "Meta Data": {
          "2. Symbol": "AAPL",
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.getTimeSeries("AAPL", "daily");

      expect(result.success).toBe(false);
    });
  });

  describe("searchSymbol", () => {
    it("should search symbols successfully", async () => {
      const mockResponse = {
        bestMatches: [
          {
            "1. symbol": "AAPL",
            "2. name": "Apple Inc.",
            "3. type": "Equity",
            "4. region": "United States",
            "5. marketOpen": "09:30",
            "6. marketClose": "16:00",
            "7. timezone": "UTC-04",
            "8. currency": "USD",
          },
        ],
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.searchSymbol("Apple");

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].symbol).toBe("AAPL");
      expect(result.matches[0].name).toBe("Apple Inc.");
    });

    it("should handle empty search results", async () => {
      const mockResponse = {
        bestMatches: [],
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.searchSymbol("NOTFOUND");

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(0);
    });

    it("should handle API errors", async () => {
      const mockResponse = {
        "Error Message": "Invalid search",
      };

      global.fetch.mockResolvedValue({
        json: async () => mockResponse,
      });

      const result = await service.searchSymbol("Invalid");

      expect(result.success).toBe(false);
      expect(result.matches).toHaveLength(0);
    });
  });

  describe("getMultipleQuotes", () => {
    it("should fetch multiple quotes successfully", async () => {
      const mockQuote = {
        "Global Quote": {
          "01. symbol": "AAPL",
          "02. open": "150.00",
          "03. high": "152.00",
          "04. low": "149.00",
          "05. price": "151.00",
          "06. volume": "1000000",
          "07. latest trading day": "2024-01-01",
          "08. previous close": "150.50",
          "09. change": "0.50",
          "10. change percent": "0.33%",
        },
      };

      global.fetch.mockResolvedValue({
        json: async () => mockQuote,
      });

      const result = await service.getMultipleQuotes(["AAPL", "MSFT"]);

      expect(result.success).toBe(true);
      expect(Object.keys(result.quotes)).toHaveLength(2);
    });

    it("should handle partial failures", async () => {
      global.fetch
        .mockResolvedValueOnce({
          json: async () => ({
            "Global Quote": {
              "01. symbol": "AAPL",
              "02. open": "150.00",
              "03. high": "152.00",
              "04. low": "149.00",
              "05. price": "151.00",
              "06. volume": "1000000",
              "07. latest trading day": "2024-01-01",
              "08. previous close": "150.50",
              "09. change": "0.50",
              "10. change percent": "0.33%",
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            "Error Message": "Invalid symbol",
          }),
        });

      const result = await service.getMultipleQuotes(["AAPL", "INVALID"]);

      expect(result.quotes.AAPL).toBeDefined();
      expect(result.quotes.AAPL.success).toBe(true);
      expect(Object.keys(result.quotes)).toHaveLength(1);
    });

    it("should handle empty symbol list", async () => {
      const result = await service.getMultipleQuotes([]);

      expect(result.success).toBe(false);
      expect(Object.keys(result.quotes)).toHaveLength(0);
    });
  });

  describe("Helper methods", () => {
    describe("formatTimeSeriesData", () => {
      it("should format time series data correctly", () => {
        const timeSeries = {
          "2024-01-02": {
            "1. open": "151.00",
            "2. high": "153.00",
            "3. low": "150.00",
            "4. close": "152.00",
            "5. volume": "2000000",
          },
          "2024-01-01": {
            "1. open": "150.00",
            "2. high": "152.00",
            "3. low": "149.00",
            "4. close": "151.00",
            "5. volume": "1000000",
          },
        };

        const result = service.formatTimeSeriesData(timeSeries);

        expect(result).toHaveLength(2);
        expect(result[0].date).toBe("2024-01-02");
        expect(result[0].close).toBe(152.0);
        expect(result[1].date).toBe("2024-01-01");
      });
    });

    describe("getMockQuote", () => {
      it("should generate mock quote", () => {
        const mock = service.getMockQuote("AAPL");

        expect(mock.success).toBe(true);
        expect(mock.symbol).toBe("AAPL");
        expect(mock.price).toBeGreaterThan(0);
        expect(mock.volume).toBeGreaterThan(0);
      });
    });

    describe("getMockTimeSeries", () => {
      it("should generate mock daily time series", () => {
        const mock = service.getMockTimeSeries("AAPL", "daily");

        expect(mock.length).toBeGreaterThan(0);
        expect(mock[0].date).toBeDefined();
        expect(mock[0].close).toBeGreaterThan(0);
      });

      it("should generate different lengths for different intervals", () => {
        const daily = service.getMockTimeSeries("AAPL", "daily");
        const monthly = service.getMockTimeSeries("AAPL", "monthly");

        expect(daily.length).not.toBe(monthly.length);
      });
    });
  });
});

