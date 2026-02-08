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

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<Map<string, CurrencyData>>(
    new Map()
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<Map<string, () => void>>(
    new Map()
  );

  const addCurrency = useCallback((data: CurrencyData) => {
    setCurrencies((prev) => {
      const next = new Map(prev);
      next.set(data.symbol, data);
      return next;
    });
  }, []);

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
        return next;
      });
    },
    []
  );

  const removeCurrency = useCallback((symbol: string) => {
    setCurrencies((prev) => {
      const next = new Map(prev);
      next.delete(symbol);
      return next;
    });
  }, []);

  const subscribeToCurrency = useCallback(
    (symbol: string) => {
      setSubscriptions((prev) => {
        if (prev.has(symbol)) return prev;

        const unsubscribe = WebSocketService.subscribe(symbol, (data) => {
          mergeCurrencyUpdate(symbol, data);
        });

        const next = new Map(prev);
        next.set(symbol, unsubscribe);
        return next;
      });
    },
    [mergeCurrencyUpdate]
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
  }, []);

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
