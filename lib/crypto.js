// Чистые криптографические функции без зависимостей от Next.js —
// их удобно покрывать тестами (tests/crypto.test.js).
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

/**
 * Хеширует пароль алгоритмом scrypt со случайной солью.
 * Формат: scrypt:N:r:p:<соль hex>:<хеш hex> — без символов `$`,
 * чтобы значение можно было без экранирования хранить в .env.
 */
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password).normalize('NFKC'), salt, KEY_LENGTH, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), hash.toString('hex')].join(':');
}

/** Проверяет пароль по хешу; сравнение — за постоянное время. */
export function verifyPassword(password, stored) {
  const parts = String(stored || '').trim().split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  const salt = Buffer.from(saltHex, 'hex');
  if (expected.length < 32 || salt.length < 16) return false;

  try {
    const actual = scryptSync(String(password).normalize('NFKC'), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Сравнение строк за постоянное время (через хеши одинаковой длины). */
export function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

/** Подписанный токен сессии: <payload base64url>.<HMAC-SHA256>. */
export function signSession(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

/** Возвращает payload, если подпись верна и срок не истёк, иначе null. */
export function verifySession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !secret) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
