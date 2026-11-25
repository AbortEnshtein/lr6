import { cookies } from 'next/headers';
import { hashPassword, safeEqual, signSession, verifyPassword, verifySession } from './crypto.js';

export const SESSION_COOKIE = 'vizitka_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 часов

/** Каких переменных окружения не хватает для входа в редактор. */
export function missingAuthConfig() {
  const missing = [];
  if (!process.env.ADMIN_USERNAME) missing.push('ADMIN_USERNAME');
  if (!process.env.ADMIN_PASSWORD_HASH) missing.push('ADMIN_PASSWORD_HASH');
  if ((process.env.SESSION_SECRET || '').length < 32) missing.push('SESSION_SECRET (≥ 32 символов)');
  return missing;
}

// Хеш-пустышка: проверяем пароль даже при неверном логине, чтобы по времени
// ответа нельзя было понять, существует ли такой пользователь.
let dummyHash;

export function checkCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const storedHash = process.env.ADMIN_PASSWORD_HASH || '';
  dummyHash ??= hashPassword('dummy-password');

  const passwordOk = verifyPassword(String(password ?? ''), storedHash || dummyHash);
  const userOk = safeEqual(String(username ?? '').trim(), expectedUser.trim());
  return Boolean(expectedUser && storedHash) && passwordOk && userOk;
}

export function createSessionCookie(username, secure) {
  const exp = Date.now() + SESSION_TTL_SECONDS * 1000;
  return {
    name: SESSION_COOKIE,
    value: signSession({ u: username, exp }, process.env.SESSION_SECRET),
    httpOnly: true, // недоступна из JavaScript страницы
    sameSite: 'strict', // не отправляется с чужих сайтов (защита от CSRF)
    secure, // только по HTTPS (на Vercel), локально в Docker — HTTP
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

/** Имя администратора из cookie сессии или null. */
export async function getSessionUser() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  const store = await cookies();
  const payload = verifySession(store.get(SESSION_COOKIE)?.value, secret);
  return payload && safeEqual(payload.u, process.env.ADMIN_USERNAME || '') ? payload.u : null;
}
