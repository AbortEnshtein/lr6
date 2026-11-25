#!/usr/bin/env sh
# Сквозная проверка запущенного сайта (используется в CI после сборки Docker-образа).
# Запуск: sh scripts/smoke-test.sh http://localhost:3000
# Для проверки входа в редактор задайте SMOKE_USER и SMOKE_PASSWORD.
set -eu

BASE="${1:-http://localhost:3000}"
LOGIN="${SMOKE_USER:-}"
PASSWORD="${SMOKE_PASSWORD:-}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

step() { printf '→ %s\n' "$1"; }
fail() { printf '✗ %s\n' "$1" >&2; exit 1; }
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
JSON='Content-Type: application/json'

step "Главная страница открывается"
curl -fsS "$BASE/" | grep -q '<h1' || fail "на главной нет заголовка"

step "Сервис здоров и подключён к Redis"
curl -fsS "$BASE/api/health" | grep -q '"storage":"redis"' || fail "health: нет подключения к Redis"

step "Счётчик посещений увеличивается"
curl -fsS -X POST "$BASE/api/visits" | grep -q '"total"' || fail "POST /api/visits"

step "Поток статистики в реальном времени (SSE)"
curl -sS -N --max-time 4 "$BASE/api/visits/stream?vid=smoke-test-0001" 2>/dev/null | grep -q '^data: ' || fail "SSE не прислал данные"

step "Заявка принимается"
curl -fsS -X POST -H "$JSON" -d '{"name":"CI","contact":"ci@example.com","message":"smoke test"}' "$BASE/api/lead" \
  | grep -q '"ok":true' || fail "POST /api/lead"

step "Без входа редактировать профиль нельзя"
code="$(status -X PUT -H "$JSON" -d '{}' "$BASE/api/profile")"
[ "$code" = 401 ] || fail "ожидался 401, получен $code"

if [ -n "$LOGIN" ]; then
  step "Неверный пароль отклоняется"
  code="$(status -X POST -H "$JSON" -d "{\"username\":\"$LOGIN\",\"password\":\"wrong-password\"}" "$BASE/api/auth/login")"
  [ "$code" = 401 ] || fail "ожидался 401, получен $code"

  step "Вход по логину и паролю"
  curl -fsS -c "$JAR" -X POST -H "$JSON" -d "{\"username\":\"$LOGIN\",\"password\":\"$PASSWORD\"}" \
    "$BASE/api/auth/login" > /dev/null || fail "вход не удался"

  step "Изменение профиля сразу видно на сайте"
  profile="$(curl -fsS "$BASE/api/profile" | sed 's/"name":"[^"]*"/"name":"Smoke Test"/')"
  curl -fsS -b "$JAR" -X PUT -H "$JSON" -d "$profile" "$BASE/api/profile" > /dev/null || fail "PUT /api/profile"
  curl -fsS "$BASE/" | grep -q 'Smoke Test' || fail "новое имя не появилось на главной"

  step "Заявка видна в редакторе"
  curl -fsS -b "$JAR" "$BASE/api/leads" | grep -q 'smoke test' || fail "GET /api/leads"
fi

echo "✓ Все проверки пройдены"
