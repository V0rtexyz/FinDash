import { CurrencyData } from "./CurrencyAPI";

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
  private readonly STORAGE_KEY_PREFIX = "currency_history_";
  private readonly FAVORITES_KEY_PREFIX = "currency_favorites_";
  private readonly API_BASE_URL = "http://localhost:3500/api";
  private useBackendAPI = true; // Try backend first
  
  private getUserId(): number | null {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      console.warn("StorageService: No user found in localStorage");
      return null;
    }
    try {
      const user = JSON.parse(userStr);
      const userId = user?.id ? parseInt(String(user.id), 10) : null;
      console.log("StorageService: getUserId() returning:", userId, "from user:", user);
      return userId;
    } catch (error) {
      console.error("StorageService: Error parsing user:", error);
      return null;
    }
  }

  private getStorageKey(): string {
    const userId = this.getUserId();
    return `${this.STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  }

  private getFavoritesKey(): string {
    const userId = this.getUserId();
    return `${this.FAVORITES_KEY_PREFIX}${userId || 'guest'}`;
  }

  async getStorage(): Promise<StorageItem[]> {
    const userId = this.getUserId();
    
    console.log("StorageService: getStorage called, userId:", userId);
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/history?userId=${userId}`);
        console.log("StorageService: History API response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("StorageService: History API data:", data);
          
          if (data.success && data.history) {
            console.log("StorageService: Returning", data.history.length, "history items");
            return data.history.map((item: any) => ({
              id: item.id.toString(),
              currency: {
                symbol: item.symbol,
                name: item.name,
                price: parseFloat(item.price),
                change24h: parseFloat(item.change24h),
              },
              addedAt: new Date(item.viewedAt),
            }));
          }
        }
      } catch (error) {
        console.error("Backend API failed:", error);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(this.getStorageKey());
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
    const userId = this.getUserId();
    
    console.log("StorageService: addToStorage called", { userId, symbol: currency.symbol });
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const body = {
          userId,
          type: "currency",
          symbol: currency.symbol,
          name: currency.name,
          price: currency.price,
          change24h: currency.change24h,
        };
        console.log("StorageService: Sending to /history", body);
        
        const response = await fetch(`${this.API_BASE_URL}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        console.log("StorageService: /history response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("StorageService: /history response:", data);
          return; // Successfully added to backend
        }
      } catch (error) {
        console.error("Backend API failed:", error);
      }
    }

    // Fallback to localStorage
    const history = await this.getStorage();

    const exists = history.find(
      (item) => item.currency.symbol === currency.symbol
    );
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
    localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
  }

  async removeFromStorage(itemId: string): Promise<void> {
    const userId = this.getUserId();
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/history/${itemId}?userId=${userId}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          return; // Successfully removed from backend
        }
      } catch (error) {
        console.warn("Backend API failed, using localStorage:", error);
      }
    }

    // Fallback to localStorage
    const history = await this.getStorage();
    const filtered = history.filter((item) => item.id !== itemId);
    localStorage.setItem(this.getStorageKey(), JSON.stringify(filtered));
  }

  async clearStorage(): Promise<void> {
    const userId = this.getUserId();
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/history?userId=${userId}`, {
          method: "DELETE",
        });
        
        if (response.ok) {
          return; // Successfully cleared from backend
        }
      } catch (error) {
        console.warn("Backend API failed, using localStorage:", error);
      }
    }

    // Fallback to localStorage
    localStorage.removeItem(this.getStorageKey());
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    const userId = this.getUserId();
    
    console.log("StorageService: getFavorites called, userId:", userId);
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const response = await fetch(`${this.API_BASE_URL}/favorites?userId=${userId}`);
        console.log("StorageService: Backend API response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("StorageService: Backend API data:", data);
          
          if (data.success && data.favorites) {
            // Get all symbols
            const symbols = data.favorites.map((f: any) => f.symbol).join(',');
            
            // Fetch current prices in one batch request
            let pricesMap: Record<string, any> = {};
            if (symbols) {
              try {
                const ratesResponse = await fetch(
                  `${this.API_BASE_URL}/currencies/rates?symbols=${symbols}`
                );
                if (ratesResponse.ok) {
                  const ratesData = await ratesResponse.json();
                  if (ratesData.success && ratesData.rates) {
                    pricesMap = ratesData.rates;
                  }
                }
              } catch (err) {
                console.warn("Failed to fetch batch prices:", err);
              }
            }
            
            // Map favorites with prices
            const favoritesWithPrices = data.favorites.map((item: any) => ({
              id: item.id.toString(),
              currency: {
                symbol: item.symbol,
                name: item.symbol,
                price: pricesMap[item.symbol] || 0,
                change24h: 0,
              },
              addedAt: new Date(item.createdAt),
            }));
            
            console.log("StorageService: Returning", favoritesWithPrices.length, "favorites");
            return favoritesWithPrices;
          }
        }
      } catch (error) {
        console.error("Backend API failed:", error);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(this.getFavoritesKey());
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
    const userId = this.getUserId();
    
    console.log("StorageService: addToFavorites called", { userId, symbol: currency.symbol });
    
    // Try backend API first
    if (this.useBackendAPI && userId) {
      try {
        const body = {
          userId,
          type: "currency",
          symbol: currency.symbol,
        };
        console.log("StorageService: Sending to /favorites", body);
        
        const response = await fetch(`${this.API_BASE_URL}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        
        console.log("StorageService: /favorites response status:", response.status);
        
        if (response.ok || response.status === 409) {
          const data = await response.json();
          console.log("StorageService: /favorites response:", data);
          return; // Successfully added or already exists
        }
      } catch (error) {
        console.error("Backend API failed:", error);
      }
    }

    // Fallback to localStorage
    const favorites = await this.getFavorites();

    const exists = favorites.find(
      (item) => item.currency.symbol === currency.symbol
    );
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
    localStorage.setItem(this.getFavoritesKey(), JSON.stringify(toSave));
  }

  async removeFromFavorites(itemId: string): Promise<void> {
    const userId = this.getUserId();
    
    // Try backend API first - need to find the item first to get symbol
    if (this.useBackendAPI && userId) {
      try {
        const favorites = await this.getFavorites();
        const item = favorites.find((f) => f.id === itemId);
        
        if (item) {
          const response = await fetch(
            `${this.API_BASE_URL}/favorites?userId=${userId}&type=currency&symbol=${item.currency.symbol}`,
            { method: "DELETE" }
          );
          
          if (response.ok) {
            return; // Successfully removed from backend
          }
        }
      } catch (error) {
        console.warn("Backend API failed, using localStorage:", error);
      }
    }

    // Fallback to localStorage
    const favorites = await this.getFavorites();
    const filtered = favorites.filter((item) => item.id !== itemId);
    localStorage.setItem(this.getFavoritesKey(), JSON.stringify(filtered));
  }

  async clearFavorites(): Promise<void> {
    localStorage.removeItem(this.getFavoritesKey());
  }

  async isFavorite(symbol: string): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.some((item) => item.currency.symbol === symbol);
  }
}

export const StorageService = new StorageServiceClass();
