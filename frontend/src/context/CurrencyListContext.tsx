import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyAPI } from '../services/CurrencyAPI';

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

const CurrencyListContext = createContext<CurrencyListContextType | undefined>(undefined);

export function CurrencyListProvider({ children }: { children: ReactNode }) {
  const [currencies, setCurrencies] = useState<CurrencyInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurrencies = async () => {
    try {
      // Проверяем кэш в sessionStorage
      const cached = sessionStorage.getItem('available_currencies');
      const cacheTime = sessionStorage.getItem('available_currencies_time');
      const now = Date.now();
      
      // Кэш валиден 1 час
      if (cached && cacheTime && (now - parseInt(cacheTime)) < 3600000) {
        setCurrencies(JSON.parse(cached));
        setIsLoading(false);
        return;
      }

      // Загружаем с сервера
      const data = await CurrencyAPI.fetchAvailableCurrencies();
      setCurrencies(data);
      
      // Сохраняем в кэш
      sessionStorage.setItem('available_currencies', JSON.stringify(data));
      sessionStorage.setItem('available_currencies_time', now.toString());
      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error loading currencies:', err);
      setError('Не удалось загрузить список валют');
      setIsLoading(false);
    }
  };

  const refreshCurrencies = async () => {
    // Очищаем кэш и перезагружаем
    sessionStorage.removeItem('available_currencies');
    sessionStorage.removeItem('available_currencies_time');
    setIsLoading(true);
    await loadCurrencies();
  };

  useEffect(() => {
    loadCurrencies();
  }, []); // Загружаем только один раз при монтировании

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
    throw new Error('useCurrencyList must be used within a CurrencyListProvider');
  }
  return context;
}


