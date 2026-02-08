import { useEffect, useState, useCallback } from "react";
import {
  AlertService,
  type Alert,
  type Notification,
} from "../services/AlertService";
import { ChartAlertForm } from "./ChartAlertForm";
import "../styles/ChartAlertsSection.css";

interface ChartAlertsSectionProps {
  userId: number;
  selectedSymbol: string | null;
}

export function ChartAlertsSection({
  userId,
  selectedSymbol,
}: ChartAlertsSectionProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      AlertService.getAlerts(userId),
      AlertService.getNotifications(userId),
    ])
      .then(([a, n]) => {
        setAlerts(a);
        setNotifications(n);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteAlert = async (id: number) => {
    try {
      await AlertService.deleteAlert(userId, id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await AlertService.markNotificationRead(userId, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && alerts.length === 0 && notifications.length === 0) {
    return null;
  }

  return (
    <div className="chart-alerts-section">
      <div className="chart-alerts-section-header">
        <h4 className="chart-alerts-section-title">Уведомления по цене</h4>
        <button
          type="button"
          className="chart-alerts-section-add-btn"
          onClick={() => setShowForm(true)}
        >
          + Поставить уведомление
        </button>
      </div>

      {showForm && (
        <ChartAlertForm
          userId={userId}
          defaultSymbol={selectedSymbol || "BTC"}
          onCreated={load}
          onClose={() => setShowForm(false)}
        />
      )}

      {alerts.length > 0 && (
        <div className="chart-alerts-list">
          <span className="chart-alerts-list-label">Активные алерты:</span>
          <ul>
            {alerts.map((a) => (
              <li key={a.id} className="chart-alerts-list-item">
                <span>
                  {a.symbol} {a.condition === "above" ? "≥" : "≤"}{" "}
                  ${a.targetValue.toLocaleString("en-US")}
                </span>
                <button
                  type="button"
                  className="chart-alerts-delete-btn"
                  onClick={() => handleDeleteAlert(a.id)}
                  title="Удалить"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {notifications.length > 0 && (
        <div className="chart-notifications-list">
          <span className="chart-alerts-list-label">Сработавшие:</span>
          <ul>
            {notifications.slice(0, 10).map((n) => (
              <li
                key={n.id}
                className={`chart-notifications-list-item ${n.readAt ? "read" : ""}`}
              >
                <span className="chart-notifications-message">{n.message}</span>
                {!n.readAt && (
                  <button
                    type="button"
                    className="chart-alerts-read-btn"
                    onClick={() => handleMarkRead(n.id)}
                  >
                    Прочитано
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
