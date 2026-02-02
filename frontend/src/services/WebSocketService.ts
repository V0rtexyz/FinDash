import { CurrencyData, PricePoint } from "./CurrencyAPI";

type MessageHandler = (data: CurrencyData) => void;

class WebSocketServiceClass {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private lastPrices: Map<string, number> = new Map();

  subscribe(symbol: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(symbol)) {
      this.handlers.set(symbol, new Set());
    }

    this.handlers.get(symbol)!.add(handler);

    if (!this.intervals.has(symbol)) {
      this.startUpdates(symbol);
    }

    return () => {
      const handlers = this.handlers.get(symbol);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.stopUpdates(symbol);
        }
      }
    };
  }

  private startUpdates(symbol: string) {
    const basePrice = this.lastPrices.get(symbol) || this.getBasePrice(symbol);
    let currentPrice = basePrice;

    const interval = setInterval(() => {
      const volatility = 0.005;
      const change = (Math.random() - 0.5) * 2 * volatility;
      currentPrice = currentPrice * (1 + change);

      const previousPrice = this.lastPrices.get(symbol) || currentPrice;
      const change24h = ((currentPrice - previousPrice) / previousPrice) * 100;

      this.lastPrices.set(symbol, currentPrice);

      const data: CurrencyData = {
        symbol,
        name: this.getCurrencyName(symbol),
        price: currentPrice,
        change24h,
        timestamp: Date.now(),
        history: this.generateRecentHistory(currentPrice),
      };

      const handlers = this.handlers.get(symbol);
      if (handlers) {
        handlers.forEach((handler) => handler(data));
      }
    }, 2000);

    this.intervals.set(symbol, interval);
  }

  private stopUpdates(symbol: string) {
    const interval = this.intervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(symbol);
    }
    this.handlers.delete(symbol);
  }

  private getBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 45000,
      ETH: 2500,
      USDT: 1,
      BNB: 350,
      XRP: 0.6,
      SOL: 100,
      ADA: 0.5,
    };
    return prices[symbol] || 100;
  }

  private getCurrencyName(symbol: string): string {
    const names: Record<string, string> = {
      BTC: "Bitcoin",
      ETH: "Ethereum",
      USDT: "Tether",
      BNB: "Binance Coin",
      XRP: "Ripple",
      SOL: "Solana",
      ADA: "Cardano",
    };
    return names[symbol] || symbol;
  }

  private generateRecentHistory(currentPrice: number): PricePoint[] {
    const history: PricePoint[] = [];
    const now = Date.now();

    for (let i = 19; i >= 0; i--) {
      const variance = (Math.random() - 0.5) * 0.02;
      history.push({
        timestamp: now - i * 60000,
        price: currentPrice * (1 + variance),
      });
    }

    return history;
  }

  disconnect() {
    this.intervals.forEach((interval, symbol) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.handlers.clear();
  }
}

export const WebSocketService = new WebSocketServiceClass();
