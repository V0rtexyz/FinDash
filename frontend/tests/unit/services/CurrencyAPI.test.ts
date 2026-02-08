import { CurrencyAPI } from "../../../src/services/CurrencyAPI";

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("CurrencyAPI", () => {
  beforeEach(() => {
    mockFetch.mockClear();
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

  test("should fetch currency data with empty rates (fallback history)", async () => {
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
    expect(data.name).toBe("Solana");
    expect(data.price).toBe(100);
    expect(data.history.length).toBeGreaterThan(0);
  });

  test("should fetch currency data for report", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-01-31");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "BTC",
        price: 50000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: {
          "2024-01-01": 45000,
          "2024-01-15": 47500,
          "2024-01-31": 50000,
        },
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyDataForReport(
      "BTC",
      startDate,
      endDate,
      "Bitcoin"
    );
    expect(data.symbol).toBe("BTC");
    expect(data.name).toBe("Bitcoin");
    expect(data.price).toBe(50000);
    expect(data.history.length).toBe(3);
    expect(data.change24h).not.toBe(0);
  });

  test("should throw when fetchCurrencyDataForReport fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    await expect(
      CurrencyAPI.fetchCurrencyDataForReport(
        "BTC",
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
    expect(currencies[0]).toEqual({ symbol: "BTC", name: "Bitcoin" });
  });

  test("should handle fetchAvailableCurrencies with object value format", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        currencies: {
          BTC: { name: "Bitcoin", name_full: "Bitcoin (BTC)" },
          ETH: "Ethereum",
        },
      }),
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies.length).toBeGreaterThanOrEqual(2);
    const btc = currencies.find((c) => c.symbol === "BTC");
    expect(btc?.name).toBe("Bitcoin");
  });

  test("should return fallback when fetchAvailableCurrencies response not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
  });

  test("should throw when fetchCurrencyData response not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    await expect(CurrencyAPI.fetchCurrencyData("BTC")).rejects.toThrow();
  });

  test("should handle rates as array in response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        symbol: "ETH",
        price: 3000,
        timestamp: Math.floor(Date.now() / 1000),
        rates: [
          { date: "2024-01-01", rate: 2900 },
          { date: "2024-01-02", rate: 3000 },
        ],
      }),
    });

    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data.history.length).toBe(2);
    expect(data.history[0].price).toBe(2900);
  });
});
