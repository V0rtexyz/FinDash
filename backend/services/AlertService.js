/**
 * AlertService - checks price alerts and creates notifications
 */

export default class AlertService {
  constructor(database, coinLayerService) {
    this.database = database;
    this.coinLayerService = coinLayerService;
    this.onAlertTriggered = null; // (userId, payload) => void - set by server to send WS
  }

  async checkAlerts() {
    try {
      const symbols = await this.database.getActiveAlertSymbols();
      if (!symbols || symbols.length === 0) return;

      const ratesResult = await this.coinLayerService.getLiveRates(symbols);
      if (!ratesResult.success || !ratesResult.rates) return;

      const alerts = await this.database.getActiveAlertsBySymbols(symbols);
      for (const alert of alerts) {
        const currentPrice = ratesResult.rates[alert.symbol];
        if (currentPrice == null) continue;

        const triggered =
          alert.condition === "above"
            ? currentPrice >= alert.targetValue
            : currentPrice <= alert.targetValue;

        if (triggered) {
          const message =
            alert.condition === "above"
              ? `${alert.symbol} поднялся до $${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (порог: $${alert.targetValue.toLocaleString("en-US", { minimumFractionDigits: 2 })})`
              : `${alert.symbol} упал до $${currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (порог: $${alert.targetValue.toLocaleString("en-US", { minimumFractionDigits: 2 })})`;

          await this.database.createNotification(
            alert.userId,
            alert.id,
            message
          );
          await this.database.setAlertInactive(alert.id);

          const payload = {
            type: "alert_triggered",
            alertId: alert.id,
            symbol: alert.symbol,
            condition: alert.condition,
            targetValue: alert.targetValue,
            currentValue: currentPrice,
            message,
          };

          if (typeof this.onAlertTriggered === "function") {
            this.onAlertTriggered(alert.userId, payload);
          }
        }
      }
    } catch (error) {
      console.error("AlertService.checkAlerts error:", error);
    }
  }
}
