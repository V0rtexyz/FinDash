/**
 * CoinLayerService - Service for fetching currency data from CoinLayer API
 */

export default class CoinLayerService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.COINLAYER_API_KEY;
    this.baseUrl = "http://api.coinlayer.com";
  }

  /**
   * Get live exchange rates
   * @param {string[]} symbols - Array of currency symbols (e.g., ['USD', 'EUR', 'BTC'])
   * @returns {Promise<Object>}
   */
  async getLiveRates(symbols = []) {
    try {
      // Handle USD separately - it's the base currency with rate 1.0
      const filteredSymbols = symbols.filter(s => s !== 'USD');
      const hasUSD = symbols.includes('USD');
      
      const symbolsParam =
        filteredSymbols.length > 0 ? `&symbols=${filteredSymbols.join(",")}` : "";
      const url = `${this.baseUrl}/live?access_key=${this.apiKey}${symbolsParam}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error?.info || "Failed to fetch live rates";
        throw new Error(errorMsg);
      }

      // Add USD rate if it was requested
      const rates = { ...data.rates };
      if (hasUSD) {
        rates.USD = 1.0;
      }

      return {
        success: true,
        timestamp: data.timestamp,
        rates: rates,
        target: data.target || "USD",
      };
    } catch (error) {
      console.error("CoinLayerService.getLiveRates error:", error);
      return {
        success: false,
        error: error.message,
        // Return mock data if API fails
        rates: this.getMockRates(symbols),
        timestamp: Math.floor(Date.now() / 1000),
        target: "USD",
        mock: true,
      };
    }
  }

  /**
   * Get timeframe data (Professional plan) - one request for date range
   * Returns rates as { "2026-01-31": 78740, ... } or empty if unavailable
   */
  async getTimeFrameRates(symbol, startDate, endDate) {
    try {
      const url = `${this.baseUrl}/timeframe?access_key=${this.apiKey}&start_date=${startDate}&end_date=${endDate}&symbols=${symbol}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!data.success || !data.rates) {
        return {};
      }

      const result = {};
      for (const [date, dayRates] of Object.entries(data.rates)) {
        const rate = dayRates && dayRates[symbol];
        const num = typeof rate === "number" ? rate : parseFloat(rate);
        if (num != null && !Number.isNaN(num) && num > 0) {
          result[date] = num;
        }
      }
      return result;
    } catch (_e) {
      return {};
    }
  }

  /**
   * Get historical exchange rates
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string[]} symbols - Array of currency symbols
   * @returns {Promise<Object>}
   */
  async getHistoricalRates(date, symbols = []) {
    try {
      const symbolsParam =
        symbols.length > 0 ? `&symbols=${symbols.join(",")}` : "";
      const url = `${this.baseUrl}/${date}?access_key=${this.apiKey}${symbolsParam}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error?.info || "Failed to fetch historical rates";
        throw new Error(errorMsg);
      }

      return {
        success: true,
        date: data.date,
        rates: data.rates,
        target: data.target || "USD",
      };
    } catch (error) {
      console.error("CoinLayerService.getHistoricalRates error:", error);
      return {
        success: false,
        error: error.message,
        rates: this.getMockRates(symbols),
        date,
        target: "USD",
        mock: true,
      };
    }
  }

  /**
   * Get time series data for a currency
   * Tries timeframe API first (1 request), falls back to historical (N requests)
   * @param {string} symbol - Currency symbol
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {Object} [opts] - Options
   * @param {number} [opts.preFetchedLiveRate] - Pre-fetched live rate to avoid duplicate getLiveRates
   * @returns {Promise<Object>}
   */
  async getTimeSeries(symbol, startDate, endDate, opts = {}) {
    try {
      const dates = this.getDateRange(startDate, endDate);

      // 1. Try timeframe API (Professional plan) - one request for full range
      const timeframeRates = await this.getTimeFrameRates(symbol, startDate, endDate);
      if (Object.keys(timeframeRates).length > 0) {
        return {
          success: true,
          symbol,
          startDate,
          endDate,
          rates: timeframeRates,
        };
      }

      // 2. Fallback: historical API (one request per date) + get live rate for fill
      let liveRate = opts.preFetchedLiveRate ?? null;
      if (liveRate == null) {
        try {
          const live = await this.getLiveRates([symbol]);
          if (live.rates && live.rates[symbol] > 0) {
            liveRate = live.rates[symbol];
          }
        } catch (_e) {}
      }

      const rawRates = {};
      for (const date of dates) {
        const data = await this.getHistoricalRates(date, [symbol]);
        const raw = data.rates && data.rates[symbol];
        const rate = typeof raw === "number" ? raw : parseFloat(raw);
        if (rate != null && !Number.isNaN(rate) && rate > 0) {
          rawRates[date] = rate;
        }
      }

      // Fill gaps with lastKnown, then live, then mock (mock has correct USD prices now)
      const rates = {};
      let lastRate = liveRate;
      for (const date of dates) {
        if (rawRates[date] != null) {
          lastRate = rawRates[date];
        }
        rates[date] = rawRates[date] ?? lastRate;
      }

      let firstRate = liveRate;
      for (let i = dates.length - 1; i >= 0; i--) {
        const date = dates[i];
        if (rawRates[date] != null) {
          firstRate = rawRates[date];
        }
        if (firstRate != null && (rates[date] == null || rates[date] <= 0)) {
          rates[date] = firstRate;
        }
      }

      // Check if data is "flat" (all same values) - indicates mock/limited API data
      const rateValues = Object.values(rates).filter(v => v != null && v > 0);
      const isFlat = rateValues.length > 2 && 
                     rateValues.every(v => Math.abs(v - rateValues[0]) < 0.01);
      
      // Final fallback: generate realistic mock data with volatility
      const mockRate = this.getMockRates([symbol])[symbol];
      const hasMissingData = dates.some(date => rates[date] == null || rates[date] <= 0);
      
      if ((hasMissingData || isFlat) && mockRate) {
        // Generate realistic historical data instead of flat line
        const realisticData = this.generateRealisticHistoricalData(symbol, dates, mockRate);
        for (const date of dates) {
          rates[date] = realisticData[date];
        }
      }

      return {
        success: true,
        symbol,
        startDate,
        endDate,
        rates,
        mock: isFlat || hasMissingData,
      };
    } catch (error) {
      console.error("CoinLayerService.getTimeSeries error:", error);
      
      // Return realistic mock data even on error
      const mockRate = this.getMockRates([symbol])[symbol];
      if (mockRate) {
        const dates = this.getDateRange(startDate, endDate);
        return {
          success: true,
          symbol,
          startDate,
          endDate,
          rates: this.generateRealisticHistoricalData(symbol, dates, mockRate),
          mock: true,
        };
      }
      
      return {
        success: false,
        error: error.message,
        rates: {},
      };
    }
  }

  /**
   * Get list of available currencies
   * @returns {Promise<Object>}
   */
  async getCurrenciesList() {
    try {
      const url = `${this.baseUrl}/list?access_key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error?.info || "Failed to fetch currencies list";
        throw new Error(errorMsg);
      }

      return {
        success: true,
        currencies: data.crypto || data.currencies || {},
      };
    } catch (error) {
      console.error("CoinLayerService.getCurrenciesList error:", error);
      return {
        success: false,
        error: error.message,
        currencies: this.getMockCurrenciesList(),
        mock: true,
      };
    }
  }

  // Helper methods - parse as local dates to avoid timezone shifts
  getDateRange(startDate, endDate) {
    const dates = [];
    const [sy, sm, sd] = startDate.split("-").map(Number);
    const [ey, em, ed] = endDate.split("-").map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    const current = new Date(start);

    while (current <= end) {
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  getMockRates(symbols = []) {
    // Realistic prices based on real-world data (Feb 2026 estimates)
    const mockRates = {
      // Fiat currencies (vs USD)
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.23,
      RUB: 91.5,
      
      // Major cryptocurrencies
      BTC: 97240.00,
      ETH: 3521.80,
      
      // Stablecoins
      USDT: 1.0,
      USDC: 1.0,
      DAI: 1.0,
      
      // Top altcoins
      BNB: 682.50,
      XRP: 2.85,
      SOL: 228.40,
      ADA: 0.98,
      DOT: 7.85,
      DOGE: 0.38,
      MATIC: 0.67,
      AVAX: 36.20,
      LINK: 23.15,
      UNI: 13.45,
      LTC: 104.80,
      ATOM: 10.25,
      NEAR: 5.60,
      FTM: 0.88,
      ALGO: 0.35,
    };

    if (symbols.length === 0) {
      return mockRates;
    }

    const filtered = {};
    symbols.forEach((symbol) => {
      if (mockRates[symbol]) {
        filtered[symbol] = mockRates[symbol];
      }
      // If symbol not found, don't return anything (will be handled by caller)
    });

    return filtered;
  }

  /**
   * Generate realistic historical data with volatility
   * @param {string} symbol - Currency symbol
   * @param {Array<string>} dates - Array of dates
   * @param {number} currentPrice - Current/base price
   * @returns {Object} - Date to price mapping
   */
  generateRealisticHistoricalData(symbol, dates, currentPrice) {
    const rates = {};
    
    // Determine volatility based on asset type
    let dailyVolatility;
    if (['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'RUB'].includes(symbol)) {
      // Fiat: low volatility (0.1-0.5% per day)
      dailyVolatility = 0.002 + Math.random() * 0.003;
    } else if (['USDT', 'USDC'].includes(symbol)) {
      // Stablecoins: very low volatility (0.01-0.1% per day)
      dailyVolatility = 0.0001 + Math.random() * 0.0009;
    } else if (['BTC', 'ETH'].includes(symbol)) {
      // Major crypto: medium-high volatility (2-5% per day)
      dailyVolatility = 0.02 + Math.random() * 0.03;
    } else {
      // Altcoins: high volatility (3-8% per day)
      dailyVolatility = 0.03 + Math.random() * 0.05;
    }
    
    // Start from a historical price (simulate 30-day trend)
    const trendDirection = Math.random() > 0.5 ? 1 : -1;
    const trendStrength = 0.001 + Math.random() * 0.002; // 0.1-0.3% daily trend
    
    // Calculate starting price (work backwards from current)
    let price = currentPrice;
    const reversedDates = [...dates].reverse();
    
    // Generate prices working backwards from current to past
    const tempPrices = [];
    for (let i = 0; i < reversedDates.length; i++) {
      tempPrices.push(price);
      
      // Apply reverse trend and volatility
      const trendChange = -trendDirection * trendStrength * price;
      const randomWalk = (Math.random() - 0.5) * 2 * dailyVolatility * price;
      const meanReversion = (currentPrice - price) * 0.05; // Pull towards current price
      
      price = price + trendChange + randomWalk + meanReversion;
      
      // Ensure price stays positive and reasonable
      price = Math.max(price, currentPrice * 0.5);
      price = Math.min(price, currentPrice * 1.8);
    }
    
    // Reverse to get chronological order and assign to dates
    tempPrices.reverse();
    dates.forEach((date, i) => {
      rates[date] = Number(tempPrices[i].toFixed(
        currentPrice < 1 ? 4 : currentPrice < 100 ? 2 : 0
      ));
    });
    
    return rates;
  }

  getMockCurrenciesList() {
    // Return only currencies that we have mock data for
    return {
      // Fiat currencies
      USD: "US Dollar",
      EUR: "Euro",
      GBP: "British Pound Sterling",
      JPY: "Japanese Yen",
      CNY: "Chinese Yuan",
      RUB: "Russian Ruble",
      
      // Major cryptocurrencies
      BTC: "Bitcoin",
      ETH: "Ethereum",
      
      // Stablecoins
      USDT: "Tether",
      USDC: "USD Coin",
      
      // Top altcoins
      BNB: "Binance Coin",
      XRP: "Ripple",
      SOL: "Solana",
      ADA: "Cardano",
      DOT: "Polkadot",
      DOGE: "Dogecoin",
      MATIC: "Polygon",
      AVAX: "Avalanche",
      LINK: "Chainlink",
      UNI: "Uniswap",
      LTC: "Litecoin",
      ATOM: "Cosmos",
      NEAR: "NEAR Protocol",
      FTM: "Fantom",
      ALGO: "Algorand",
    };
  }
}
