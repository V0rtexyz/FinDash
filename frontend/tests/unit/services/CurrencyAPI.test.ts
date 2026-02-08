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
});
