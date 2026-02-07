import { useState, FormEvent } from "react";
import { CurrencyAPI } from "../services/CurrencyAPI";
import { ReportService, ReportParams } from "../services/ReportService";
import { useReport } from "../context/ReportContext";
import { useCurrency } from "../context/CurrencyContext";
import { useCurrencyList } from "../context/CurrencyListContext";
import "../styles/ReportForm.css";

const CURRENCIES = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "BNB", name: "Binance Coin" },
  { symbol: "XRP", name: "Ripple" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
];

const INTERVALS = [
  { value: "1h", label: "1 час" },
  { value: "1d", label: "1 день" },
  { value: "1w", label: "1 неделя" },
];

export function ReportForm() {
  const [currency, setCurrency] = useState("BTC");
  const [interval, setInterval] = useState<"1h" | "1d" | "1w">("1d");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");

  const { addReport, setIsGenerating, setError } = useReport();
  const { currencies } = useCurrency();
  const { currencies: availableCurrencies } = useCurrencyList();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Создаем даты в UTC с явным указанием времени
    // startDate: начало дня (00:00:00.000)
    // endDate: конец дня (23:59:59.999)
    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    if (start > end) {
      setError("Начальная дата не может быть позже конечной");
      return;
    }

    const params: ReportParams = {
      currency,
      startDate: start,
      endDate: end,
      interval,
    };

    setIsGenerating(true);

    try {
      // Проверяем: может валюта уже отслеживается?
      let currencyData = currencies.get(currency);

      // Получаем имя валюты из списка
      const currencyInfo = availableCurrencies.find(
        (c) => c.symbol === currency
      );
      const currencyName = currencyInfo?.name || currency;

      // Если валюта не отслеживается - загружаем с правильными параметрами для отчёта
      if (!currencyData) {
        currencyData = await CurrencyAPI.fetchCurrencyDataForReport(
          currency,
          start,
          end,
          currencyName
        );
      }

      const report = await ReportService.generateReport(params, currencyData);
      report.format = format;

      await addReport(report);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка при создании отчёта"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="report-form-container">
      <h3 className="form-title">Параметры отчёта</h3>

      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Валюта</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="field-select"
            >
              {CURRENCIES.map((c) => (
                <option key={c.symbol} value={c.symbol}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="field-label">Интервал</label>
            <select
              value={interval}
              onChange={(e) =>
                setInterval(e.target.value as "1h" | "1d" | "1w")
              }
              className="field-select"
            >
              {INTERVALS.map((i) => (
                <option key={i.value} value={i.value}>
                  {i.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-field">
            <label className="field-label">Начальная дата</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field-input"
              max={endDate}
            />
          </div>

          <div className="form-field">
            <label className="field-label">Конечная дата</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field-input"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="field-label">Формат</label>
          <div className="format-options">
            <label className="radio-label">
              <input
                type="radio"
                value="pdf"
                checked={format === "pdf"}
                onChange={(e) => setFormat(e.target.value as "pdf")}
              />
              <span>PDF</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="csv"
                checked={format === "csv"}
                onChange={(e) => setFormat(e.target.value as "csv")}
              />
              <span>CSV</span>
            </label>
          </div>
        </div>

        <button type="submit" className="generate-button">
          Сформировать отчёт
        </button>
      </form>
    </div>
  );
}
