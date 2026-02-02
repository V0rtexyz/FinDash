import { useCurrency } from '../context/CurrencyContext';
import { CurrencyController } from '../services/CurrencyController';
import '../styles/TrackingList.css';

interface TrackingListProps {
  onAddToHistory: (symbol: string) => void;
  onAddToFavorites: (symbol: string) => void;
}

export function TrackingList({ onAddToHistory, onAddToFavorites }: TrackingListProps) {
  const { currencies, unsubscribeFromCurrency, removeCurrency } = useCurrency();

  const currencyArray = Array.from(currencies.values());

  const handleRemove = (symbol: string) => {
    unsubscribeFromCurrency(symbol);
    removeCurrency(symbol);
  };

  if (currencyArray.length === 0) {
    return (
      <div className="tracking-list-container">
        <div className="section-header">
          <h3 className="section-title">Отслеживаемые валюты</h3>
          <span className="section-count">0</span>
        </div>
        <div className="empty-state">
          <p>Нет отслеживаемых валют</p>
          <p className="empty-hint">Добавьте валюты на панели управления</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-list-container">
      <div className="section-header">
        <h3 className="section-title">Отслеживаемые валюты</h3>
        <span className="section-count">{currencyArray.length}</span>
      </div>

      <div className="tracking-items">
        {currencyArray.map((currency) => (
          <div key={currency.symbol} className="tracking-item">
            <div className="item-header">
              <div className="currency-info">
                <span className="currency-symbol">{currency.symbol}</span>
                <span className="currency-name">{currency.name}</span>
              </div>
              <span className={`currency-change ${currency.change24h >= 0 ? 'positive' : 'negative'}`}>
                {currency.change24h >= 0 ? '↑' : '↓'} {Math.abs(currency.change24h).toFixed(2)}%
              </span>
            </div>

            <div className="item-price">
              ${currency.price.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>

            <div className="item-meta">
              <span className="update-time">
                Обновлено: {new Date(currency.timestamp).toLocaleTimeString('ru-RU')}
              </span>
            </div>

            <div className="item-actions">
              <button
                onClick={() => onAddToHistory(currency.symbol)}
                className="action-btn history"
                title="Добавить в историю"
              >
                История
              </button>
              <button
                onClick={() => onAddToFavorites(currency.symbol)}
                className="action-btn favorite"
                title="Добавить в избранное"
              >
                ★ Избранное
              </button>
              <button
                onClick={() => handleRemove(currency.symbol)}
                className="action-btn remove"
                title="Удалить"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


