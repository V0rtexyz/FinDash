import { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { useCurrency } from "../context/CurrencyContext";
import { UpdateGraphicsService } from "../services/UpdateGraphicsService";
import "../styles/ChartsView.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function ChartsView() {
  const { currencies, selectedCurrency } = useCurrency();
  const chartRef = useRef<ChartJS<"line">>(null);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update("none");
    }
  }, [currencies, selectedCurrency]);

  const selectedData = selectedCurrency
    ? currencies.get(selectedCurrency)
    : undefined;
  const chartData = UpdateGraphicsService.formatChartData(selectedData);

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750,
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#1a202c",
          font: {
            size: 14,
            weight: "bold",
          },
        },
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
        displayColors: true,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label +=
                "$" +
                context.parsed.y.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#718096",
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          color: "#718096",
          callback: function (value) {
            return "$" + value.toLocaleString("en-US");
          },
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  if (!selectedCurrency) {
    return (
      <div className="charts-view">
        <div className="chart-container">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>Выберите валюту</h3>
            <p>Добавьте и выберите валюту для отображения графика</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedData) {
    return (
      <div className="charts-view">
        <div className="chart-container">
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Загрузка данных...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="charts-view">
      <div className="chart-header">
        <h3 className="chart-title">График цены {selectedData.name}</h3>
        <div className="chart-info">
          <span className="current-price">
            $
            {selectedData.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={`price-change ${
              selectedData.change24h >= 0 ? "positive" : "negative"
            }`}
          >
            {selectedData.change24h >= 0 ? "↑" : "↓"}{" "}
            {Math.abs(selectedData.change24h).toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="chart-container">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
