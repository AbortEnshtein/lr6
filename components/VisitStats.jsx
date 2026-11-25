'use client';

import { useEffect, useState } from 'react';
import { IS_STATIC } from '@/lib/config';

const format = (n) => (typeof n === 'number' ? n.toLocaleString('ru-RU') : '—');

function visitorId() {
  try {
    let id = localStorage.getItem('visitor-id');
    if (!id) {
      id = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem('visitor-id', id);
    }
    return id;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      {/* key заставляет React пересоздать элемент — так проигрывается анимация обновления */}
      <span key={value} className="stat-value">
        {format(value)}
      </span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

export default function VisitStats() {
  const [stats, setStats] = useState({});
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (IS_STATIC) return;
    const vid = visitorId();

    // посещение считаем один раз за сессию вкладки
    if (!sessionStorage.getItem('visit-counted')) {
      sessionStorage.setItem('visit-counted', '1');
      fetch('/api/visits', { method: 'POST' })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setStats((s) => ({ ...s, ...data })))
        .catch(() => {});
    }

    // Server-Sent Events: сервер сам присылает свежие цифры
    const source = new EventSource(`/api/visits/stream?vid=${encodeURIComponent(vid)}`);
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (event) => {
      try {
        setStats(JSON.parse(event.data));
      } catch {
        /* пропускаем битое сообщение */
      }
    };
    return () => source.close();
  }, []);

  return (
    <section className="stats card" aria-label="Посещаемость">
      <div className="stats-head">
        <span className={`live-dot${live ? ' is-live' : ''}`} aria-hidden="true" />
        <span>{IS_STATIC ? 'Счётчик посещений работает только с сервером' : live ? 'В реальном времени' : 'Подключение…'}</span>
      </div>
      <div className="stats-grid">
        <Stat label="сейчас на сайте" value={stats.online} />
        <Stat label="посещений сегодня" value={stats.today} />
        <Stat label="посещений всего" value={stats.total} />
      </div>
    </section>
  );
}
