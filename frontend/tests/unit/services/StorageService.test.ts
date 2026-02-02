import { StorageService } from '../../../src/services/StorageService';
import { CurrencyAPI } from '../../../src/services/CurrencyAPI';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('should return empty array when storage is empty', async () => {
    const storage = await StorageService.getStorage();
    expect(storage).toEqual([]);
  });

  test('should add currency to storage', async () => {
    const currency = await CurrencyAPI.fetchCurrencyData('BTC');
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    expect(storage.length).toBe(1);
    expect(storage[0].currency.symbol).toBe('BTC');
  });

  test('should not add duplicate currency', async () => {
    const currency = await CurrencyAPI.fetchCurrencyData('BTC');
    await StorageService.addToStorage(currency);
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    expect(storage.length).toBe(1);
  });

  test('should remove currency from storage', async () => {
    const currency = await CurrencyAPI.fetchCurrencyData('BTC');
    await StorageService.addToStorage(currency);
    const storage = await StorageService.getStorage();
    await StorageService.removeFromStorage(storage[0].id);
    const updatedStorage = await StorageService.getStorage();
    expect(updatedStorage.length).toBe(0);
  });

  test('should return empty array for favorites when empty', async () => {
    const favorites = await StorageService.getFavorites();
    expect(favorites).toEqual([]);
  });

  test('should add currency to favorites', async () => {
    const currency = await CurrencyAPI.fetchCurrencyData('ETH');
    await StorageService.addToFavorites(currency);
    const favorites = await StorageService.getFavorites();
    expect(favorites.length).toBe(1);
    expect(favorites[0].currency.symbol).toBe('ETH');
  });
});

