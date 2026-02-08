import { useEffect, useState } from "react";
import { CurrencyController } from "../services/CurrencyController";
import { StorageItem } from "../services/StorageService";
import "../styles/HistoryList.css";

interface HistoryListProps {
  refreshTrigger: number;
}

export function HistoryList({ refreshTrigger }: HistoryListProps) {
  const [history, setHistory] = useState<StorageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const items = await CurrencyController.getStorage();
      setHistory(items);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [refreshTrigger]);

  const handleRemove = async (itemId: string) => {
    await CurrencyController.removeFromStorage(itemId);
    loadHistory();
  };

  if (isLoading) {
    return (
      <div className="history-list-container">
        <div className="section-header">
          <h3 className="section-title">История</h3>
        </div>
        <div className="loading-state">Загрузка...</div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="history-list-container">
        <div className="section-header">
          <h3 className="section-title">История</h3>
          <span className="section-count">0</span>
        </div>
        <div className="empty-state">
          <p>История пуста</p>
          <p className="empty-hint">
            Добавляйте валюты в историю для отслеживания изменений
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-list-container">
      <div className="section-header">
        <h3 className="section-title">История</h3>
        <span className="section-count">{history.length}</span>
      </div>

      <div className="history-items">
        {history.map((item) => (
          <div key={item.id} className="history-item">
            <div className="item-main">
              <div className="currency-info">
                <span className="currency-symbol">{item.currency.symbol}</span>
                <span className="currency-name">{item.currency.name}</span>
              </div>
              <div className="price-info">
                <span className="currency-price">
                  $
                  {item.currency.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`currency-change ${
                    item.currency.change24h >= 0 ? "positive" : "negative"
                  }`}
                >
                  {item.currency.change24h >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(item.currency.change24h).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="item-footer">
              <span className="added-time">
                Добавлено: {new Date(item.addedAt).toLocaleString("ru-RU")}
              </span>
              <button
                onClick={() => handleRemove(item.id)}
                className="remove-btn"
                title="Удалить"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
