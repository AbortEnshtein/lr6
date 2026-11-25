'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `Ошибка ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });

/* ---------- Вход ---------- */

function LoginForm({ configured, onLogin }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card admin-card" onSubmit={onSubmit}>
      <h1>Вход в редактор</h1>
      {!configured && (
        <p className="notice">
          Вход не настроен: задайте ADMIN_USERNAME, ADMIN_PASSWORD_HASH и SESSION_SECRET в переменных окружения.
        </p>
      )}
      <fieldset disabled={busy}>
        <label>
          Логин
          <input name="username" required autoComplete="username" />
        </label>
        <label>
          Пароль
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <div className="form-actions">
          <button className="button" type="submit">
            {busy ? 'Проверяю…' : 'Войти'}
          </button>
          <Link href="/">← На сайт</Link>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </fieldset>
    </form>
  );
}

/* ---------- Редактор профиля ---------- */

const EMPTY = { contacts: { label: '', url: '' }, projects: { title: '', description: '', url: '' } };

function ListEditor({ title, items, fields, onChange, addLabel, empty }) {
  const update = (i, key, value) => onChange(items.map((it, j) => (j === i ? { ...it, [key]: value } : it)));
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  const move = (i, d) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  return (
    <fieldset className="list-editor">
      <legend>{title}</legend>
      {items.map((it, i) => (
        <div className="list-item" key={i}>
          <div className="list-fields">
            {fields.map((f) =>
              f.multiline ? (
                <label key={f.key} className="wide">
                  {f.label}
                  <textarea rows={2} value={it[f.key]} maxLength={f.max} onChange={(e) => update(i, f.key, e.target.value)} />
                </label>
              ) : (
                <label key={f.key}>
                  {f.label}
                  <input value={it[f.key]} maxLength={f.max} placeholder={f.placeholder} onChange={(e) => update(i, f.key, e.target.value)} />
                </label>
              ),
            )}
          </div>
          <div className="list-actions">
            <button type="button" className="icon-button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Выше">↑</button>
            <button type="button" className="icon-button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Ниже">↓</button>
            <button type="button" className="icon-button danger" onClick={() => remove(i)} aria-label="Удалить">✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="button button-ghost" onClick={() => onChange([...items, { ...empty }])}>
        + {addLabel}
      </button>
    </fieldset>
  );
}

function ProfileEditor({ onUnauthorized }) {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState({ kind: '', text: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/api/profile')
      .then((p) => setForm({ ...p, skills: p.skills.join(', ') }))
      .catch((err) => setStatus({ kind: 'error', text: err.message }));
  }, []);

  if (!form) return <p className="muted">{status.text || 'Загрузка профиля…'}</p>;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus({ kind: '', text: '' });
    try {
      const body = {
        ...form,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      };
      await api('/api/profile', { method: 'PUT', body: JSON.stringify(body) });
      setStatus({ kind: 'ok', text: 'Сохранено. Изменения уже на сайте.' });
    } catch (err) {
      if (err.status === 401) return onUnauthorized();
      setStatus({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="editor">
      <fieldset disabled={saving}>
        <div className="form-row">
          <label>
            Имя
            <input value={form.name} onChange={set('name')} required maxLength={80} />
          </label>
          <label>
            Должность
            <input value={form.title} onChange={set('title')} maxLength={120} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Город
            <input value={form.location} onChange={set('location')} maxLength={80} />
          </label>
          <label>
            Аватар (https-ссылка на картинку)
            <input value={form.avatarUrl} onChange={set('avatarUrl')} maxLength={500} placeholder="https://…" />
          </label>
        </div>
        <label>
          О себе
          <textarea value={form.about} onChange={set('about')} rows={4} maxLength={2000} />
        </label>
        <label>
          Навыки через запятую
          <input value={form.skills} onChange={set('skills')} />
        </label>

        <ListEditor
          title="Контакты"
          addLabel="контакт"
          items={form.contacts}
          empty={EMPTY.contacts}
          onChange={(contacts) => setForm({ ...form, contacts })}
          fields={[
            { key: 'label', label: 'Название', max: 40, placeholder: 'Telegram' },
            { key: 'url', label: 'Ссылка', max: 300, placeholder: 'https://t.me/… или mailto:…' },
          ]}
        />

        <ListEditor
          title="Проекты (показываются во iframe)"
          addLabel="проект"
          items={form.projects}
          empty={EMPTY.projects}
          onChange={(projects) => setForm({ ...form, projects })}
          fields={[
            { key: 'title', label: 'Название', max: 80 },
            { key: 'url', label: 'Ссылка (https)', max: 500, placeholder: 'https://…' },
            { key: 'description', label: 'Описание', max: 300, multiline: true },
          ]}
        />

        <div className="form-actions sticky-actions">
          <button className="button" type="submit">
            {saving ? 'Сохраняю…' : 'Сохранить'}
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer">
            Открыть сайт ↗
          </a>
          <span role="status" className={status.kind === 'error' ? 'form-error' : 'form-ok'}>
            {status.text}
          </span>
        </div>
      </fieldset>
    </form>
  );
}

/* ---------- Заявки ---------- */

function Leads({ onUnauthorized }) {
  const [leads, setLeads] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/api/leads')
      .then((d) => {
        setLeads(d.leads);
        setError('');
      })
      .catch((err) => (err.status === 401 ? onUnauthorized() : setError(err.message)));
  }, [onUnauthorized]);

  useEffect(load, [load]);

  return (
    <div className="leads">
      <div className="form-actions">
        <button type="button" className="button button-ghost" onClick={load}>
          Обновить
        </button>
        {error && <span className="form-error">{error}</span>}
      </div>
      {leads === null ? (
        <p className="muted">Загрузка…</p>
      ) : leads.length === 0 ? (
        <p className="muted">Заявок пока нет.</p>
      ) : (
        <ul className="lead-list">
          {leads.map((l) => (
            <li key={l.id} className="lead-item">
              <div className="lead-head">
                <strong>{l.name}</strong>
                <span>{l.contact}</span>
                <time dateTime={l.createdAt}>{dateFormat.format(new Date(l.createdAt))}</time>
              </div>
              <p>{l.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Приложение ---------- */

export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('profile');

  const refreshSession = useCallback(() => {
    api('/api/auth/session')
      .then(setSession)
      .catch(() => setSession({ authenticated: false, configured: true }));
  }, []);

  useEffect(refreshSession, [refreshSession]);

  const onUnauthorized = useCallback(() => setSession({ authenticated: false, configured: true }), []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    onUnauthorized();
  }

  if (!session) {
    return (
      <main className="container narrow">
        <p className="muted">Загрузка…</p>
      </main>
    );
  }

  if (!session.authenticated) {
    return (
      <main className="container narrow">
        <LoginForm configured={session.configured} onLogin={refreshSession} />
      </main>
    );
  }

  return (
    <main className="container">
      <div className="card admin-card">
        <div className="admin-head">
          <h1>Редактор</h1>
          <span className="muted">Вы вошли как {session.user}</span>
          <Link href="/">На сайт</Link>
          <button type="button" className="button button-ghost" onClick={logout}>
            Выйти
          </button>
        </div>

        {session.storage === 'memory' && (
          <p className="notice">
            База данных не подключена: изменения хранятся в памяти сервера и пропадут после перезапуска.
          </p>
        )}
        {!session.telegram && (
          <p className="notice">Telegram не настроен: заявки сохраняются, но уведомления не приходят.</p>
        )}

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'profile'} onClick={() => setTab('profile')}>
            Профиль
          </button>
          <button type="button" role="tab" aria-selected={tab === 'leads'} onClick={() => setTab('leads')}>
            Заявки
          </button>
        </div>

        {tab === 'profile' ? <ProfileEditor onUnauthorized={onUnauthorized} /> : <Leads onUnauthorized={onUnauthorized} />}
      </div>
    </main>
  );
}
