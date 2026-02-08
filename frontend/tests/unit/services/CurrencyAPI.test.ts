import { CurrencyAPI } from "../../../src/services/CurrencyAPI";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CurrencyAPI", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  test("should fetch available currencies", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: "Bitcoin",
          ETH: "Ethereum",
          USDT: "Tether",
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
  });

  test("should fetch currency data for valid symbol", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 48000,
          "2024-01-02": 50000,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.price).toBe(50000);
    expect(Array.isArray(data.history)).toBe(true);
  });

  test("should throw error for invalid symbol", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        price: null,
      }),
    });

    await expect(CurrencyAPI.fetchCurrencyData("INVALID")).rejects.toThrow();
  });

  test("should return currency data with correct structure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        price: 3000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: { "2024-01-01": 2900 },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toHaveProperty("symbol");
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("price");
    expect(data).toHaveProperty("change24h");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("history");
  });

  test("should return fallback currencies when API fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(Array.isArray(currencies)).toBe(true);
    // Should return fallback currencies
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
  });

  test("should handle response not ok when fetching currencies", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(Array.isArray(currencies)).toBe(true);
    // Should return fallback currencies
    expect(currencies.length).toBeGreaterThan(0);
  });

  test("should fetch currency data for report", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-07");

    // Mock rates response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { BTC: 50000 },
        timestamp: Date.now(),
      }),
    });

    // Mock timeseries response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        rates: [
          { date: "2024-01-01", rate: 48000 },
          { date: "2024-01-05", rate: 50000 },
        ],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyDataForReport(
      "BTC",
      startDate,
      endDate,
      "Bitcoin"
    );
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.name).toBe("Bitcoin");
    expect(data.price).toBe(50000);
  });

  test("should handle failed rates fetch in report", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-07");

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport("BTC", startDate, endDate)
    ).rejects.toThrow();
  });

  test("should handle currency not found in report", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-07");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        rates: {},
      }),
    });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport("INVALID", startDate, endDate)
    ).rejects.toThrow();
  });

  test("should handle failed timeseries fetch", async () => {
    // Mock rates response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { BTC: 50000 },
        timestamp: Date.now(),
      }),
    });

    // Mock failed timeseries response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    // Should still have current price even if history fails
    expect(data.price).toBe(50000);
  });

  test("should calculate change24h correctly with history", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { ETH: 3000 },
        timestamp: Date.now(),
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        rates: [
          { date: new Date(Date.now() - 86400000).toISOString(), rate: 2700 },
          { date: new Date().toISOString(), rate: 3000 },
        ],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data.change24h).toBeGreaterThan(0);
  });

  test("should handle timeseries with rates as object", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { BTC: 50000 },
        timestamp: Date.now(),
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        rates: {
          "2024-01-01": 48000,
          "2024-01-02": 49000,
          "2024-01-03": null,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.history.length).toBeGreaterThan(0);
    // Should filter out null rates
    expect(data.history.every((p) => p.price > 0)).toBe(true);
  });

  test("should handle timeseries fetch error and use fallback data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { BTC: 50000 },
        timestamp: Date.now(),
      }),
    });

    // Timeseries throws error
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.price).toBe(50000);
    // Should have fallback generated history
    expect(data.history.length).toBeGreaterThan(0);
  });

  test("should handle timeseries with zero and negative prices", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { ETH: 3000 },
        timestamp: Date.now(),
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        rates: [
          { date: "2024-01-01", rate: 2900 },
          { date: "2024-01-02", rate: 0 }, // zero price
          { date: "2024-01-03", rate: -100 }, // negative price
          { date: "2024-01-04", rate: 3100 },
        ],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toBeDefined();
    expect(data.history.length).toBe(4);
    // Zero and negative prices should be filled with nearby positive values
    expect(data.history.every((p) => p.price > 0)).toBe(true);
  });

  test("should handle currencies as array of strings", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: ["BTC", "ETH", "USDT"],
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
  });

  test("should handle currencies as array of objects", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: [
          { symbol: "BTC", name: "Bitcoin" },
          { code: "ETH", name_full: "Ethereum" },
          { symbol: "USDT", name: "Tether" },
        ],
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
    expect(currencies.some((c) => c.symbol === "ETH")).toBe(true);
  });

  test("should handle currencies as object with string values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: "Bitcoin",
          ETH: "Ethereum",
          USDT: "Tether",
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(currencies.length).toBe(3);
    expect(
      currencies.some((c) => c.symbol === "BTC" && c.name === "Bitcoin")
    ).toBe(true);
  });

  test("should handle currencies as object with object values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: { name: "Bitcoin", name_full: "Bitcoin Full" },
          ETH: { name_full: "Ethereum", symbol: "ETH" },
          USDT: { other: "data" }, // no name
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
    expect(currencies.some((c) => c.symbol === "ETH")).toBe(true);
  });

  test("should handle empty timeseries success=false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { BTC: 50000 },
        timestamp: Date.now(),
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        symbol: "BTC",
        rates: [],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    // Should still work without history
    expect(data.price).toBe(50000);
  });

  test("should handle zero prices at the end of history (backward fill)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        rates: { ETH: 3000 },
        timestamp: Date.now(),
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        rates: [
          { date: "2024-01-01", rate: 0 }, // zero at start
          { date: "2024-01-02", rate: 2900 },
          { date: "2024-01-03", rate: 3000 },
          { date: "2024-01-04", rate: 0 }, // zero at end
        ],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toBeDefined();
    expect(data.history.length).toBe(4);
    // All prices should be filled (no zeros)
    expect(data.history.every((p) => p.price > 0)).toBe(true);
  });

  test("should handle currencies object with null values", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: { name: "Bitcoin" },
          ETH: null, // null value
          USDT: { name: "Tether" },
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(currencies.length).toBeGreaterThan(0);
  });

  test("should handle currencies with empty name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: [
          { symbol: "BTC", name: "Bitcoin" },
          { symbol: "", name: "" }, // empty
          { symbol: "ETH", name: "Ethereum" },
        ],
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    // Should filter out empty ones
    expect(currencies.every((c) => c.symbol && c.name)).toBe(true);
  });
});
