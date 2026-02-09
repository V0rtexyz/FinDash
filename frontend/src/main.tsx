import * as Sentry from "@sentry/react";
import { browserTracingIntegration } from "@sentry/browser";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Initialize Sentry only in development mode
if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 1.0,
    sendDefaultPii: true,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
