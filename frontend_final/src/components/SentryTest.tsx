import * as Sentry from '@sentry/react';
import { useState } from 'react';
import '../styles/SentryTest.css';

function ReactErrorComponent() {
  throw new Error('React компонент ошибка для тестирования Sentry');
}

export function SentryTest() {
  const [testResult, setTestResult] = useState<string>('');
  const [showReactError, setShowReactError] = useState(false);

  const testRuntimeError = () => {
    try {
      setTestResult('Отправка runtime ошибки...');
      const obj: any = null;
      obj.property.access;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { errorType: 'runtime' },
      });
      setTestResult('Runtime ошибка отправлена в Sentry!');
      setTimeout(() => setTestResult(''), 3000);
    }
  };

  const testAPIError = async () => {
    setTestResult('Отправка API ошибки...');
    try {
      const response = await fetch('/api/nonexistent-endpoint');
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { errorType: 'api' },
        contexts: {
          api: {
            endpoint: '/api/nonexistent-endpoint',
            method: 'GET',
          },
        },
      });
      setTestResult('API ошибка отправлена в Sentry!');
      setTimeout(() => setTestResult(''), 3000);
    }
  };

  const testReactError = () => {
    setTestResult('Отправка React ошибки...');
    setShowReactError(true);
    setTimeout(() => {
      setTestResult('React ошибка отправлена в Sentry!');
      setShowReactError(false);
      setTimeout(() => setTestResult(''), 3000);
    }, 100);
  };

  const testMessage = () => {
    setTestResult('Отправка тестового сообщения...');
    Sentry.captureMessage('Тестовое сообщение из FinDash', 'info');
    setTestResult('Сообщение отправлено в Sentry!');
    setTimeout(() => setTestResult(''), 3000);
  };

  if (showReactError) {
    return <ReactErrorComponent />;
  }

  return (
    <div className="sentry-test">
      <div className="sentry-test-header">
        <h4>Тестирование Sentry</h4>
        {testResult && <div className="sentry-test-result">{testResult}</div>}
      </div>
      <div className="sentry-test-buttons">
        <button onClick={testRuntimeError} className="sentry-test-btn">
          Runtime ошибка
        </button>
        <button onClick={testAPIError} className="sentry-test-btn">
          API ошибка
        </button>
        <button onClick={testReactError} className="sentry-test-btn">
          React ошибка
        </button>
        <button onClick={testMessage} className="sentry-test-btn">
          Тестовое сообщение
        </button>
      </div>
    </div>
  );
}

