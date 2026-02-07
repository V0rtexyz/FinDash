/**
 * CoinLayerService - Service for fetching currency data from CoinLayer API
 */

export default class CoinLayerService {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.COINLAYER_API_KEY;
    this.baseUrl = "https://api.coinlayer.com";
  }

  /**
   * Get live exchange rates
   * @param {string[]} symbols - Array of currency symbols (e.g., ['USD', 'EUR', 'BTC'])
   * @returns {Promise<Object>}
   */
  async getLiveRates(symbols = []) {
    try {
      const symbolsParam =
        symbols.length > 0 ? `&symbols=${symbols.join(",")}` : "";
      const url = `${this.baseUrl}/live?access_key=${this.apiKey}${symbolsParam}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.info || "Failed to fetch live rates");
      }

      return {
        success: true,
        timestamp: data.timestamp,
        rates: data.rates,
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
      };
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
        throw new Error(data.error?.info || "Failed to fetch historical rates");
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
      };
    }
  }

  /**
   * Get time series data for a currency
   * @param {string} symbol - Currency symbol
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @returns {Promise<Object>}
   */
  async getTimeSeries(symbol, startDate, endDate) {
    try {
      // CoinLayer doesn't have direct time series, so we'll fetch multiple historical dates
      const dates = this.getDateRange(startDate, endDate);
      const rates = {};

      for (const date of dates) {
        const data = await this.getHistoricalRates(date, [symbol]);
        if (data.success) {
          rates[date] = data.rates[symbol] || null;
        }
      }

      return {
        success: true,
        symbol,
        startDate,
        endDate,
        rates,
      };
    } catch (error) {
      console.error("CoinLayerService.getTimeSeries error:", error);
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
        throw new Error(data.error?.info || "Failed to fetch currencies list");
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
      };
    }
  }

  // Helper methods
  getDateRange(startDate, endDate) {
    const dates = [];

    // Парсим даты явно в UTC для избежания проблем с часовыми поясами
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    const current = new Date(start);

    while (current <= end) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, "0");
      const day = String(current.getUTCDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);

      // Используем UTC методы для избежания проблем с переходом на летнее время
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  getMockRates(symbols = []) {
    const mockRates = {
      USD: 1.0,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110.0,
      CNY: 6.45,
      BTC: 0.000023,
      ETH: 0.00035,
    };

    if (symbols.length === 0) {
      return mockRates;
    }

    const filtered = {};
    symbols.forEach((symbol) => {
      if (mockRates[symbol]) {
        filtered[symbol] = mockRates[symbol];
      }
    });

    return filtered;
  }

  getMockCurrenciesList() {
    return {
      USD: "US Dollar",
      EUR: "Euro",
      GBP: "British Pound",
      JPY: "Japanese Yen",
      CNY: "Chinese Yuan",
      BTC: "Bitcoin",
      ETH: "Ethereum",
    };
  }
}
