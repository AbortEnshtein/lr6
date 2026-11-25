import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ValidationError, isVisitorId, validateLead, validateProfile } from '../lib/validation.js';

const valid = {
  name: '  Иван  ',
  title: 'Разработчик',
  skills: ['HTML', 'CSS'],
  contacts: [{ label: 'Почта', url: 'mailto:me@example.com' }],
  projects: [{ title: 'Сайт', description: '', url: 'https://example.com' }],
};

test('корректный профиль проходит и очищается от пробелов', () => {
  const p = validateProfile(valid);
  assert.equal(p.name, 'Иван');
  assert.equal(p.location, '');
  assert.deepEqual(p.skills, ['HTML', 'CSS']);
});

test('опасные и неподходящие ссылки отклоняются', () => {
  assert.throws(
    () => validateProfile({ ...valid, contacts: [{ label: 'x', url: 'javascript:alert(1)' }] }),
    ValidationError,
  );
  assert.throws(
    () => validateProfile({ ...valid, projects: [{ title: 'x', url: 'http://example.com' }] }),
    /https/,
  );
  assert.throws(() => validateProfile({ ...valid, avatarUrl: 'data:image/png;base64,AAAA' }), ValidationError);
});

test('обязательные поля и лимиты', () => {
  assert.throws(() => validateProfile({ ...valid, name: '   ' }), /обязательное/);
  assert.throws(() => validateProfile({ ...valid, about: 'a'.repeat(2001) }), /2000/);
  assert.throws(() => validateProfile({ ...valid, skills: Array(31).fill('x') }), /30/);
  assert.throws(() => validateProfile(null), ValidationError);
});

test('заявка: проверка полей и ловушка для ботов', () => {
  const lead = validateLead({ name: 'Петя', contact: '@petya', message: 'Привет' });
  assert.equal(lead.isBot, false);
  assert.equal(validateLead({ name: 'a', contact: 'abc', message: 'b', website: 'spam.com' }).isBot, true);
  assert.throws(() => validateLead({ name: 'a', contact: 'ab', message: 'b' }), /Контакт/);
});

test('идентификатор посетителя', () => {
  assert.equal(isVisitorId('0b8f8c2e-1c1d-4b3a-9f50-6d3c2a1b0e9f'), true);
  assert.equal(isVisitorId('../../etc'), false);
  assert.equal(isVisitorId(undefined), false);
});
