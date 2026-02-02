import { useCurrency } from '../context/CurrencyContext';
import '../styles/CurrencyCard.css';

interface CurrencyCardProps {
  symbol: string;
}

export function CurrencyCard({ symbol }: CurrencyCardProps) {
  const { currencies, selectedCurrency, selectCurrency, unsubscribeFromCurrency, removeCurrency } = useCurrency();
  const currency = currencies.get(symbol);

  if (!currency) return null;

  const isSelected = selectedCurrency === symbol;
  const isPositive = currency.change24h >= 0;

  const handleRemove = () => {
    unsubscribeFromCurrency(symbol);
    removeCurrency(symbol);
    if (selectedCurrency === symbol) {
      selectCurrency('');
    }
  };

  return (
    <div 
      className={`currency-card ${isSelected ? 'selected' : ''}`}
      onClick={() => selectCurrency(symbol)}
    >
      <div className="card-header">
        <div className="card-title">
          <span className="currency-symbol">{currency.symbol}</span>
          <span className="currency-name">{currency.name}</span>
        </div>
        <button 
          className="remove-button"
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
        >
          ×
        </button>
      </div>

      <div className="card-body">
        <div className="price-display">
          ${currency.price.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
        
        <div className={`change-display ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(currency.change24h).toFixed(2)}%
        </div>
      </div>

      <div className="card-footer">
        <span className="update-time">
          {new Date(currency.timestamp).toLocaleTimeString('ru-RU')}
        </span>
      </div>
    </div>
  );
}

