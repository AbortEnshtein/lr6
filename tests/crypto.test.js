import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, safeEqual, signSession, verifyPassword, verifySession } from '../lib/crypto.js';

const SECRET = 'x'.repeat(64);

test('пароль проверяется по своему хешу', () => {
  const hash = hashPassword('s3cret-пароль');
  assert.match(hash, /^scrypt:16384:8:1:[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword('s3cret-пароль', hash), true);
});

test('неверный пароль и битый хеш отклоняются', () => {
  const hash = hashPassword('right');
  assert.equal(verifyPassword('wrong', hash), false);
  assert.equal(verifyPassword('right', ''), false);
  assert.equal(verifyPassword('right', 'scrypt:1:2:3:zz:zz'), false);
  assert.equal(verifyPassword('right', hash.replace('scrypt', 'bcrypt')), false);
});

test('у одинаковых паролей разные хеши (соль)', () => {
  assert.notEqual(hashPassword('same'), hashPassword('same'));
});

test('safeEqual сравнивает строки', () => {
  assert.equal(safeEqual('admin', 'admin'), true);
  assert.equal(safeEqual('admin', 'admin2'), false);
});

test('подписанная сессия проверяется', () => {
  const token = signSession({ u: 'admin', exp: Date.now() + 60_000 }, SECRET);
  assert.equal(verifySession(token, SECRET)?.u, 'admin');
});

test('подделанная, чужая и просроченная сессии отклоняются', () => {
  const token = signSession({ u: 'admin', exp: Date.now() + 60_000 }, SECRET);
  const forged = Buffer.from(JSON.stringify({ u: 'hacker', exp: Date.now() + 60_000 })).toString('base64url');
  assert.equal(verifySession(`${forged}.${token.split('.')[1]}`, SECRET), null);
  assert.equal(verifySession(token, 'y'.repeat(64)), null);
  assert.equal(verifySession(signSession({ u: 'admin', exp: Date.now() - 1 }, SECRET), SECRET), null);
  assert.equal(verifySession(undefined, SECRET), null);
});
