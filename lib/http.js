import { ValidationError } from './validation.js';
import { db } from './store.js';

export const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

export function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim();
}

export function isHttps(request) {
  const proto = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '');
  return proto.split(',')[0].trim() === 'https';
}

/** Изменяющие запросы принимаем только со своего же сайта. */
export function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Читает JSON-тело запроса с ограничением размера. */
export async function readJson(request, maxBytes = 32 * 1024) {
  const raw = await request.text();
  if (raw.length > maxBytes) throw new ValidationError('Слишком большой запрос');
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new ValidationError('Некорректный JSON');
  }
}

/** Ограничение частоты: не больше `limit` запросов за `windowSec` секунд. */
export async function rateLimit(key, limit, windowSec) {
  const count = await db.incr(`rl:${key}`);
  if (count === 1) await db.expire(`rl:${key}`, windowSec);
  return count <= limit;
}

/** Общая обработка ошибок для API-обработчиков. */
export function handleError(error) {
  if (error instanceof ValidationError) return json({ error: error.message }, 400);
  console.error(error);
  return json({ error: 'Внутренняя ошибка сервера' }, 500);
}
