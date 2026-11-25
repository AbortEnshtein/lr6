import { db } from './store.js';

const TIME_ZONE = 'Europe/Moscow';
const ONLINE_WINDOW_MS = 10_000; // считаем «онлайн», если пульс был за последние 10 с

const KEYS = {
  total: 'visits:total',
  online: 'visits:online',
  day: (date = new Date()) =>
    `visits:day:${new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(date)}`,
};

/** Новое посещение (один раз за сессию браузера). */
export async function registerVisit() {
  const dayKey = KEYS.day();
  const [total, today] = await Promise.all([db.incr(KEYS.total), db.incr(dayKey)]);
  await db.expire(dayKey, 3 * 24 * 60 * 60);
  return { total, today };
}

/** «Пульс» открытой вкладки — по нему считаем, сколько людей на сайте сейчас. */
export async function heartbeat(visitorId) {
  await db.zadd(KEYS.online, { score: Date.now(), member: visitorId });
}

export async function readStats() {
  await db.zremrangebyscore(KEYS.online, 0, Date.now() - ONLINE_WINDOW_MS);
  const [total, today, online] = await Promise.all([
    db.get(KEYS.total),
    db.get(KEYS.day()),
    db.zcard(KEYS.online),
  ]);
  return { total: Number(total) || 0, today: Number(today) || 0, online: Number(online) || 0 };
}
