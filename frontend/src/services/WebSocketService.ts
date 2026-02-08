import { CurrencyData } from "./CurrencyAPI";

type MessageHandler = (data: Partial<CurrencyData>) => void;

const getWsUrl = (): string => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return import.meta.env.DEV
    ? `${protocol}//${window.location.host}/ws`
    : `${protocol}//${window.location.host}/ws`;
};

class WebSocketServiceClass {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private subscribedSymbols: Set<string> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelayMs = 2000;
  private connecting = false;

  private connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.connecting) return;

    this.connecting = true;
    const url = getWsUrl();

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.sendSubscribeRates();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === "rate:update" && msg.symbol) {
            const data: Partial<CurrencyData> = {
              symbol: msg.symbol,
              name: msg.name,
              price: msg.price,
              change24h: msg.change24h,
              timestamp: msg.timestamp,
            };
            const handlers = this.handlers.get(msg.symbol);
            if (handlers) {
              handlers.forEach((h) => h(data));
            }
          }
        } catch (_e) {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.connecting = false;
        this.ws = null;
        if (this.subscribedSymbols.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
          }, this.reconnectDelayMs);
        }
      };

      this.ws.onerror = () => {
        // Errors are handled via onclose
      };
    } catch (_e) {
      this.connecting = false;
    }
  }

  private sendSubscribeRates(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const symbols = Array.from(this.subscribedSymbols);
    if (symbols.length === 0) return;

    this.ws.send(
      JSON.stringify({
        type: "subscribe:rates",
        symbols,
      })
    );
  }

  private sendUnsubscribeRates(symbols: string[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (symbols.length === 0) return;

    this.ws.send(
      JSON.stringify({
        type: "unsubscribe:rates",
        symbols,
      })
    );
  }

  subscribe(symbol: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(symbol)) {
      this.handlers.set(symbol, new Set());
    }
    this.handlers.get(symbol)!.add(handler);

    const wasEmpty = this.subscribedSymbols.size === 0;
    this.subscribedSymbols.add(symbol);

    if (wasEmpty) {
      this.connect();
    } else {
      this.sendSubscribeRates();
    }

    return () => {
      const handlers = this.handlers.get(symbol);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(symbol);
          this.subscribedSymbols.delete(symbol);
          this.sendUnsubscribeRates([symbol]);
        }
      }
    };
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
    this.subscribedSymbols.clear();
    this.connecting = false;
  }
}

export const WebSocketService = new WebSocketServiceClass();
