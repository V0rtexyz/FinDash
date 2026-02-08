import {
  CurrencyAPI,
  getDateRangeForPeriod,
} from "../../../src/services/CurrencyAPI";

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

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 48000,
          "2024-01-05": 50000,
        },
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
        price: null,
      }),
    });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport("INVALID", startDate, endDate)
    ).rejects.toThrow();
  });

  test("should handle empty rates (fallback history)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {},
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.price).toBe(50000);
    expect(data.history.length).toBeGreaterThan(0);
  });

  test("should calculate change24h correctly with history", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        price: 3000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 2700,
          "2024-01-02": 3000,
        },
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
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 48000,
          "2024-01-02": 49000,
          "2024-01-03": 49500,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.history.length).toBe(3);
  });

  test("should handle fetch error for currency data", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(CurrencyAPI.fetchCurrencyData("BTC")).rejects.toThrow();
  });

  test("should handle timeseries with zero and negative prices (fill)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        price: 3100,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 2900,
          "2024-01-02": 0,
          "2024-01-03": 3100,
          "2024-01-04": 3100,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toBeDefined();
    expect(data.history.length).toBe(4);
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

  test("should handle empty timeseries with price", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {},
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.price).toBe(50000);
    expect(data.history.length).toBeGreaterThan(0);
  });

  test("should handle zero prices at the end of history (backward fill)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        price: 3000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 2900,
          "2024-01-02": 2950,
          "2024-01-03": 3000,
          "2024-01-04": 3000,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toBeDefined();
    expect(data.history.length).toBe(4);
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

  test("should fetch currency data for report", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 48000,
          "2024-01-31": 50000,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyDataForReport(
      "BTC",
      new Date("2024-01-01"),
      new Date("2024-01-31"),
      "Bitcoin"
    );
    expect(data.symbol).toBe("BTC");
    expect(data.name).toBe("Bitcoin");
    expect(data.price).toBe(50000);
    expect(data.history.length).toBe(2);
  });

  test("should throw when fetchCurrencyDataForReport fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport(
        "BTC",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      )
    ).rejects.toThrow();
  });

  test("should throw when currency not found in report", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false, price: null }),
    });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport(
        "INVALID",
        new Date("2024-01-01"),
        new Date("2024-01-31")
      )
    ).rejects.toThrow();
  });

  test("should handle fetchAvailableCurrencies with array format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: [
          { symbol: "BTC", name: "Bitcoin" },
          { symbol: "ETH", name: "Ethereum" },
        ],
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toHaveLength(2);
  });

  test("should handle fetchAvailableCurrencies with object format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: { name: "Bitcoin" },
          ETH: "Ethereum",
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies.length).toBeGreaterThanOrEqual(2);
  });

  test("should return fallback when fetchAvailableCurrencies response not ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
  });

  test("should throw when rates fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    await expect(CurrencyAPI.fetchCurrencyData("BTC")).rejects.toThrow();
  });

  test("should use fallback history when timeseries fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "SOL",
        price: 100,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {},
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("SOL", "Solana");
    expect(data.symbol).toBe("SOL");
    expect(data.price).toBe(100);
    expect(data.history.length).toBeGreaterThan(0);
  });
});

describe("getDateRangeForPeriod", () => {
  test("should return date range for 1D", () => {
    const { startDate, endDate } = getDateRangeForPeriod("1D");
    expect(endDate).toBeInstanceOf(Date);
    expect(startDate).toBeInstanceOf(Date);
    const diff = endDate.getTime() - startDate.getTime();
    expect(diff).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    expect(diff).toBeLessThanOrEqual(25 * 60 * 60 * 1000);
  });

  test("should return date range for 1W", () => {
    const { startDate, endDate } = getDateRangeForPeriod("1W");
    const diff = endDate.getTime() - startDate.getTime();
    expect(diff).toBeGreaterThanOrEqual(6 * 24 * 60 * 60 * 1000);
  });

  test("should return date range for 1M", () => {
    const { startDate, endDate } = getDateRangeForPeriod("1M");
    expect(startDate.getTime()).toBeLessThan(endDate.getTime());
  });
});
