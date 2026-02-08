import { CurrencyData, PricePoint } from "./CurrencyAPI";

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
    fill?: boolean;
  }[];
}

export interface CandlestickPoint {
  x: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface CandlestickChartData {
  datasets: {
    label: string;
    data: CandlestickPoint[];
  }[];
}

class UpdateGraphicsServiceClass {
  formatChartData(currencyData: CurrencyData | undefined): ChartData {
    if (!currencyData) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Group data by day and get average price per day
    const dailyData = new Map<
      string,
      { prices: number[]; timestamp: number }
    >();

    currencyData.history.forEach((point) => {
      const date = new Date(point.timestamp);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { prices: [], timestamp: point.timestamp });
      }
      dailyData.get(dateKey)!.prices.push(point.price);
    });

    // Sort by date and calculate average price per day
    const sortedDates = Array.from(dailyData.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );

    const labels = sortedDates.map(([dateKey]) => {
      const date = new Date(dateKey);
      return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
      });
    });

    const data = sortedDates.map(([, dayData]) => {
      // Use average price for the day
      const avgPrice =
        dayData.prices.reduce((sum, p) => sum + p, 0) / dayData.prices.length;
      return avgPrice;
    });

    return {
      labels,
      datasets: [
        {
          label: `${currencyData.name} (${currencyData.symbol})`,
          data,
          borderColor: "rgba(102, 126, 234, 1)",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }

  formatMultiChartData(currencies: CurrencyData[]): ChartData {
    if (currencies.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const colors = [
      "rgba(102, 126, 234, 1)",
      "rgba(118, 75, 162, 1)",
      "rgba(72, 187, 120, 1)",
      "rgba(237, 137, 54, 1)",
      "rgba(214, 48, 49, 1)",
    ];

    const maxLength = Math.max(...currencies.map((c) => c.history.length));
    const labels = currencies[0].history.map((point) =>
      new Date(point.timestamp).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    const datasets = currencies.map((currency, index) => ({
      label: `${currency.name} (${currency.symbol})`,
      data: currency.history.map((point) => point.price),
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length].replace("1)", "0.1)"),
      tension: 0.4,
      fill: false,
    }));

    return {
      labels,
      datasets,
    };
  }

  calculateNormalizedData(currencies: CurrencyData[]): ChartData {
    if (currencies.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const colors = [
      "rgba(102, 126, 234, 1)",
      "rgba(118, 75, 162, 1)",
      "rgba(72, 187, 120, 1)",
      "rgba(237, 137, 54, 1)",
      "rgba(214, 48, 49, 1)",
    ];

    const labels = currencies[0].history.map((point) =>
      new Date(point.timestamp).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );

    const datasets = currencies.map((currency, index) => {
      const firstPrice = currency.history[0].price;
      const normalizedData = currency.history.map(
        (point) => ((point.price - firstPrice) / firstPrice) * 100
      );

      return {
        label: `${currency.name} (${currency.symbol})`,
        data: normalizedData,
        borderColor: colors[index % colors.length],
        backgroundColor: colors[index % colors.length].replace("1)", "0.1)"),
        tension: 0.4,
        fill: false,
      };
    });

    return {
      labels,
      datasets,
    };
  }

  formatCandlestickData(currencyData: CurrencyData | undefined): CandlestickChartData {
    if (!currencyData || !currencyData.history.length) {
      return { datasets: [] };
    }

    const dailyMap = new Map<
      string,
      { o: number; h: number; l: number; c: number; x: number }
    >();

    currencyData.history.forEach((point) => {
      const date = new Date(point.timestamp);
      const dateKey = date.toISOString().split("T")[0];
      const existing = dailyMap.get(dateKey);

      if (!existing) {
        dailyMap.set(dateKey, {
          o: point.price,
          h: point.price,
          l: point.price,
          c: point.price,
          x: date.getTime(),
        });
      } else {
        existing.h = Math.max(existing.h, point.price);
        existing.l = Math.min(existing.l, point.price);
        existing.c = point.price;
      }
    });

    const sorted = Array.from(dailyMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    );
    const data: CandlestickPoint[] = sorted.map(([, v]) => ({
      x: v.x,
      o: v.o,
      h: v.h,
      l: v.l,
      c: v.c,
    }));

    return {
      datasets: [
        {
          label: `${currencyData.name} (${currencyData.symbol})`,
          data,
        },
      ],
    };
  }
}

export const UpdateGraphicsService = new UpdateGraphicsServiceClass();
