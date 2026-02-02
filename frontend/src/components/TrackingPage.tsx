import { useState } from "react";
import { Layout } from "./Layout";
import { TrackingList } from "./TrackingList";
import { HistoryList } from "./HistoryList";
import { FavoritesList } from "./FavoritesList";
import { useCurrency } from "../context/CurrencyContext";
import { CurrencyController } from "../services/CurrencyController";
import "../styles/TrackingPage.css";

export function TrackingPage() {
  const { currencies } = useCurrency();
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [refreshFavorites, setRefreshFavorites] = useState(0);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddToHistory = async (symbol: string) => {
    const currency = currencies.get(symbol);
    if (!currency) {
      showNotification("Валюта не найдена", "error");
      return;
    }

    try {
      await CurrencyController.addToStorage(currency);
      setRefreshHistory((prev) => prev + 1);
      showNotification(`${currency.name} добавлена в историю`);
    } catch (error) {
      showNotification("Ошибка при добавлении в историю", "error");
    }
  };

  const handleAddToFavorites = async (symbol: string) => {
    const currency = currencies.get(symbol);
    if (!currency) {
      showNotification("Валюта не найдена", "error");
      return;
    }

    try {
      await CurrencyController.addToFavorites(currency);
      setRefreshFavorites((prev) => prev + 1);
      showNotification(`${currency.name} добавлена в избранное`);
    } catch (error) {
      showNotification("Ошибка при добавлении в избранное", "error");
    }
  };

  return (
    <Layout>
      <div className="tracking-page">
        <header className="tracking-header">
          <div className="header-content">
            <h2 className="tracking-title">Отслеживание валют</h2>
            <p className="tracking-subtitle">
              Управляйте отслеживаемыми валютами, историей и избранным
            </p>
          </div>
        </header>

        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}

        <div className="tracking-content">
          <div className="main-section">
            <TrackingList
              onAddToHistory={handleAddToHistory}
              onAddToFavorites={handleAddToFavorites}
            />
          </div>

          <div className="side-sections">
            <HistoryList refreshTrigger={refreshHistory} />
            <FavoritesList refreshTrigger={refreshFavorites} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
