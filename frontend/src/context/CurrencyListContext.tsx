import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { CurrencyAPI } from "../services/CurrencyAPI";

interface CurrencyInfo {
  symbol: string;
  name: string;
}

interface CurrencyListContextType {
  currencies: CurrencyInfo[];
  isLoading: boolean;
  error: string | null;
  refreshCurrencies: () => Promise<void>;
}

const CurrencyListContext = createContext<CurrencyListContextType | undefined>(
  undefined
);

let currenciesFetchPromise: Promise<CurrencyInfo[]> | null = null;

export function CurrencyListProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadCurrencies = async () => {
    try {
      const cached = sessionStorage.getItem("available_currencies");
      const cacheTime = sessionStorage.getItem("available_currencies_time");
      const now = Date.now();

      if (cached && cacheTime && now - parseInt(cacheTime) < 3600000) {
        setCurrencies(JSON.parse(cached));
        setIsLoading(false);
        return;
      }

      if (!currenciesFetchPromise) {
        currenciesFetchPromise = CurrencyAPI.fetchAvailableCurrencies();
      }
      const data = await currenciesFetchPromise;
      currenciesFetchPromise = null;

      if (mountedRef.current) {
        setCurrencies(data);
        sessionStorage.setItem("available_currencies", JSON.stringify(data));
        sessionStorage.setItem("available_currencies_time", now.toString());
        setError(null);
      }
    } catch (err) {
      currenciesFetchPromise = null;
      console.error("Error loading currencies:", err);
      if (mountedRef.current) {
        setError("Не удалось загрузить список валют");
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  };

  const refreshCurrencies = async () => {
    sessionStorage.removeItem("available_currencies");
    sessionStorage.removeItem("available_currencies_time");
    currenciesFetchPromise = null;
    setIsLoading(true);
    await loadCurrencies();
  };

  useEffect(() => {
    mountedRef.current = true;
    loadCurrencies();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const value = {
    currencies,
    isLoading,
    error,
    refreshCurrencies,
  };

  return (
    <CurrencyListContext.Provider value={value}>
      {children}
    </CurrencyListContext.Provider>
  );
}

export function useCurrencyList() {
  const context = useContext(CurrencyListContext);
  if (context === undefined) {
    throw new Error(
      "useCurrencyList must be used within a CurrencyListProvider"
    );
  }
  return context;
}
