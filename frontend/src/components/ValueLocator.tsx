import { useState, useEffect } from "react";
import { CurrencyAPI } from "../services/CurrencyAPI";
import { useCurrency } from "../context/CurrencyContext";
import { useCurrencyList } from "../context/CurrencyListContext";
import "../styles/ValueLocator.css";

export function ValueLocator() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const { addCurrency, subscribeToCurrency, currencies } = useCurrency();
  const { currencies: availableCurrencies, isLoading: currenciesLoading } =
    useCurrencyList();

  useEffect(() => {
    // Устанавливаем первую валюту из списка по умолчанию
    if (availableCurrencies.length > 0 && !selectedSymbol) {
      setSelectedSymbol(availableCurrencies[0].symbol);
    }
  }, [availableCurrencies, selectedSymbol]);

  const handleAddCurrency = async () => {
    if (!selectedSymbol) return;

    if (currencies.has(selectedSymbol)) {
      setError("Эта валюта уже добавлена");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Получаем имя валюты из списка
      const currencyInfo = availableCurrencies.find(
        (c) => c.symbol === selectedSymbol
      );
      const currencyName = currencyInfo?.name || selectedSymbol;

      // Передаём имя, чтобы не делать лишний запрос
      const data = await CurrencyAPI.fetchCurrencyData(
        selectedSymbol,
        currencyName
      );
      addCurrency(data);
      subscribeToCurrency(selectedSymbol);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
    } finally {
      setIsLoading(false);
    }
  };

  if (currenciesLoading) {
    return (
      <div className="value-locator">
        <div className="locator-header">
          <h3 className="locator-title">Добавить валюту</h3>
        </div>
        <div className="locator-content">
          <div className="loading">Загрузка списка валют...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="value-locator">
      <div className="locator-header">
        <h3 className="locator-title">Добавить валюту</h3>
      </div>

      <div className="locator-content">
        <div className="currency-selector">
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="currency-select"
            disabled={isLoading}
          >
            {availableCurrencies.map((currency) => {
              const displayName = currency.name || currency.symbol || "";
              const displaySymbol = currency.symbol || "";
              return (
                <option key={displaySymbol} value={displaySymbol}>
                  {displayName} ({displaySymbol})
                </option>
              );
            })}
          </select>

          <button
            onClick={handleAddCurrency}
            className="add-button"
            disabled={isLoading || !selectedSymbol}
          >
            {isLoading ? "Загрузка..." : "Добавить"}
          </button>
        </div>

        {error && <div className="locator-error">{error}</div>}
      </div>
    </div>
  );
}
