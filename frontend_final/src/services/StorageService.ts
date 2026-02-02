import { CurrencyData } from './CurrencyAPI';

export interface StorageItem {
  id: string;
  currency: CurrencyData;
  addedAt: Date;
}

export interface FavoriteItem {
  id: string;
  currency: CurrencyData;
  addedAt: Date;
}

class StorageServiceClass {
  private readonly STORAGE_KEY = 'currency_history';
  private readonly FAVORITES_KEY = 'currency_favorites';

  async getStorage(): Promise<StorageItem[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (!data) return [];

      const items = JSON.parse(data);
      return items.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
      }));
    } catch {
      return [];
    }
  }

  async addToStorage(currency: CurrencyData): Promise<void> {
    const history = await this.getStorage();

    const exists = history.find(item => item.currency.symbol === currency.symbol);
    if (exists) {
      return;
    }

    const newItem: StorageItem = {
      id: Date.now().toString(),
      currency,
      addedAt: new Date(),
    };

    history.unshift(newItem);

    const toSave = history.slice(0, 50);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(toSave));
  }

  async removeFromStorage(itemId: string): Promise<void> {
    const history = await this.getStorage();
    const filtered = history.filter(item => item.id !== itemId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async clearStorage(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    try {
      const data = localStorage.getItem(this.FAVORITES_KEY);
      if (!data) return [];

      const items = JSON.parse(data);
      return items.map((item: any) => ({
        ...item,
        addedAt: new Date(item.addedAt),
      }));
    } catch {
      return [];
    }
  }

  async addToFavorites(currency: CurrencyData): Promise<void> {
    const favorites = await this.getFavorites();

    const exists = favorites.find(item => item.currency.symbol === currency.symbol);
    if (exists) {
      return;
    }

    const newItem: FavoriteItem = {
      id: Date.now().toString(),
      currency,
      addedAt: new Date(),
    };

    favorites.unshift(newItem);

    const toSave = favorites.slice(0, 20);
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(toSave));
  }

  async removeFromFavorites(itemId: string): Promise<void> {
    const favorites = await this.getFavorites();
    const filtered = favorites.filter(item => item.id !== itemId);
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(filtered));
  }

  async clearFavorites(): Promise<void> {
    localStorage.removeItem(this.FAVORITES_KEY);
  }

  async isFavorite(symbol: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some(item => item.currency.symbol === symbol);
  }
}

export const StorageService = new StorageServiceClass();


