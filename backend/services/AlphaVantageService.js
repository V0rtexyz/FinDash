/**
 * AlphaVantageService - Service for fetching stock data from Alpha Vantage API
 */

export default class AlphaVantageService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.ALPHA_VANTAGE_API_KEY;
    this.baseUrl = "https://www.alphavantage.co/query";
    this.apiLimitReached = false; // Flag to avoid repeated API calls when limit is reached
  }

  /**
   * Get real-time stock quote
   * @param {string} symbol - Stock symbol (e.g., 'AAPL', 'MSFT')
   * @returns {Promise<Object>}
   */
  async getQuote(symbol) {
    try {
      // If API limit was reached, skip API call and use mock data
      if (this.apiLimitReached) {
        const mock = this.getMockQuote(symbol);
        return {
          ...mock,
          mock: true,
        };
      }

      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || data["Note"]) {
        const errorMsg = data["Error Message"] || data["Note"] || "API limit reached";
        // Check if it's a rate limit error
        if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("frequency")) {
          this.apiLimitReached = true;
          console.warn("Alpha Vantage API limit reached. Using mock data.");
        }
        throw new Error(errorMsg);
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
      if (!this.apiLimitReached) {
        console.error("AlphaVantageService.getQuote error:", error);
      }
      const mock = this.getMockQuote(symbol);
      return {
        ...mock,
        success: false,
        error: error.message,
        mock: true,
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
      // If API limit was reached, skip API call and use mock data
      if (this.apiLimitReached) {
        return {
          success: true,
          symbol,
          data: this.getMockTimeSeries(symbol, interval),
          mock: true,
        };
      }

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
        const errorMsg = data["Error Message"] || data["Note"] || "API limit reached";
        // Check if it's a rate limit error
        if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("frequency")) {
          this.apiLimitReached = true;
          console.warn("Alpha Vantage API limit reached. Using mock data.");
        }
        throw new Error(errorMsg);
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
      if (!this.apiLimitReached) {
        console.error("AlphaVantageService.getTimeSeries error:", error);
      }
      return {
        success: false,
        error: error.message,
        data: this.getMockTimeSeries(symbol, interval),
        mock: true,
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
      // If API limit was reached, return empty results
      if (this.apiLimitReached) {
        return {
          success: true,
          matches: [],
          mock: true,
        };
      }

      const url = `${this.baseUrl}?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data["Error Message"] || data["Note"]) {
        const errorMsg = data["Error Message"] || data["Note"] || "API limit reached";
        // Check if it's a rate limit error
        if (errorMsg.includes("limit") || errorMsg.includes("premium") || errorMsg.includes("frequency")) {
          this.apiLimitReached = true;
          console.warn("Alpha Vantage API limit reached. Using mock data.");
        }
        throw new Error(errorMsg);
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
      if (!this.apiLimitReached) {
        console.error("AlphaVantageService.searchSymbol error:", error);
      }
      return {
        success: false,
        error: error.message,
        matches: [],
        mock: true,
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

  getRealisticStockPrice(symbol) {
    // Realistic stock prices for major companies (Feb 2026 estimates)
    const knownPrices = {
      AAPL: 245.80,
      MSFT: 435.20,
      GOOGL: 178.50,
      AMZN: 198.75,
      TSLA: 215.40,
      META: 520.30,
      NVDA: 1240.00,
      AMD: 195.60,
      NFLX: 685.20,
      INTC: 48.90,
      IBM: 185.40,
      ORCL: 142.80,
      CRM: 305.50,
      ADBE: 580.20,
      PYPL: 68.45,
      SQ: 85.30,
      UBER: 78.90,
      ABNB: 148.75,
      SHOP: 85.60,
      COIN: 248.30,
    };
    
    return knownPrices[symbol] || (50 + Math.random() * 200);
  }

  getMockQuote(symbol) {
    const basePrice = this.getRealisticStockPrice(symbol);
    const dailyChange = (Math.random() - 0.5) * 0.04; // ±2% daily change
    const currentPrice = basePrice * (1 + dailyChange);
    const previousClose = basePrice;
    
    const dayVolatility = 0.015; // 1.5% intraday range
    const open = previousClose * (1 + (Math.random() - 0.5) * dayVolatility);
    const high = Math.max(open, currentPrice) * (1 + Math.random() * dayVolatility / 2);
    const low = Math.min(open, currentPrice) * (1 - Math.random() * dayVolatility / 2);
    
    const change = currentPrice - previousClose;
    const changePercent = ((change / previousClose) * 100).toFixed(2) + "%";
    
    return {
      success: true,
      symbol,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      price: Number(currentPrice.toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 50000000),
      latestTradingDay: new Date().toISOString().split("T")[0],
      previousClose: Number(previousClose.toFixed(2)),
      change: Number(change.toFixed(2)),
      changePercent: changePercent,
    };
  }

  getMockTimeSeries(symbol, interval) {
    const data = [];
    const days = interval === "monthly" ? 365 : interval === "weekly" ? 90 : 30;
    const currentPrice = this.getRealisticStockPrice(symbol);
    
    // Stock volatility: ~1-2% per day
    const dailyVolatility = 0.015 + Math.random() * 0.01;
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const trendStrength = 0.001; // 0.1% daily trend
    
    // Calculate starting price (work backwards)
    let price = currentPrice;
    const tempPrices = [];
    
    for (let i = 0; i <= days; i++) {
      tempPrices.push(price);
      
      // Apply trend and random walk
      const trendChange = -trendDirection * trendStrength * price;
      const randomWalk = (Math.random() - 0.5) * 2 * dailyVolatility * price;
      const meanReversion = (currentPrice - price) * 0.03;
      
      price = price + trendChange + randomWalk + meanReversion;
      price = Math.max(price, currentPrice * 0.7);
      price = Math.min(price, currentPrice * 1.4);
    }
    
    tempPrices.reverse();
    
    // Generate OHLC data for each day
    for (let i = 0; i < tempPrices.length; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - i));
      
      const closePrice = tempPrices[i];
      const intradayVolatility = dailyVolatility * 0.6; // Intraday is less than daily
      
      const open = closePrice * (1 + (Math.random() - 0.5) * intradayVolatility);
      const high = Math.max(open, closePrice) * (1 + Math.random() * intradayVolatility / 2);
      const low = Math.min(open, closePrice) * (1 - Math.random() * intradayVolatility / 2);
      
      data.push({
        date: date.toISOString().split("T")[0],
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(closePrice.toFixed(2)),
        volume: Math.floor(1000000 + Math.random() * 30000000),
      });
    }
    
    return data;
  }
}
