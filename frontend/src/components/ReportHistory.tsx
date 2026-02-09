import { useEffect } from "react";
import { useReport } from "../context/ReportContext";
import { ReportService } from "../services/ReportService";
import "../styles/ReportHistory.css";

export function ReportHistory() {
  const { reports, loadReports, removeReport } = useReport();

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDownload = async (reportId: string) => {
    const report = reports.find((r) => r.id === reportId);
    if (report) {
      try {
        await ReportService.downloadReport(report);
      } catch (error) {
        console.error('Failed to download report:', error);
      }
    }
  };

  const handleDelete = async (reportId: string) => {
    if (window.confirm("Удалить этот отчёт?")) {
      await removeReport(reportId);
    }
  };

  if (reports.length === 0) {
    return (
      <div className="report-history-container">
        <h3 className="history-title">История отчётов</h3>
        <div className="empty-history">
          <p>Нет созданных отчётов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-history-container">
      <h3 className="history-title">История отчётов</h3>

      <div className="reports-table">
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Валюта</th>
              <th>Период</th>
              <th>Интервал</th>
              <th>Дата создания</th>
              <th>Формат</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="report-name">{report.name}</td>
                <td>{report.params.currency}</td>
                <td className="report-period">
                  {report.params.startDate.toLocaleDateString("ru-RU")} -{" "}
                  {report.params.endDate.toLocaleDateString("ru-RU")}
                </td>
                <td>{report.params.interval}</td>
                <td>{new Date(report.createdAt).toLocaleString("ru-RU")}</td>
                <td>
                  <span className={`format-badge ${report.format}`}>
                    {report.format.toUpperCase()}
                  </span>
                </td>
                <td className="actions-cell">
                  <button
                    onClick={() => handleDownload(report.id)}
                    className="action-button download"
                    title="Скачать"
                  >
                    ⬇
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="action-button delete"
                    title="Удалить"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
