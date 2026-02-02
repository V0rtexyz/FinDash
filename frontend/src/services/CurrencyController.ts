import { CurrencyData } from './CurrencyAPI';
import { StorageService, StorageItem, FavoriteItem } from './StorageService';
import { WebSocketService } from './WebSocketService';

type ChangeListener = () => void;

class CurrencyControllerClass {
  private listeners: Set<ChangeListener> = new Set();

  onChange(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async getTrackedCurrencies(): Promise<CurrencyData[]> {
    const currencies: CurrencyData[] = [];
    return currencies;
  }

  async getStorage(): Promise<StorageItem[]> {
    const items = await StorageService.getStorage();
    return items;
  }

  async addToStorage(currency: CurrencyData): Promise<void> {
    await StorageService.addToStorage(currency);
    this.notifyListeners();
  }

  async removeFromStorage(itemId: string): Promise<void> {
    await StorageService.removeFromStorage(itemId);
    this.notifyListeners();
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    const items = await StorageService.getFavorites();
    return items;
  }

  async addToFavorites(currency: CurrencyData): Promise<void> {
    await StorageService.addToFavorites(currency);
    this.notifyListeners();
  }

  async removeFromFavorites(itemId: string): Promise<void> {
    await StorageService.removeFromFavorites(itemId);
    this.notifyListeners();
  }

  async isFavorite(symbol: string): Promise<boolean> {
    return await StorageService.isFavorite(symbol);
  }

  subscribeToUpdates(symbol: string, callback: (data: CurrencyData) => void): () => void {
    return WebSocketService.subscribe(symbol, callback);
  }
}

export const CurrencyController = new CurrencyControllerClass();


