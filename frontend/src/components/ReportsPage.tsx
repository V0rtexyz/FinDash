import { Layout } from "./Layout";
import { ReportForm } from "./ReportForm";
import { ReportHistory } from "./ReportHistory";
import { useReport } from "../context/ReportContext";
import { ReportService } from "../services/ReportService";
import "../styles/ReportsPage.css";

export function ReportsPage() {
  const { currentReport, isGenerating, error } = useReport();

  const handleDownloadCurrent = async () => {
    if (currentReport) {
      try {
        await ReportService.downloadReport(currentReport);
      } catch (error) {
        console.error("Failed to download report:", error);
      }
    }
  };

  return (
    <Layout>
      <div className="reports-page">
        <header className="reports-header">
          <h2 className="reports-title">Отчёты</h2>
          <p className="reports-subtitle">
            Формируйте отчёты по валютам за выбранный период
          </p>
        </header>

        <div className="reports-content">
          <div className="reports-section">
            <ReportForm />

            {error && <div className="error-message">{error}</div>}

            {isGenerating && (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <p>Формирование отчёта...</p>
              </div>
            )}

            {currentReport && !isGenerating && (
              <div className="current-report">
                <div className="report-header">
                  <div className="report-icon">📊</div>
                  <div className="report-info">
                    <h4 className="report-name">{currentReport.name}</h4>
                    <p className="report-meta">
                      {currentReport.params.currency} •{" "}
                      {currentReport.params.interval} •{" "}
                      {currentReport.format.toUpperCase()}
                    </p>
                    <p className="report-date">
                      Создан:{" "}
                      {new Date(currentReport.createdAt).toLocaleString(
                        "ru-RU"
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDownloadCurrent}
                  className="download-button"
                >
                  Скачать отчёт
                </button>
              </div>
            )}
          </div>

          <div className="reports-section">
            <ReportHistory />
          </div>
        </div>
      </div>
    </Layout>
  );
}
