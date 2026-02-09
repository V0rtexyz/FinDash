import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CurrencyController } from "../services/CurrencyController";
import { FavoriteItem } from "../services/StorageService";
import "../styles/FavoritesList.css";

interface FavoritesListProps {
  refreshTrigger: number;
}

export function FavoritesList({ refreshTrigger }: FavoritesListProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFavorites = async () => {
    console.log("FavoritesList: Loading favorites for user", user?.id);
    setIsLoading(true);
    try {
      const items = await CurrencyController.getFavorites();
      console.log("FavoritesList: Loaded", items.length, "favorites");
      setFavorites(items);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      "FavoritesList: useEffect triggered, userId:",
      user?.id,
      "refreshTrigger:",
      refreshTrigger
    );
    loadFavorites();
  }, [refreshTrigger, user?.id]);

  const handleRemove = async (itemId: string) => {
    await CurrencyController.removeFromFavorites(itemId);
    loadFavorites();
  };

  if (isLoading) {
    return (
      <div className="favorites-list-container">
        <div className="section-header">
          <h3 className="section-title">Избранное</h3>
        </div>
        <div className="loading-state">Загрузка...</div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="favorites-list-container">
        <div className="section-header">
          <h3 className="section-title">Избранное</h3>
          <span className="section-count">0</span>
        </div>
        <div className="empty-state">
          <p>Избранное пусто</p>
          <p className="empty-hint">
            Добавляйте важные валюты в избранное для быстрого доступа
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="favorites-list-container">
      <div className="section-header">
        <h3 className="section-title">Избранное</h3>
        <span className="section-count">{favorites.length}</span>
      </div>

      <div className="favorites-grid">
        {favorites.map((item) => (
          <div key={item.id} className="favorite-card">
            <button
              onClick={() => handleRemove(item.id)}
              className="remove-btn"
              title="Удалить"
            >
              ×
            </button>

            <div className="card-icon">⭐</div>

            <div className="card-body">
              <div className="currency-header">
                <span className="currency-symbol">{item.currency.symbol}</span>
              </div>
              <div className="currency-name">{item.currency.name}</div>

              <div className="currency-price">
                $
                {item.currency.price.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>

              <div
                className={`currency-change ${
                  item.currency.change24h >= 0 ? "positive" : "negative"
                }`}
              >
                {item.currency.change24h >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(item.currency.change24h).toFixed(2)}%
              </div>

              <div className="added-time">
                {new Date(item.addedAt).toLocaleDateString("ru-RU")}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
