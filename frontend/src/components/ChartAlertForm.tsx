import { useState } from "react";
import { AlertService, type CreateAlertBody } from "../services/AlertService";
import "../styles/ChartAlertForm.css";

interface ChartAlertFormProps {
  userId: number;
  defaultSymbol: string;
  onCreated: () => void;
  onClose: () => void;
}

export function ChartAlertForm({
  userId,
  defaultSymbol,
  onCreated,
  onClose,
}: ChartAlertFormProps) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [condition, setCondition] = useState<"above" | "below">("below");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const num = parseFloat(targetValue.replace(",", "."));
    if (Number.isNaN(num) || num <= 0) {
      setError("Введите положительное число");
      return;
    }

    setSubmitting(true);
    try {
      const body: CreateAlertBody = {
        symbol: symbol.trim().toUpperCase(),
        condition,
        targetValue: num,
      };
      await AlertService.createAlert(userId, body);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="chart-alert-form-overlay" onClick={onClose}>
      <div
        className="chart-alert-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="chart-alert-form-title">Уведомление по цене</h3>
        <form onSubmit={handleSubmit} className="chart-alert-form">
          <label className="chart-alert-form-label">
            Символ (валюта)
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC"
              className="chart-alert-form-input"
            />
          </label>
          <label className="chart-alert-form-label">
            Уведомить когда цена
            <select
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value as "above" | "below")
              }
              className="chart-alert-form-select"
            >
              <option value="below">ниже порога</option>
              <option value="above">выше порога</option>
            </select>
          </label>
          <label className="chart-alert-form-label">
            Порог ($)
            <input
              type="text"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="1000"
              className="chart-alert-form-input"
            />
          </label>
          {error && <p className="chart-alert-form-error">{error}</p>}
          <div className="chart-alert-form-actions">
            <button
              type="button"
              className="chart-alert-form-btn secondary"
              onClick={onClose}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="chart-alert-form-btn primary"
              disabled={submitting}
            >
              {submitting ? "Сохранение…" : "Создать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
