import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findRedisEnv } from '../lib/store.js';

test('находит стандартные переменные Upstash', () => {
  const r = findRedisEnv({ KV_REST_API_URL: 'https://a.upstash.io', KV_REST_API_TOKEN: 't' });
  assert.equal(r.source, 'KV_REST_API_URL');
});

test('пропускает пустые значения и находит переменные с префиксом', () => {
  const r = findRedisEnv({
    KV_REST_API_URL: '',
    KV_REST_API_TOKEN: '',
    STORAGE_KV_REST_API_URL: 'https://b.upstash.io',
    STORAGE_KV_REST_API_TOKEN: 't',
  });
  assert.equal(r.url, 'https://b.upstash.io');
  assert.equal(r.source, 'STORAGE_KV_REST_API_URL');
});

test('без переменных — null (хранилище в памяти)', () => {
  assert.equal(findRedisEnv({ KV_REST_API_URL: 'https://c.upstash.io' }), null);
});
