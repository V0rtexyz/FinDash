import { StorageService } from "../../../src/services/StorageService";
import { CurrencyData } from "../../../src/services/CurrencyAPI";

// Mock currency data - не используем реальный API
const createMockCurrency = (symbol: string, name: string): CurrencyData => ({
  symbol,
  name,
  price: 50000,
  change24h: 2.5,
  timestamp: Date.now(),
  history: [
    { timestamp: Date.now() - 86400000, price: 48000 },
    { timestamp: Date.now(), price: 50000 },
  ],
});

describe("StorageService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("should return empty array when storage is empty", async () => {
    const storage = await StorageService.getStorage();
    expect(storage).toEqual([]);
  });

  test("should add currency to storage", async () => {
    const currency = createMockCurrency("BTC", "Bitcoin");
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    expect(storage.length).toBe(1);
    expect(storage[0].currency.symbol).toBe("BTC");
  });

  test("should not add duplicate currency", async () => {
    const currency = createMockCurrency("BTC", "Bitcoin");
    await StorageService.addToStorage(currency);
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    expect(storage.length).toBe(1);
  });

  test("should remove currency from storage", async () => {
    const currency = createMockCurrency("BTC", "Bitcoin");
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    await StorageService.removeFromStorage(storage[0].id);
    const updatedStorage = await StorageService.getStorage();
    expect(updatedStorage.length).toBe(0);
  });

  test("should return empty array for favorites when empty", async () => {
    const favorites = await StorageService.getFavorites();
    expect(favorites).toEqual([]);
  });

  test("should add currency to favorites", async () => {
    const currency = createMockCurrency("ETH", "Ethereum");
    await StorageService.addToFavorites(currency);
    const favorites = await StorageService.getFavorites();
    expect(favorites.length).toBe(1);
    expect(favorites[0].currency.symbol).toBe("ETH");
  });

  test("should not add duplicate currency to favorites", async () => {
    const currency = createMockCurrency("ETH", "Ethereum");
    await StorageService.addToFavorites(currency);
    await StorageService.addToFavorites(currency);
    const favorites = await StorageService.getFavorites();
    expect(favorites.length).toBe(1);
  });

  test("should remove currency from favorites", async () => {
    const currency = createMockCurrency("ETH", "Ethereum");
    await StorageService.addToFavorites(currency);
    const favorites = await StorageService.getFavorites();
    await StorageService.removeFromFavorites(favorites[0].id);
    const updatedFavorites = await StorageService.getFavorites();
    expect(updatedFavorites.length).toBe(0);
  });

  test("should clear all storage", async () => {
    const currency1 = createMockCurrency("BTC", "Bitcoin");
    const currency2 = createMockCurrency("ETH", "Ethereum");
    await StorageService.addToStorage(currency1);
    await StorageService.addToStorage(currency2);
    await StorageService.clearStorage();
    const storage = await StorageService.getStorage();
    expect(storage.length).toBe(0);
  });

  test("should clear all favorites", async () => {
    const currency1 = createMockCurrency("BTC", "Bitcoin");
    const currency2 = createMockCurrency("ETH", "Ethereum");
    await StorageService.addToFavorites(currency1);
    await StorageService.addToFavorites(currency2);
    await StorageService.clearFavorites();
    const favorites = await StorageService.getFavorites();
    expect(favorites.length).toBe(0);
  });

  test("should check if currency is favorite", async () => {
    const currency = createMockCurrency("BTC", "Bitcoin");
    await StorageService.addToFavorites(currency);
    const isFav = await StorageService.isFavorite("BTC");
    expect(isFav).toBe(true);
    const isNotFav = await StorageService.isFavorite("ETH");
    expect(isNotFav).toBe(false);
  });

  test("should handle corrupted storage data", async () => {
    localStorage.setItem("currency_history", "invalid json");
    const storage = await StorageService.getStorage();
    expect(storage).toEqual([]);
  });

  test("should handle corrupted favorites data", async () => {
    localStorage.setItem("currency_favorites", "invalid json");
    const favorites = await StorageService.getFavorites();
    expect(favorites).toEqual([]);
  });
});
