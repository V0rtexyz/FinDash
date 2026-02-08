export interface CurrencyData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  timestamp: number;
  history: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

interface CurrencyInfo {
  symbol: string;
  name: string;
}

interface RatesResponse {
  success: boolean;
  rates: Record<string, number>;
  timestamp?: number;
  target?: string;
  error?: string;
}

interface TimeSeriesResponse {
  success: boolean;
  symbol: string;
  startDate: string;
  endDate: string;
  rates: Array<{ date: string; rate: number }>;
  error?: string;
}

const API_BASE_URL = "/api";

class CurrencyAPIService {
  async fetchCurrencyData(
    symbol: string,
    name?: string
  ): Promise<CurrencyData> {
    try {
      // Get current rate
      const ratesResponse = await fetch(
        `${API_BASE_URL}/currencies/rates?symbols=${symbol}`
      );

      if (!ratesResponse.ok) {
        throw new Error(`Failed to fetch rate for ${symbol}`);
      }

      const ratesData: RatesResponse = await ratesResponse.json();

      // Check if rates exist (even if success is false, mock data might be available)
      if (!ratesData.rates || !ratesData.rates[symbol]) {
        throw new Error(`Currency ${symbol} not found or unavailable`);
      }

      const currentPrice = ratesData.rates[symbol];
      const timestamp = ratesData.timestamp || Date.now();

      // Get historical data for the last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      let history: PricePoint[] = [];
      let change24h = 0;

      try {
        const timeseriesResponse = await fetch(
          `${API_BASE_URL}/currencies/timeseries/${symbol}?startDate=${startDateStr}&endDate=${endDateStr}`
        );

        if (timeseriesResponse.ok) {
          const timeseriesData: TimeSeriesResponse =
            await timeseriesResponse.json();

          if (timeseriesData.success && timeseriesData.rates) {
            history = timeseriesData.rates.map((point) => ({
              timestamp: new Date(point.date).getTime(),
              price: point.rate,
            }));

            // Calculate 24h change
            if (history.length >= 2) {
              const yesterdayPrice = history[history.length - 2].price;
              change24h =
                ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100;
            }
          }
        }
      } catch (err) {
        console.warn(
          "Failed to fetch historical data, generating daily data",
          err
        );
        // Fallback: generate daily data for the last 30 days
        history = [];
        const daysBack = 30;
        let dayPrice = currentPrice;

        for (let i = daysBack; i >= 0; i--) {
          const dayTimestamp = timestamp - i * 86400000; // i days ago
          // Add some variance to make the chart more interesting
          const variance = (Math.random() - 0.5) * 0.05; // ±2.5% variance
          dayPrice = dayPrice * (1 + variance);

          history.push({
            timestamp: dayTimestamp,
            price: dayPrice,
          });
        }
      }

      // Используем переданное имя валюты или символ как fallback
      return {
        symbol,
        name: name || symbol,
        price: currentPrice,
        change24h,
        timestamp,
        history:
          history.length > 0
            ? history
            : (() => {
                // Generate 30 days of data if no history
                const fallbackHistory: PricePoint[] = [];
                let dayPrice = currentPrice;
                for (let i = 30; i >= 0; i--) {
                  const dayTimestamp = timestamp - i * 86400000;
                  const variance = (Math.random() - 0.5) * 0.05;
                  dayPrice = dayPrice * (1 + variance);
                  fallbackHistory.push({
                    timestamp: dayTimestamp,
                    price: dayPrice,
                  });
                }
                return fallbackHistory;
              })(),
      };
    } catch (error) {
      console.error("Error fetching currency data:", error);
      throw error;
    }
  }

  async fetchCurrencyDataForReport(
    symbol: string,
    startDate: Date,
    endDate: Date,
    name?: string
  ): Promise<CurrencyData> {
    try {
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Получаем текущий курс и исторические данные
      const [ratesResponse, timeseriesResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/currencies/rates?symbols=${symbol}`),
        fetch(
          `${API_BASE_URL}/currencies/timeseries/${symbol}?startDate=${startDateStr}&endDate=${endDateStr}`
        ),
      ]);

      if (!ratesResponse.ok) {
        throw new Error(`Failed to fetch rate for ${symbol}`);
      }

      const ratesData: RatesResponse = await ratesResponse.json();

      // Check if rates exist (even if success is false, mock data might be available)
      if (!ratesData.rates || !ratesData.rates[symbol]) {
        throw new Error(`Currency ${symbol} not found or unavailable`);
      }

      const currentPrice = ratesData.rates[symbol];
      const timestamp = ratesData.timestamp || Date.now();

      let history: PricePoint[] = [];
      let change24h = 0;

      if (timeseriesResponse.ok) {
        const timeseriesData: TimeSeriesResponse =
          await timeseriesResponse.json();

        if (timeseriesData.success && timeseriesData.rates) {
          history = timeseriesData.rates.map((point) => ({
            timestamp: new Date(point.date).getTime(),
            price: point.rate,
          }));

          // Calculate change based on period
          if (history.length >= 2) {
            const firstPrice = history[0].price;
            change24h = ((currentPrice - firstPrice) / firstPrice) * 100;
          }
        }
      }

      return {
        symbol,
        name: name || symbol,
        price: currentPrice,
        change24h,
        timestamp,
        history,
      };
    } catch (error) {
      console.error("Error fetching report data:", error);
      throw error;
    }
  }

  async fetchAvailableCurrencies(): Promise<CurrencyInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/currencies`);

      if (!response.ok) {
        throw new Error("Failed to fetch available currencies");
      }

      const data = await response.json();

      if (data.success && data.currencies) {
        // Convert backend format to frontend format
        // Handle both object and array formats
        if (Array.isArray(data.currencies)) {
          return data.currencies
            .map((item: any) => ({
              symbol:
                typeof item === "string"
                  ? item
                  : item.symbol || item.code || "",
              name:
                typeof item === "string"
                  ? item
                  : item.name ||
                    item.name_full ||
                    item.symbol ||
                    item.code ||
                    "",
            }))
            .filter((item: CurrencyInfo) => item.symbol && item.name);
        } else if (
          typeof data.currencies === "object" &&
          data.currencies !== null
        ) {
          // If it's an object, convert to array
          // Handle both {BTC: "Bitcoin"} and {BTC: {name: "Bitcoin", ...}} formats
          return Object.entries(data.currencies)
            .map(([symbol, value]: [string, any]) => {
              if (typeof value === "string") {
                return { symbol, name: value };
              } else if (typeof value === "object" && value !== null) {
                return {
                  symbol,
                  name: value.name || value.name_full || value.symbol || symbol,
                };
              }
              return { symbol, name: symbol };
            })
            .filter((item: CurrencyInfo) => item.symbol && item.name);
        }
      }

      // Fallback to common currencies if API fails
      return [
        { symbol: "BTC", name: "Bitcoin" },
        { symbol: "ETH", name: "Ethereum" },
        { symbol: "USDT", name: "Tether" },
        { symbol: "BNB", name: "Binance Coin" },
        { symbol: "XRP", name: "Ripple" },
        { symbol: "SOL", name: "Solana" },
        { symbol: "ADA", name: "Cardano" },
      ];
    } catch (error) {
      console.error("Error fetching available currencies:", error);
      // Return fallback currencies
      return [
        { symbol: "BTC", name: "Bitcoin" },
        { symbol: "ETH", name: "Ethereum" },
        { symbol: "USDT", name: "Tether" },
        { symbol: "BNB", name: "Binance Coin" },
        { symbol: "XRP", name: "Ripple" },
        { symbol: "SOL", name: "Solana" },
        { symbol: "ADA", name: "Cardano" },
      ];
    }
  }
}

export type ChartPeriod = "1D" | "1W" | "1M" | "1Y" | "ALL";

export function getDateRangeForPeriod(
  period: ChartPeriod
): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date(endDate);

  switch (period) {
    case "1D":
      startDate.setDate(startDate.getDate() - 1);
      break;
    case "1W":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "1M":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "1Y":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    case "ALL":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setMonth(startDate.getMonth() - 1);
  }

  return { startDate, endDate };
}

export const CurrencyAPI = new CurrencyAPIService();
