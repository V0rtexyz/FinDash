import { CurrencyAPI } from "../../../src/services/CurrencyAPI";

describe("CurrencyAPI", () => {
  test("should fetch available currencies", async () => {
    const currencies = await CurrencyAPI.fetchAvailableCurrencies();
    expect(currencies).toBeDefined();
    expect(Array.isArray(currencies)).toBe(true);
    expect(currencies.length).toBeGreaterThan(0);
  });

  test("should fetch currency data for valid symbol", async () => {
    const data = await CurrencyAPI.fetchCurrencyData("BTC");
    expect(data).toBeDefined();
    expect(data.symbol).toBe("BTC");
    expect(data.name).toBe("Bitcoin");
    expect(data.price).toBeGreaterThan(0);
    expect(Array.isArray(data.history)).toBe(true);
  });

  test("should throw error for invalid symbol", async () => {
    await expect(CurrencyAPI.fetchCurrencyData("INVALID")).rejects.toThrow();
  });

  test("should return currency data with correct structure", async () => {
    const data = await CurrencyAPI.fetchCurrencyData("ETH");
    expect(data).toHaveProperty("symbol");
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("price");
    expect(data).toHaveProperty("change24h");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("history");
  });
});
