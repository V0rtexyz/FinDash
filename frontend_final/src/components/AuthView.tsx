import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/AuthService';
import { useAuth } from '../context/AuthContext';
import '../styles/AuthView.css';

export function AuthView() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!login || !password) {
      setError('Заполните все поля');
      return;
    }

    if (!validateEmail(login)) {
      setError('Введите корректный email');
      return;
    }

    if (password.length < 3) {
      setError('Пароль должен содержать минимум 3 символа');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegisterMode) {
        // Регистрация
        const registerResponse = await AuthService.register({ login, password });
        if (registerResponse.success) {
          setSuccess('Регистрация успешна! Выполняется вход...');
          setError(''); // Очищаем предыдущие ошибки
          
          // Автоматически входим после регистрации
          // Увеличиваем задержку, чтобы убедиться, что пользователь создан
          try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const loginResponse = await AuthService.login({ login, password });
            
            if (loginResponse.success && loginResponse.userId && loginResponse.userName) {
              const token = localStorage.getItem('token');
              const userStr = localStorage.getItem('user');
              
              if (token && userStr) {
                try {
                  const user = JSON.parse(userStr);
                  authLogin(token, user);
                  // Очищаем сообщения перед переходом
                  setSuccess('');
                  setError('');
                  navigate('/confirm');
                  return; // Успешный выход из функции
                } catch (parseError) {
                  console.error('Error parsing user data:', parseError);
                  setSuccess('');
                  setError('Ошибка обработки данных пользователя. Попробуйте войти вручную.');
                }
              } else {
                setSuccess('');
                setError('Ошибка сохранения данных авторизации. Попробуйте войти вручную.');
              }
            } else {
              setSuccess('');
              setError(loginResponse.message || 'Регистрация успешна, но не удалось войти. Попробуйте войти вручную.');
            }
          } catch (loginError) {
            console.error('Auto-login error after registration:', loginError);
            setSuccess('');
            const errorMessage = loginError instanceof Error ? loginError.message : 'Ошибка автоматического входа';
            if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('база данных недоступна')) {
              setError('Регистрация успешна, но не удалось войти из-за проблем с базой данных. Попробуйте войти вручную.');
            } else if (errorMessage.includes('Неверный логин или пароль')) {
              setError('Регистрация успешна, но автоматический вход не удался. Попробуйте войти вручную через несколько секунд.');
            } else {
              setError(`Регистрация успешна! ${errorMessage}. Попробуйте войти вручную.`);
            }
          }
        } else {
          setError(registerResponse.message || 'Ошибка регистрации');
        }
      } else {
        // Вход
        const response = await AuthService.login({ login, password });
        if (response.success && response.userId && response.userName) {
          // Get token and user from localStorage (set by AuthService)
          const token = localStorage.getItem('token');
          const userStr = localStorage.getItem('user');
          if (token && userStr) {
            const user = JSON.parse(userStr);
            authLogin(token, user);
            navigate('/confirm');
          } else {
            setError('Ошибка сохранения данных авторизации');
          }
        } else {
          setError(response.message || 'Ошибка авторизации');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Произошла ошибка';
      // Улучшаем сообщения об ошибках
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('база данных недоступна')) {
        setError('База данных недоступна. Приложение работает в режиме без сохранения данных. Попробуйте позже или настройте подключение к PostgreSQL.');
      } else if (errorMessage.includes('User already exists') || errorMessage.includes('уже существует') || errorMessage.includes('already exists')) {
        setError('Пользователь с таким email уже зарегистрирован. Войдите или используйте другой email.');
      } else if (errorMessage.includes('Registration error') || errorMessage.includes('Ошибка регистрации')) {
        setError('Ошибка при регистрации. Попробуйте еще раз или войдите, если уже зарегистрированы.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          {isRegisterMode ? 'Регистрация' : 'Авторизация'}
        </h1>
        <p className="auth-subtitle">
          {isRegisterMode 
            ? 'Создайте новый аккаунт' 
            : 'Войдите в свой аккаунт'}
        </p>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login" className="form-label">
              Email
            </label>
            <input
              id="login"
              type="email"
              className="form-input"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="example@mail.com"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading 
              ? 'Загрузка...' 
              : isRegisterMode 
                ? 'Зарегистрироваться' 
                : 'Войти'}
          </button>

          <div className="auth-switch">
            <button
              type="button"
              className="switch-button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError('');
                setSuccess('');
              }}
              disabled={isLoading}
            >
              {isRegisterMode 
                ? 'Уже есть аккаунт? Войти' 
                : 'Нет аккаунта? Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

