import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Report, ReportService } from '../services/ReportService';

interface ReportContextType {
  reports: Report[];
  currentReport: Report | null;
  isGenerating: boolean;
  error: string | null;
  loadReports: () => Promise<void>;
  setCurrentReport: (report: Report | null) => void;
  addReport: (report: Report) => void;
  removeReport: (reportId: string) => Promise<void>;
  setIsGenerating: (value: boolean) => void;
  setError: (error: string | null) => void;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const history = await ReportService.fetchReportHistory();
      setReports(history);
    } catch (err) {
      setError('Не удалось загрузить историю отчётов');
    }
  }, []);

  const addReport = useCallback(async (report: Report) => {
    await ReportService.saveReport(report);
    setReports(prev => [report, ...prev]);
    setCurrentReport(report);
  }, []);

  const removeReport = useCallback(async (reportId: string) => {
    try {
      await ReportService.deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      if (currentReport?.id === reportId) {
        setCurrentReport(null);
      }
    } catch (err) {
      setError('Не удалось удалить отчёт');
    }
  }, [currentReport]);

  const value = {
    reports,
    currentReport,
    isGenerating,
    error,
    loadReports,
    setCurrentReport,
    addReport,
    removeReport,
    setIsGenerating,
    setError,
  };

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>;
}

export function useReport() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
}

