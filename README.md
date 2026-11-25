# Сайт-визитка с CI/CD

![CI/CD](https://github.com/AbortEnshtein/lr6/actions/workflows/deploy.yml/badge.svg)

Лабораторная работа №6 «Автоматизация развёртывания проекта с помощью GitHub Actions».

Один и тот же код (Next.js) автоматически публикуется тремя способами:

| | GitHub Pages | Vercel | Docker (GHCR) |
|---|---|---|---|
| Как публикуется | workflow `.github/workflows/deploy.yml` | нативная интеграция с GitHub, без YAML | тот же workflow: образ → smoke-тест → `ghcr.io` |
| Что публикуется | только статические HTML/CSS/JS | страницы + серверные функции | Node.js-сервер в контейнере |
| Визитка и проекты (iframe) | ✅ | ✅ | ✅ |
| Редактор с входом по паролю | ❌ | ✅ | ✅ |
| Счётчик посещений в реальном времени | ❌ | ✅ | ✅ |
| Заявки и уведомления в Telegram | ❌ | ✅ | ✅ |
| База данных | — | Upstash Redis | Redis в соседнем контейнере |
| Секреты (токен бота, хеш пароля) | недоступны | Environment Variables | файл `.env` |

## Возможности

- **Визитка**: имя, должность, о себе, навыки, контакты.
- **Проекты** показываются как живые миниатюры через `iframe`. По клику проект раскрывается на весь экран.
- **Посещаемость в реальном времени**: «сейчас на сайте», «сегодня», «всего». Цифры приходят с сервера через Server-Sent Events.
- **Форма заявки**: заявка сохраняется в базу, а бот присылает уведомление в Telegram. От спама защищают поле-ловушка и ограничение частоты.
- **Редактор `/admin`** открывается после входа по логину и паролю. Пароль хранится только как хеш scrypt с солью, сессия хранится в подписанной HMAC cookie (`httpOnly`, `SameSite=Strict`). От перебора пароля стоит ограничение: 5 попыток за 15 минут.
- В подвале показано, **где запущена копия сайта и из какого коммита**. По этой подписи на скриншотах видно, что сайт обновился автоматически.

## Локальный запуск (нужен только Docker)

```bash
cp .env.example .env
make hash      # ввести пароль → скопировать строку ADMIN_PASSWORD_HASH=... в .env
make secret    # скопировать SESSION_SECRET=... в .env
# заполнить TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env
make up        # http://localhost:3000, редактор — http://localhost:3000/admin
```

Остальные команды выводит `make help`. Главные из них:
- `make check` — линтеры и тесты;
- `make static` — статическая сборка для Pages в папку `./out`;
- `make logs` — логи сайта;
- `make down` — остановить контейнеры.

## Настройка Telegram

1. В [@BotFather](https://t.me/BotFather) выполните `/newbot` и скопируйте токен в `TELEGRAM_BOT_TOKEN`.
2. Найдите своего бота и нажмите **Start**. Без этого бот не сможет вам написать.
3. Узнайте свой id у [@userinfobot](https://t.me/userinfobot) и запишите его в `TELEGRAM_CHAT_ID`.

## Публикация

### GitHub Pages
1. **Settings → Pages → Build and deployment → Source: GitHub Actions.** Вариант «Deploy from a branch» здесь не подходит: сайт сначала нужно собрать.
2. Необязательно: в **Settings → Secrets and variables → Actions → Variables** создайте переменную `FULL_SITE_URL` со ссылкой на Vercel. Тогда в статической версии появится ссылка на полную.
3. Сделайте push в `main`. Workflow проверит код, соберёт статику и опубликует её.

### Vercel
1. На [vercel.com](https://vercel.com) выберите **Add New → Project → Import** этого репозитория. Framework определится сам (Next.js).
2. Откройте **Storage → Create Database → Upstash for Redis** и подключите базу к проекту. Переменные `KV_REST_API_*` добавятся сами.
3. В **Settings → Environment Variables** добавьте `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
4. Выполните **Redeploy**. После этого каждый push в `main` публикуется автоматически.

### Docker-образ
Каждый push в `main` собирает образ, запускает его вместе с Redis, прогоняет `scripts/smoke-test.sh` и публикует образ в `ghcr.io/<user>/<repo>`. Найти его можно на странице репозитория в разделе **Packages**.

## Пайплайн CI/CD

```
push → check (ESLint + Stylelint + тесты) ─┬─ pages-build → pages-deploy   → GitHub Pages
                                           └─ docker: build → smoke-тест → push в GHCR
push → Vercel (сам, по вебхуку GitHub)                                     → Vercel
```

Если проверки не прошли, ничего не публикуется. Для pull request выполняются только проверки, без публикации.

## Структура

```
app/              страницы (*.jsx) и API (app/api/**/route.js)
components/       клиентские компоненты: проекты, счётчик, форма, редактор
lib/              хранилище, авторизация, валидация, Telegram
data/             профиль по умолчанию (он же — контент для GitHub Pages)
tests/            юнит-тесты (node --test)
scripts/          хеширование пароля, smoke-тест
Dockerfile        стадии: check / static / runner
compose.yaml      сайт + Redis + Upstash-совместимый REST-прокси
```

Почему API не попадает на Pages: страницы имеют расширение `.jsx`, а серверные обработчики `.js`. В статической сборке `next.config.mjs` разрешает только `.jsx`, поэтому серверного кода в сборке нет.
