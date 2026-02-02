import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Confirm.css';

export function Confirm() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, navigate]);

  return (
    <div className="confirm-container">
      <div className="confirm-card">
        <div className="success-icon">✓</div>
        <h1 className="confirm-title">Успешная авторизация</h1>
        <p className="confirm-message">
          Добро пожаловать, {user?.name || user?.email}!
        </p>
        <p className="confirm-redirect">
          Перенаправление через {countdown} сек...
        </p>
      </div>
    </div>
  );
}

