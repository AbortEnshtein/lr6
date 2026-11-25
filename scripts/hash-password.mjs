// Генерирует хеш пароля для переменной ADMIN_PASSWORD_HASH.
// Запуск: make hash   (или: node scripts/hash-password.mjs "пароль")
import { createInterface } from 'node:readline';
import { hashPassword } from '../lib/crypto.js';

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.startsWith(question)) rl.output.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const password = process.argv[2] ?? (await askHidden('Пароль: '));
if (!password || password.length < 8) {
  console.error('Пароль должен быть не короче 8 символов.');
  process.exit(1);
}
console.log(`\nADMIN_PASSWORD_HASH=${hashPassword(password)}\n`);
