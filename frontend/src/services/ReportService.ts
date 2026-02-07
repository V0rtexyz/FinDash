import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CurrencyData, PricePoint } from "./CurrencyAPI";

export interface ReportParams {
  currency: string;
  startDate: Date;
  endDate: Date;
  interval: "1h" | "1d" | "1w";
}

export interface Report {
  id: string;
  name: string;
  params: ReportParams;
  createdAt: Date;
  format: "pdf" | "csv";
  data?: CurrencyData;
}

class ReportServiceClass {
  private generateReportName(params: ReportParams): string {
    const dateStr = new Date().toISOString().split("T")[0];
    return `${params.currency}_${params.interval}_${dateStr}`;
  }

  private calculateStats(history: PricePoint[]) {
    if (history.length === 0) {
      return { minPrice: 0, maxPrice: 0, avgPrice: 0 };
    }

    const minPrice = Math.min(...history.map((p) => p.price));
    const maxPrice = Math.max(...history.map((p) => p.price));
    const avgPrice =
      history.reduce((sum, p) => sum + p.price, 0) / history.length;

    return { minPrice, maxPrice, avgPrice };
  }

  private filterHistoryByPeriod(
    history: PricePoint[],
    startDate: Date,
    endDate: Date,
    interval?: "1h" | "1d" | "1w"
  ): PricePoint[] {
    const filtered = history
      .filter((point) => {
        const pointDate = new Date(point.timestamp);
        return pointDate >= startDate && pointDate <= endDate;
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    if (interval === "1w" && filtered.length > 1) {
      const step = Math.max(1, Math.floor(filtered.length / 8));
      return filtered.filter((_, i) => i % step === 0 || i === filtered.length - 1);
    }
    return filtered;
  }

  private optimizeHistoryForPDF(
    history: PricePoint[],
    maxPoints: number = 100
  ): PricePoint[] {
    if (history.length <= maxPoints) {
      return history;
    }

    // Берем каждую N-ю точку
    const step = Math.ceil(history.length / maxPoints);
    return history.filter((_, index) => index % step === 0);
  }

  async generateReport(
    params: ReportParams,
    data: CurrencyData
  ): Promise<Report> {
    const report: Report = {
      id: Date.now().toString(),
      name: this.generateReportName(params),
      params,
      createdAt: new Date(),
      format: "pdf",
      data,
    };

    return report;
  }

  generatePDF(report: Report): void {
    if (!report.data) return;

    const doc = new jsPDF();

    // Фильтруем историю по выбранному периоду и интервалу
    const filteredHistory = this.filterHistoryByPeriod(
      report.data.history,
      report.params.startDate,
      report.params.endDate,
      report.params.interval
    );

    // Оптимизируем для PDF (не более 100 точек)
    const optimizedHistory = this.optimizeHistoryForPDF(filteredHistory, 100);

    // Вычисляем статистику
    const stats = this.calculateStats(filteredHistory);

    doc.setFontSize(20);
    doc.text("FinDash - Currency Report", 14, 20);

    doc.setFontSize(12);
    doc.text(`Currency: ${report.data.name} (${report.data.symbol})`, 14, 35);
    doc.text(
      `Date: ${new Date(report.createdAt).toLocaleString("ru-RU")}`,
      14,
      42
    );
    doc.text(`Interval: ${report.params.interval}`, 14, 49);
    doc.text(
      `Period: ${report.params.startDate.toLocaleDateString(
        "ru-RU"
      )} - ${report.params.endDate.toLocaleDateString("ru-RU")}`,
      14,
      56
    );

    doc.setFontSize(14);
    doc.text("Summary", 14, 70);

    doc.setFontSize(11);
    doc.text(
      `Current Price: $${report.data.price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      14,
      80
    );
    doc.text(
      `Period Change: ${
        report.data.change24h >= 0 ? "+" : ""
      }${report.data.change24h.toFixed(2)}%`,
      14,
      87
    );

    if (filteredHistory.length > 0) {
      doc.text(
        `Min Price: $${stats.minPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        14,
        94
      );
      doc.text(
        `Max Price: $${stats.maxPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        14,
        101
      );
      doc.text(
        `Avg Price: $${stats.avgPrice.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        14,
        108
      );
      doc.text(
        `Data points: ${filteredHistory.length} (showing ${optimizedHistory.length} in table)`,
        14,
        115
      );
    }

    if (optimizedHistory.length > 0) {
      doc.setFontSize(14);
      doc.text("Price History", 14, 130);

      const tableData = optimizedHistory.map((point) => [
        new Date(point.timestamp).toLocaleString("ru-RU"),
        `$${point.price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
      ]);

      autoTable(doc, {
        startY: 135,
        head: [["Time", "Price"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 9 },
      });
    }

    doc.save(`${report.name}.pdf`);
  }

  generateCSV(report: Report): void {
    if (!report.data) return;

    // Фильтруем историю по выбранному периоду и интервалу
    const filteredHistory = this.filterHistoryByPeriod(
      report.data.history,
      report.params.startDate,
      report.params.endDate,
      report.params.interval
    );

    // Вычисляем статистику
    const stats = this.calculateStats(filteredHistory);

    let csv = "FinDash - Currency Report\n\n";
    csv += `Currency,${report.data.name} (${report.data.symbol})\n`;
    csv += `Date,${new Date(report.createdAt).toLocaleString("ru-RU")}\n`;
    csv += `Interval,${report.params.interval}\n`;
    csv += `Period,${report.params.startDate.toLocaleDateString(
      "ru-RU"
    )} - ${report.params.endDate.toLocaleDateString("ru-RU")}\n\n`;

    csv += `Current Price,$${report.data.price.toFixed(2)}\n`;
    csv += `Period Change,${report.data.change24h.toFixed(2)}%\n\n`;

    if (filteredHistory.length > 0) {
      csv += `Min Price,$${stats.minPrice.toFixed(2)}\n`;
      csv += `Max Price,$${stats.maxPrice.toFixed(2)}\n`;
      csv += `Avg Price,$${stats.avgPrice.toFixed(2)}\n`;
      csv += `Data points,${filteredHistory.length}\n\n`;

      csv += "Time,Price\n";
      filteredHistory.forEach((point) => {
        csv += `${new Date(point.timestamp).toLocaleString(
          "ru-RU"
        )},$${point.price.toFixed(2)}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${report.name}.csv`;
    link.click();
  }

  downloadReport(report: Report): void {
    if (report.format === "pdf") {
      this.generatePDF(report);
    } else {
      this.generateCSV(report);
    }
  }

  async fetchReportHistory(): Promise<Report[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const savedReports = localStorage.getItem("reports_history");
    if (savedReports) {
      const reports = JSON.parse(savedReports);
      return reports.map((r: any) => ({
        ...r,
        createdAt: new Date(r.createdAt),
        params: {
          ...r.params,
          startDate: new Date(r.params.startDate),
          endDate: new Date(r.params.endDate),
        },
      }));
    }

    return [];
  }

  async saveReport(report: Report): Promise<void> {
    const history = await this.fetchReportHistory();
    history.unshift(report);

    const reportsToSave = history.slice(0, 20);
    localStorage.setItem("reports_history", JSON.stringify(reportsToSave));
  }

  async deleteReport(reportId: string): Promise<void> {
    const history = await this.fetchReportHistory();
    const filtered = history.filter((r) => r.id !== reportId);
    localStorage.setItem("reports_history", JSON.stringify(filtered));
  }
}

export const ReportService = new ReportServiceClass();
