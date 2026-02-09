/**
 * Web Worker для обработки данных отчетов
 * Выполняет тяжелые вычисления в отдельном потоке, не блокируя UI
 */

// Типы сообщений
interface WorkerMessage {
  type: "processReportData" | "calculateStatistics";
  payload: any;
}

interface WorkerResponse {
  type: "success" | "error";
  data?: any;
  error?: string;
}

// Обработка сообщений от главного потока
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case "processReportData":
        processReportData(payload);
        break;
      case "calculateStatistics":
        calculateStatistics(payload);
        break;
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
    self.postMessage(response);
  }
};

/**
 * Обработка данных отчета - форматирование, расчеты, агрегация
 */
function processReportData(payload: any) {
  const { currencies, startDate, endDate } = payload;

  // Симуляция тяжелых вычислений
  const processedData = currencies.map((currency: any) => {
    // Расчет статистики по каждой валюте
    const stats = {
      symbol: currency.symbol,
      name: currency.name,
      avgPrice: calculateAverage(currency.history),
      minPrice: Math.min(...currency.history.map((h: any) => h.price)),
      maxPrice: Math.max(...currency.history.map((h: any) => h.price)),
      volatility: calculateVolatility(currency.history),
      trend: calculateTrend(currency.history),
      changePercent: calculateChangePercent(currency.history),
    };

    return stats;
  });

  // Общая статистика портфеля
  const portfolioStats = {
    totalCurrencies: processedData.length,
    avgVolatility: calculateAverage(
      processedData.map((d: any) => d.volatility)
    ),
    positiveChanges: processedData.filter((d: any) => d.changePercent > 0)
      .length,
    negativeChanges: processedData.filter((d: any) => d.changePercent < 0)
      .length,
  };

  const response: WorkerResponse = {
    type: "success",
    data: {
      currencies: processedData,
      portfolio: portfolioStats,
      generatedAt: new Date().toISOString(),
    },
  };

  self.postMessage(response);
}

/**
 * Расчет расширенной статистики
 */
function calculateStatistics(payload: any) {
  const { timeSeries } = payload;

  const stats = {
    mean: calculateAverage(timeSeries),
    median: calculateMedian(timeSeries),
    stdDev: calculateStdDev(timeSeries),
    min: Math.min(...timeSeries),
    max: Math.max(...timeSeries),
    range: Math.max(...timeSeries) - Math.min(...timeSeries),
  };

  const response: WorkerResponse = {
    type: "success",
    data: stats,
  };

  self.postMessage(response);
}

// Вспомогательные функции для расчетов

function calculateAverage(data: number[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
}

function calculateMedian(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateStdDev(data: number[]): number {
  if (data.length === 0) return 0;
  const mean = calculateAverage(data);
  const squaredDiffs = data.map((val) => Math.pow(val - mean, 2));
  const variance = calculateAverage(squaredDiffs);
  return Math.sqrt(variance);
}

function calculateVolatility(history: any[]): number {
  if (history.length < 2) return 0;
  const prices = history.map((h) => h.price);
  return calculateStdDev(prices);
}

function calculateTrend(history: any[]): "up" | "down" | "stable" {
  if (history.length < 2) return "stable";
  const firstPrice = history[0].price;
  const lastPrice = history[history.length - 1].price;
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;

  if (change > 1) return "up";
  if (change < -1) return "down";
  return "stable";
}

function calculateChangePercent(history: any[]): number {
  if (history.length < 2) return 0;
  const firstPrice = history[0].price;
  const lastPrice = history[history.length - 1].price;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

// Экспорт для TypeScript
export {};

