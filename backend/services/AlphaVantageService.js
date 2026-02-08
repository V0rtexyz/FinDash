/**
 * AlphaVantageService - Service for fetching stock data from Alpha Vantage API
 */

export default class AlphaVantageService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY;
    this.baseUrl = "https://www.alphavantage.co/query";
  }

  /**
   * Get real-time stock quote
   * @param {string} symbol - Stock symbol (e.g., 'AAPL', 'MSFT')
   * @returns {Promise<Object>}
   */
  async getQuote(symbol) {
    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || data["Note"]) {
        throw new Error(
          data["Error Message"] || data["Note"] || "API limit reached"
        );
      }

      const quote = data["Global Quote"];
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error("No data returned for symbol");
      }

      return {
        success: true,
        symbol: quote["01. symbol"],
        open: parseFloat(quote["02. open"]),
        high: parseFloat(quote["03. high"]),
        low: parseFloat(quote["04. low"]),
        price: parseFloat(quote["05. price"]),
        volume: parseInt(quote["06. volume"]),
        latestTradingDay: quote["07. latest trading day"],
        previousClose: parseFloat(quote["08. previous close"]),
        change: parseFloat(quote["09. change"]),
        changePercent: quote["10. change percent"],
      };
    } catch (error) {
      console.error("AlphaVantageService.getQuote error:", error);
      const mock = this.getMockQuote(symbol);
      return {
        ...mock,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get time series data (daily, weekly, monthly)
   * @param {string} symbol - Stock symbol
   * @param {string} interval - 'daily', 'weekly', 'monthly', 'intraday'
   * @returns {Promise<Object>}
   */
  async getTimeSeries(symbol, interval = "daily") {
    try {
      let functionName = "TIME_SERIES_DAILY";
      if (interval === "weekly") {
        functionName = "TIME_SERIES_WEEKLY";
      } else if (interval === "monthly") {
        functionName = "TIME_SERIES_MONTHLY";
      } else if (interval === "intraday") {
        functionName = "TIME_SERIES_INTRADAY";
      }

      const url = `${
        this.baseUrl
      }?function=${functionName}&symbol=${symbol}&apikey=${this.apiKey}${
        interval === "intraday" ? "&interval=5min" : ""
      }`;

      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || data["Note"]) {
        throw new Error(
          data["Error Message"] || data["Note"] || "API limit reached"
        );
      }

      const timeSeriesKey = Object.keys(data).find((key) =>
        key.includes("Time Series")
      );
      if (!timeSeriesKey) {
        throw new Error("No time series data found");
      }

      const timeSeries = data[timeSeriesKey];
      const metadata = data["Meta Data"] || {};

      return {
        success: true,
        symbol: metadata["2. Symbol"] || symbol,
        interval,
        lastRefreshed: metadata["3. Last Refreshed"],
        timezone: metadata["5. Time Zone"],
        data: this.formatTimeSeriesData(timeSeries),
      };
    } catch (error) {
      console.error("AlphaVantageService.getTimeSeries error:", error);
      return {
        success: false,
        error: error.message,
        data: this.getMockTimeSeries(symbol, interval),
      };
    }
  }

  /**
   * Search for stocks by keyword
   * @param {string} keywords - Search keywords
   * @returns {Promise<Object>}
   */
  async searchSymbol(keywords) {
    try {
      const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || data["Note"]) {
        throw new Error(
          data["Error Message"] || data["Note"] || "API limit reached"
        );
      }

      const bestMatches = data["bestMatches"] || [];

      return {
        success: true,
        matches: bestMatches.map((match) => ({
          symbol: match["1. symbol"],
          name: match["2. name"],
          type: match["3. type"],
          region: match["4. region"],
          marketOpen: match["5. marketOpen"],
          marketClose: match["6. marketClose"],
          timezone: match["7. timezone"],
          currency: match["8. currency"],
        })),
      };
    } catch (error) {
      console.error("AlphaVantageService.searchSymbol error:", error);
      return {
        success: false,
        error: error.message,
        matches: [],
      };
    }
  }

  /**
   * Get multiple stock quotes at once
   * @param {string[]} symbols - Array of stock symbols
   * @returns {Promise<Object>}
   */
  async getMultipleQuotes(symbols) {
    const quotes = {};
    const errors = {};

    // Alpha Vantage has rate limits, so we'll fetch sequentially with delays
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote.success) {
        quotes[symbol] = quote;
      } else {
        errors[symbol] = quote.error;
      }
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return {
      success: Object.keys(quotes).length > 0,
      quotes,
      errors,
    };
  }

  // Helper methods
  formatTimeSeriesData(timeSeries) {
    const formatted = [];
    for (const [date, values] of Object.entries(timeSeries)) {
      formatted.push({
        date,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
        volume: parseInt(values["5. volume"]),
      });
    }
    // Sort by date descending
    return formatted.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getMockQuote(symbol) {
    const basePrice = 100 + Math.random() * 50;
    return {
      success: true,
      symbol,
      open: basePrice,
      high: basePrice * 1.05,
      low: basePrice * 0.95,
      price: basePrice + (Math.random() - 0.5) * 5,
      volume: Math.floor(Math.random() * 1000000),
      latestTradingDay: new Date().toISOString().split("T")[0],
      previousClose: basePrice * 0.98,
      change: basePrice * 0.02,
      changePercent: "2.00%",
    };
  }

  getMockTimeSeries(symbol, interval) {
    const data = [];
    const days = interval === "monthly" ? 12 : interval === "weekly" ? 52 : 30;
    let basePrice = 100;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      basePrice += (Math.random() - 0.5) * 2;

      data.push({
        date: date.toISOString().split("T")[0],
        open: basePrice,
        high: basePrice * 1.03,
        low: basePrice * 0.97,
        close: basePrice + (Math.random() - 0.5) * 1,
        volume: Math.floor(Math.random() * 1000000),
      });
    }

    return data;
  }
}
