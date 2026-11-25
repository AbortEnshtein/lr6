// Проверяет логин и пароль по значениям из .env — без запуска сайта и без сети.
// Запуск: make check-login
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { authFingerprint, safeEqual, verifyPassword } from '../lib/crypto.js';

function readEnv(path) {
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

// один интерфейс на оба вопроса; при вводе пароля печатается только приглашение
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
const write = rl._writeToOutput.bind(rl);
let hiddenPrompt = null;
rl._writeToOutput = (s) => {
  if (hiddenPrompt === null) return write(s);
  const i = s.indexOf(hiddenPrompt);
  if (i !== -1) write(s.slice(0, i + hiddenPrompt.length));
};
const lines = rl[Symbol.asyncIterator](); // буферизует строки, ни одна не теряется
async function ask(question, hidden = false) {
  hiddenPrompt = hidden ? question : null;
  rl.setPrompt(question);
  rl.prompt();
  const { value } = await lines.next();
  if (hidden) process.stdout.write('\n');
  hiddenPrompt = null;
  return value ?? '';
}

const env = readEnv('.env');
const username = await ask('Логин: ');
const password = await ask('Пароль (не отображается): ', true);
rl.close();

const userOk = safeEqual(username.trim(), (env.ADMIN_USERNAME ?? '').trim());
const passOk = verifyPassword(password, env.ADMIN_PASSWORD_HASH ?? '');

console.log(`\nЛогин:  ${userOk ? 'совпадает' : `НЕ совпадает (в .env ${String(env.ADMIN_USERNAME ?? '').length} символов, введено ${username.length})`}`);
console.log(`Пароль: ${passOk ? 'совпадает с хешем' : 'НЕ совпадает с хешем'}`);
if (/[а-яё]/i.test(password)) console.log('Внимание: в пароле есть русские буквы — проверьте раскладку.');
console.log(`\nОтпечаток .env: ${authFingerprint(env.ADMIN_USERNAME, env.ADMIN_PASSWORD_HASH)}`);
console.log('Сравните с полем "fingerprint" на странице <адрес сайта>/api/auth/session');
