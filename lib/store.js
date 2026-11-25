// Хранилище данных: Upstash Redis по REST API.
//  - на Vercel переменные KV_REST_API_* добавляет интеграция Upstash;
//  - в Docker их подставляет docker-compose (локальный Redis + REST-прокси);
//  - если переменных нет — временное хранилище в памяти (только для отладки).
import { Redis } from '@upstash/redis';

/**
 * Ищет пару «адрес + токен» Upstash REST API. Интеграция Vercel может добавить
 * к именам префикс (например, STORAGE_KV_REST_API_URL), а пустые значения
 * (скажем, импортированные из .env) пропускаются.
 */
export function findRedisEnv(env = process.env) {
  const pairs = [
    ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  ];
  for (const name of Object.keys(env).sort()) {
    const m = name.match(/^(.+_)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/);
    if (m) pairs.push([name, m[1] + m[2].replace('_URL', '_TOKEN')]);
  }
  for (const [urlName, tokenName] of pairs) {
    const url = env[urlName]?.trim();
    const token = env[tokenName]?.trim();
    if (url && token) return { url, token, source: urlName };
  }
  return null;
}

const redisEnv = findRedisEnv();
const url = redisEnv?.url;
const token = redisEnv?.token;

export const storageKind = redisEnv ? 'redis' : 'memory';
/** Имя переменной, из которой взят адрес базы (без значения), — для /api/health. */
export const storageSource = redisEnv?.source ?? null;

/** Минимальная in-memory реализация тех команд Redis, что использует сайт. */
function createMemoryStore() {
  const data = new Map();
  const expires = new Map();

  const alive = (key) => {
    const exp = expires.get(key);
    if (exp && exp <= Date.now()) {
      data.delete(key);
      expires.delete(key);
    }
    return data.has(key);
  };
  const clone = (v) => (v === undefined ? null : structuredClone(v));

  return {
    async ping() {
      return 'PONG';
    },
    async get(key) {
      return alive(key) ? clone(data.get(key)) : null;
    },
    async set(key, value) {
      data.set(key, clone(value));
      expires.delete(key);
      return 'OK';
    },
    async incr(key) {
      const next = (alive(key) ? Number(data.get(key)) : 0) + 1;
      data.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      if (!alive(key)) return 0;
      expires.set(key, Date.now() + seconds * 1000);
      return 1;
    },
    async zadd(key, { score, member }) {
      if (!alive(key)) data.set(key, new Map());
      data.get(key).set(member, score);
      return 1;
    },
    async zremrangebyscore(key, min, max) {
      if (!alive(key)) return 0;
      let removed = 0;
      for (const [member, score] of data.get(key)) {
        if (score >= min && score <= max) {
          data.get(key).delete(member);
          removed += 1;
        }
      }
      return removed;
    },
    async zcard(key) {
      return alive(key) ? data.get(key).size : 0;
    },
    async lpush(key, ...values) {
      if (!alive(key)) data.set(key, []);
      data.get(key).unshift(...values.reverse().map(clone));
      return data.get(key).length;
    },
    async ltrim(key, start, stop) {
      if (alive(key)) data.set(key, data.get(key).slice(start, stop + 1));
      return 'OK';
    },
    async lrange(key, start, stop) {
      if (!alive(key)) return [];
      return clone(data.get(key).slice(start, stop === -1 ? undefined : stop + 1));
    },
  };
}

// Сохраняем экземпляр между горячими перезагрузками в режиме разработки.
const globalStore = globalThis;

export const db =
  storageKind === 'redis'
    ? new Redis({ url, token })
    : (globalStore.__memoryStore ??= createMemoryStore());

if (storageKind === 'memory' && process.env.NODE_ENV === 'production') {
  console.warn('[store] KV_REST_API_URL/KV_REST_API_TOKEN не заданы: данные хранятся в памяти и пропадут при перезапуске.');
}
