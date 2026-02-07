import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SentryTest } from "./SentryTest";
import { MusicPlayer } from "./MusicPlayer";
import "../styles/Layout.css";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout-container">
      <header className="layout-header">
        <h1 className="layout-title">FinDash</h1>

        <nav className="layout-nav">
          <button
            className={`nav-button ${isActive("/dashboard") ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            Панель управления
          </button>
          <button
            className={`nav-button ${isActive("/tracking") ? "active" : ""}`}
            onClick={() => navigate("/tracking")}
          >
            Отслеживание
          </button>
          <button
            className={`nav-button ${isActive("/reports") ? "active" : ""}`}
            onClick={() => navigate("/reports")}
          >
            Отчёты
          </button>
        </nav>

        <div className="layout-user">
          <span className="user-email">{user?.email}</span>
          <button onClick={handleLogout} className="logout-button">
            Выйти
          </button>
        </div>
      </header>

      <main className="layout-content">{children}</main>
      <SentryTest />
      <MusicPlayer />
    </div>
  );
}
