import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { CurrencyData } from "../services/CurrencyAPI";
import { WebSocketService } from "../services/WebSocketService";
import { useAuth } from "./AuthContext";

interface CurrencyContextType {
  currencies: Map<string, CurrencyData>;
  selectedCurrency: string | null;
  selectCurrency: (symbol: string) => void;
  addCurrency: (data: CurrencyData) => void;
  mergeCurrencyUpdate: (symbol: string, partial: Partial<CurrencyData>) => void;
  removeCurrency: (symbol: string) => void;
  subscribeToCurrency: (symbol: string) => void;
  unsubscribeFromCurrency: (symbol: string) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined
);

// Helper functions for localStorage with userId
const getUserCurrenciesKey = (userId: string | null) => 
  `tracked_currencies_${userId || 'guest'}`;

const getUserSelectedCurrencyKey = (userId: string | null) => 
  `selected_currency_${userId || 'guest'}`;

const saveCurrenciesToStorage = (userId: string | null, currencies: Map<string, CurrencyData>) => {
  try {
    const currenciesArray = Array.from(currencies.entries());
    localStorage.setItem(getUserCurrenciesKey(userId), JSON.stringify(currenciesArray));
    console.log("CurrencyContext: Saved", currenciesArray.length, "currencies for user", userId);
  } catch (error) {
    console.error("Failed to save currencies to localStorage:", error);
  }
};

const loadCurrenciesFromStorage = (userId: string | null): Map<string, CurrencyData> => {
  try {
    const stored = localStorage.getItem(getUserCurrenciesKey(userId));
    if (stored) {
      const currenciesArray = JSON.parse(stored);
      const map = new Map<string, CurrencyData>(currenciesArray);
      console.log("CurrencyContext: Loaded", map.size, "currencies for user", userId);
      return map;
    }
  } catch (error) {
    console.error("Failed to load currencies from localStorage:", error);
  }
  return new Map();
};

const saveSelectedCurrencyToStorage = (userId: string | null, symbol: string | null) => {
  try {
    if (symbol) {
      localStorage.setItem(getUserSelectedCurrencyKey(userId), symbol);
    } else {
      localStorage.removeItem(getUserSelectedCurrencyKey(userId));
    }
  } catch (error) {
    console.error("Failed to save selected currency to localStorage:", error);
  }
};

const loadSelectedCurrencyFromStorage = (userId: string | null): string | null => {
  try {
    return localStorage.getItem(getUserSelectedCurrencyKey(userId));
  } catch (error) {
    console.error("Failed to load selected currency from localStorage:", error);
    return null;
  }
};

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  
  const [currencies, setCurrencies] = useState<Map<string, CurrencyData>>(() => 
    loadCurrenciesFromStorage(userId)
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(() => 
    loadSelectedCurrencyFromStorage(userId)
  );
  const [subscriptions, setSubscriptions] = useState<Map<string, () => void>>(
    new Map()
  );

  const addCurrency = useCallback((data: CurrencyData) => {
    setCurrencies((prev) => {
      const next = new Map(prev);
      next.set(data.symbol, data);
      saveCurrenciesToStorage(userId, next);
      return next;
    });
  }, [userId]);

  const mergeCurrencyUpdate = useCallback(
    (symbol: string, partial: Partial<CurrencyData>) => {
      setCurrencies((prev) => {
        const next = new Map(prev);
        const existing = prev.get(symbol);
        const merged: CurrencyData = {
          symbol,
          name: partial.name ?? existing?.name ?? symbol,
          price: partial.price ?? existing?.price ?? 0,
          change24h: partial.change24h ?? existing?.change24h ?? 0,
          timestamp: partial.timestamp ?? existing?.timestamp ?? Date.now(),
          history: existing?.history ?? [],
        };
        next.set(symbol, merged);
        saveCurrenciesToStorage(userId, next);
        return next;
      });
    },
    [userId]
  );

  const removeCurrency = useCallback((symbol: string) => {
    setCurrencies((prev) => {
      const next = new Map(prev);
      next.delete(symbol);
      saveCurrenciesToStorage(userId, next);
      return next;
    });
  }, [userId]);

  const subscribeToCurrency = useCallback(
    (symbol: string) => {
      setSubscriptions((prev) => {
        if (prev.has(symbol)) return prev;

        const unsubscribe = WebSocketService.subscribe(symbol, (data) => {
          setCurrencies((prevCurrencies) => {
            const next = new Map(prevCurrencies);
            const existing = prevCurrencies.get(symbol);
            const merged: CurrencyData = {
              symbol,
              name: data.name ?? existing?.name ?? symbol,
              price: data.price ?? existing?.price ?? 0,
              change24h: data.change24h ?? existing?.change24h ?? 0,
              timestamp: data.timestamp ?? existing?.timestamp ?? Date.now(),
              history: existing?.history ?? [],
            };
            next.set(symbol, merged);
            saveCurrenciesToStorage(userId, next);
            return next;
          });
        });

        const next = new Map(prev);
        next.set(symbol, unsubscribe);
        return next;
      });
    },
    [userId]
  );

  const unsubscribeFromCurrency = useCallback((symbol: string) => {
    setSubscriptions((prev) => {
      const unsubscribe = prev.get(symbol);
      if (unsubscribe) {
        unsubscribe();
        const next = new Map(prev);
        next.delete(symbol);
        return next;
      }
      return prev;
    });
  }, []);

  const selectCurrency = useCallback((symbol: string) => {
    setSelectedCurrency(symbol);
    saveSelectedCurrencyToStorage(userId, symbol);
  }, [userId]);

  // Clear and reload when user changes
  useEffect(() => {
    console.log("CurrencyContext: User changed to", userId);
    
    // Unsubscribe from all current subscriptions
    subscriptions.forEach((unsubscribe) => unsubscribe());
    
    // Load user-specific data
    const loadedCurrencies = loadCurrenciesFromStorage(userId);
    const loadedSelected = loadSelectedCurrencyFromStorage(userId);
    
    setCurrencies(loadedCurrencies);
    setSelectedCurrency(loadedSelected);
    
    // Re-subscribe to loaded currencies
    const newSubscriptions = new Map<string, () => void>();
    loadedCurrencies.forEach((_, symbol) => {
      const unsubscribe = WebSocketService.subscribe(symbol, (data) => {
        setCurrencies((prev) => {
          const next = new Map(prev);
          const existing = prev.get(symbol);
          const merged: CurrencyData = {
            symbol,
            name: data.name ?? existing?.name ?? symbol,
            price: data.price ?? existing?.price ?? 0,
            change24h: data.change24h ?? existing?.change24h ?? 0,
            timestamp: data.timestamp ?? existing?.timestamp ?? Date.now(),
            history: existing?.history ?? [],
          };
          next.set(symbol, merged);
          saveCurrenciesToStorage(userId, next);
          return next;
        });
      });
      newSubscriptions.set(symbol, unsubscribe);
    });
    
    setSubscriptions(newSubscriptions);
  }, [userId]);

  useEffect(() => {
    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
      WebSocketService.disconnect();
    };
  }, [subscriptions]);

  const value = {
    currencies,
    selectedCurrency,
    selectCurrency,
    addCurrency,
    mergeCurrencyUpdate,
    removeCurrency,
    subscribeToCurrency,
    unsubscribeFromCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
