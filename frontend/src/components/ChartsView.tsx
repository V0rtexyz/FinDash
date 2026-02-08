import { useEffect, useRef, useState, useCallback } from "react";
import { Line, Bar, Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import { useCurrency } from "../context/CurrencyContext";
import { UpdateGraphicsService } from "../services/UpdateGraphicsService";
import {
  CurrencyAPI,
  getDateRangeForPeriod,
  type ChartPeriod,
} from "../services/CurrencyAPI";
import type { CurrencyData } from "../services/CurrencyAPI";
import { useAuth } from "../context/AuthContext";
import { ChartAlertsSection } from "./ChartAlertsSection";
import "../styles/ChartsView.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin,
  CandlestickController,
  CandlestickElement
);

const PERIOD_LABELS: { value: ChartPeriod; label: string }[] = [
  { value: "1D", label: "День" },
  { value: "1W", label: "Неделя" },
  { value: "1M", label: "Месяц" },
  { value: "1Y", label: "Год" },
  { value: "ALL", label: "Всё время" },
];

const CHART_TYPE_LABELS: {
  value: "line" | "area" | "bar" | "candlestick";
  label: string;
}[] = [
  { value: "line", label: "Линия" },
  { value: "area", label: "Площадь" },
  { value: "bar", label: "Столбики" },
  { value: "candlestick", label: "Свечи" },
];

const defaultScaleOptions = {
  x: {
    grid: { display: false },
    ticks: {
      color: "#718096",
      maxRotation: 45,
      minRotation: 45,
    },
  },
  y: {
    grid: { color: "rgba(0, 0, 0, 0.05)" },
    ticks: {
      color: "#718096",
      callback: function (value: unknown) {
        return "$" + Number(value).toLocaleString("en-US");
      },
    },
  },
};

export function ChartsView() {
  const { currencies, selectedCurrency } = useCurrency();
  const { user } = useAuth();
  const userId = user?.id ? Number(user.id) : 0;
  const chartRef = useRef<ChartJS | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("1M");
  const [chartType, setChartType] = useState<
    "line" | "area" | "bar" | "candlestick"
  >("line");
  const [chartDataLocal, setChartDataLocal] = useState<CurrencyData | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const selectedDataFromContext = selectedCurrency
    ? currencies.get(selectedCurrency)
    : undefined;

  const fetchChartData = useCallback(async () => {
    if (!selectedCurrency) return;
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRangeForPeriod(chartPeriod);
      const data = await CurrencyAPI.fetchCurrencyDataForReport(
        selectedCurrency,
        startDate,
        endDate,
        selectedDataFromContext?.name
      );
      setChartDataLocal(data);
    } catch (e) {
      console.error("Failed to fetch chart data:", e);
      setChartDataLocal(null);
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency, chartPeriod, selectedDataFromContext?.name]);

  useEffect(() => {
    if (!selectedCurrency) {
      setChartDataLocal(null);
      return;
    }
    fetchChartData();
  }, [selectedCurrency, chartPeriod, fetchChartData]);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update("none");
    }
  }, [chartDataLocal, chartType]);

  const handleZoomIn = () => {
    if (chartRef.current) {
      (chartRef.current as unknown as { zoom: (n: number) => void }).zoom(1.2);
    }
  };

  const handleZoomOut = () => {
    if (chartRef.current) {
      (chartRef.current as unknown as { zoom: (n: number) => void }).zoom(0.8);
    }
  };

  const handleResetZoom = () => {
    if (chartRef.current) {
      (chartRef.current as unknown as { resetZoom: () => void }).resetZoom();
    }
  };

  const handleFullscreen = () => {
    const el = chartContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleDownload = () => {
    if (chartRef.current?.toBase64Image) {
      const url = chartRef.current.toBase64Image("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `chart-${selectedCurrency || "currency"}-${Date.now()}.png`;
      a.click();
    }
  };

  if (!selectedCurrency) {
    return (
      <div className="charts-view">
        <div className="chart-container" ref={chartContainerRef}>
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Выберите валюту</h3>
            <p>Добавьте и выберите валюту для отображения графика</p>
          </div>
        </div>
      </div>
    );
  }

  const displayData = chartDataLocal ?? selectedDataFromContext;
  const isLoading = loading && !chartDataLocal;

  if (isLoading && !displayData) {
    return (
      <div className="charts-view">
        <div className="chart-container" ref={chartContainerRef}>
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Загрузка данных...</h3>
          </div>
        </div>
      </div>
    );
  }

  if (!displayData) {
    return (
      <div className="charts-view">
        <div className="chart-container" ref={chartContainerRef}>
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Нет данных</h3>
          </div>
        </div>
      </div>
    );
  }

  const lineChartData = UpdateGraphicsService.formatChartData(displayData);
  const fillLine = chartType === "area";
  if (lineChartData.datasets.length) {
    lineChartData.datasets[0].fill = fillLine;
  }

  const barChartData = {
    labels: lineChartData.labels,
    datasets: lineChartData.datasets.map((d) => ({
      label: d.label,
      data: d.data,
      backgroundColor: "rgba(102, 126, 234, 0.6)",
      borderColor: "rgba(102, 126, 234, 1)",
      borderWidth: 1,
    })),
  };

  const candlestickData =
    UpdateGraphicsService.formatCandlestickData(displayData);
  if (candlestickData.datasets.length) {
    candlestickData.datasets[0] = {
      ...candlestickData.datasets[0],
      borderColors: {
        up: "rgba(72, 187, 120, 1)",
        down: "rgba(214, 48, 49, 1)",
        unchanged: "rgba(113, 128, 150, 1)",
      },
      backgroundColors: {
        up: "rgba(72, 187, 120, 0.5)",
        down: "rgba(214, 48, 49, 0.5)",
        unchanged: "rgba(113, 128, 150, 0.5)",
      },
    };
  }

  const commonOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: "#1a202c", font: { size: 14, weight: "bold" } },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#1a202c",
        bodyColor: "#4a5568",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function (context) {
            const v = context.parsed.y ?? context.parsed?.c;
            if (v != null) {
              return (
                (context.dataset.label || "") +
                ": $" +
                Number(v).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })
              );
            }
            return "";
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: "x",
        },
        pan: {
          enabled: true,
          mode: "x",
        },
        limits: { x: { min: "original", max: "original" } },
      },
    },
    scales: defaultScaleOptions,
    interaction: { mode: "nearest", axis: "x", intersect: false },
  };

  const candlestickOptions = {
    ...commonOptions,
    scales: defaultScaleOptions,
  };

  return (
    <div className="charts-view">
      <div className="chart-header">
        <h3 className="chart-title">График цены {displayData.name}</h3>
        <div className="chart-info">
          <span className="current-price">
            $
            {displayData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={`price-change ${
              displayData.change24h >= 0 ? "positive" : "negative"
            }`}
          >
            {displayData.change24h >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(displayData.change24h).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="chart-toolbar">
        <div className="chart-toolbar-group">
          <span className="chart-toolbar-label">Период:</span>
          {PERIOD_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`chart-toolbar-btn ${
                chartPeriod === value ? "active" : ""
              }`}
              onClick={() => setChartPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chart-toolbar-group">
          <span className="chart-toolbar-label">Вид:</span>
          {CHART_TYPE_LABELS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`chart-toolbar-btn ${
                chartType === value ? "active" : ""
              }`}
              onClick={() => setChartType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="chart-toolbar-group">
          <button
            type="button"
            className="chart-toolbar-btn"
            onClick={handleZoomIn}
            title="Приблизить"
          >
            +
          </button>
          <button
            type="button"
            className="chart-toolbar-btn"
            onClick={handleZoomOut}
            title="Отдалить"
          >
            −
          </button>
          <button
            type="button"
            className="chart-toolbar-btn"
            onClick={handleResetZoom}
            title="Сбросить зум"
          >
            ⟲
          </button>
          <button
            type="button"
            className="chart-toolbar-btn"
            onClick={handleFullscreen}
            title="На весь экран"
          >
            ⛶
          </button>
          <button
            type="button"
            className="chart-toolbar-btn"
            onClick={handleDownload}
            title="Скачать PNG"
          >
            ⬇
          </button>
        </div>
      </div>

      <div className="chart-container" ref={chartContainerRef}>
        {chartType === "line" || chartType === "area" ? (
          <Line
            ref={chartRef as React.RefObject<ChartJS<"line">>}
            data={lineChartData}
            options={commonOptions}
          />
        ) : chartType === "bar" ? (
          <Bar
            ref={chartRef as React.RefObject<ChartJS<"bar">>}
            data={barChartData}
            options={commonOptions as ChartOptions<"bar">}
          />
        ) : (
          <Chart
            ref={chartRef}
            type="candlestick"
            data={candlestickData}
            options={candlestickOptions}
          />
        )}
      </div>

      {userId > 0 && (
        <ChartAlertsSection userId={userId} selectedSymbol={selectedCurrency} />
      )}
    </div>
  );
}
