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
          { date: "2024-01-02", rate: 50000 },
        ],
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
        rates: {},
      }),
    });

    await expect(CurrencyAPI.fetchCurrencyData("INVALID")).rejects.toThrow();
  });

  test("should return currency data with correct structure", async () => {
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
        rates: [{ date: "2024-01-01", rate: 2900 }],
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
    expect(currencies.length).toBeGreaterThan(0);
    expect(currencies.some((c) => c.symbol === "BTC")).toBe(true);
  });

  test("should fetch currency data for report", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rates: { BTC: 50000 },
          timestamp: Date.now(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          symbol: "BTC",
          rates: [
            { date: "2024-01-01", rate: 48000 },
            { date: "2024-01-31", rate: 50000 },
          ],
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
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, rates: {} }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, symbol: "INVALID", rates: [] }),
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
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          rates: { SOL: 100 },
          timestamp: Date.now(),
        }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

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
