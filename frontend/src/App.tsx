import * as Sentry from "@sentry/react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CurrencyListProvider } from "./context/CurrencyListContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { ReportProvider } from "./context/ReportContext";
import { AuthView } from "./components/AuthView";
import { Confirm } from "./components/Confirm";
import { Dashboard } from "./components/Dashboard";
import { TrackingPage } from "./components/TrackingPage";
import { ReportsPage } from "./components/ReportsPage";
import { PrivateRoute } from "./components/PrivateRoute";
import { YandexMetrika } from "./components/YandexMetrika";
import "./index.css";

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<div>Произошла ошибка</div>}>
      <AuthProvider>
        <CurrencyListProvider>
          <CurrencyProvider>
            <ReportProvider>
              <BrowserRouter>
                <YandexMetrika />
                <Routes>
                  <Route path="/" element={<AuthView />} />
                  <Route
                    path="/confirm"
                    element={
                      <PrivateRoute>
                        <Confirm />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/tracking"
                    element={
                      <PrivateRoute>
                        <TrackingPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/reports"
                    element={
                      <PrivateRoute>
                        <ReportsPage />
                      </PrivateRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </ReportProvider>
          </CurrencyProvider>
        </CurrencyListProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  );
}

export default App;
