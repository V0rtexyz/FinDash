import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    ym?: (id: number, action: string, ...args: unknown[]) => void;
  }
}

const COUNTER_ID = import.meta.env.VITE_YANDEX_METRIKA_ID;
const SCRIPT_URL = "https://mc.yandex.ru/metrika/tag.js";

const defaultParams = {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true,
};

/**
 * Инициализирует счётчик Яндекс.Метрики и отправляет виртуальные хиты при смене маршрута (SPA).
 * Для работы задайте VITE_YANDEX_METRIKA_ID в frontend/.env.
 *
 * Подробная документация: см. YANDEX_METRIKA.md в корне проекта.
 */
export function YandexMetrika() {
  const location = useLocation();

  useEffect(() => {
    if (!COUNTER_ID) return;

    const id = Number(COUNTER_ID);
    if (Number.isNaN(id)) return;

    const sendHit = () => {
      if (typeof window.ym !== "function") return;
      const url =
        window.location.origin + location.pathname + location.search;
      window.ym(id, "hit", url);
    };

    const init = () => {
      if (typeof window.ym === "function") {
        window.ym(id, "init", defaultParams);
        sendHit();
      }
    };

    if (typeof window.ym === "function") {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  useEffect(() => {
    if (!COUNTER_ID || typeof window.ym !== "function") return;

    const id = Number(COUNTER_ID);
    if (Number.isNaN(id)) return;

    const url = window.location.origin + location.pathname + location.search;
    window.ym(id, "hit", url);
  }, [location.pathname, location.search]);

  return null;
}
