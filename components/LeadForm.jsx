'use client';

import { useState } from 'react';
import { FULL_SITE_URL, IS_STATIC } from '@/lib/config';

export default function LeadForm() {
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus('sending');
    setError('');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось отправить заявку');
      form.reset();
      setStatus('sent');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }

  return (
    <form className="lead-form card" onSubmit={onSubmit}>
      {IS_STATIC && (
        <p className="notice">
          На GitHub Pages форма не работает: заявку некому принять и отправить в Telegram.
          {FULL_SITE_URL && (
            <>
              {' '}
              <a href={`${FULL_SITE_URL.replace(/\/$/, '')}/#contact`}>Оставьте заявку на полной версии →</a>
            </>
          )}
        </p>
      )}
      <fieldset disabled={IS_STATIC || status === 'sending'}>
        <div className="form-row">
          <label>
            Имя
            <input name="name" required maxLength={80} autoComplete="name" />
          </label>
          <label>
            Как с вами связаться
            <input name="contact" required minLength={3} maxLength={120} placeholder="@telegram, e-mail или телефон" />
          </label>
        </div>
        <label>
          Сообщение
          <textarea name="message" required maxLength={2000} rows={4} placeholder="Коротко опишите задачу" />
        </label>
        {/* ловушка для ботов: человек это поле не видит */}
        <div className="visually-hidden" aria-hidden="true">
          <label>
            Сайт
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <div className="form-actions">
          <button className="button" type="submit">
            {status === 'sending' ? 'Отправляю…' : 'Отправить заявку'}
          </button>
          <span role="status" className={status === 'error' ? 'form-error' : 'form-ok'}>
            {status === 'sent' && 'Спасибо! Заявка отправлена — скоро отвечу.'}
            {status === 'error' && error}
          </span>
        </div>
      </fieldset>
    </form>
  );
}
