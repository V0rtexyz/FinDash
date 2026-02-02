import { useCurrency } from '../context/CurrencyContext';
import { Layout } from './Layout';
import { ValueLocator } from './ValueLocator';
import { CurrencyCard } from './CurrencyCard';
import { ChartsView } from './ChartsView';
import '../styles/Dashboard.css';

export function Dashboard() {
  const { currencies } = useCurrency();

  const currencyArray = Array.from(currencies.values());

  return (
    <Layout>
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="sidebar">
            <ValueLocator />
            
            <div className="currencies-list">
              <h3 className="currencies-title">Отслеживаемые валюты</h3>
              {currencyArray.length === 0 ? (
                <div className="empty-currencies">
                  <p>Добавьте валюту для отслеживания</p>
                </div>
              ) : (
                <div className="currency-cards">
                  {currencyArray.map((currency) => (
                    <CurrencyCard key={currency.symbol} symbol={currency.symbol} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="main-content">
            <ChartsView />
          </div>
        </div>
      </div>
    </Layout>
  );
}

