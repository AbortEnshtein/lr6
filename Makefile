# Всё запускается в Docker — Node.js на компьютере не нужен.
NODE = docker run --rm -v "$(CURDIR)":/app -w /app -u $$(id -u):$$(id -g) -e npm_config_cache=/tmp/.npm node:22-alpine

.PHONY: help up down logs check static hash secret lock clean

help: ## Список команд
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

up: ## Собрать и запустить сайт + Redis (http://localhost:3000)
	docker compose up -d --build --wait
	@echo "Сайт: http://localhost:$${APP_PORT:-3000}"

down: ## Остановить контейнеры (данные Redis сохраняются)
	docker compose down

logs: ## Логи приложения
	docker compose logs -f app

check: ## Линтеры и тесты (то же, что в CI)
	docker build --target check .

static: ## Собрать статическую версию для GitHub Pages в ./out
	docker build --target static -o out .

hash: ## Получить хеш пароля для ADMIN_PASSWORD_HASH
	@docker run --rm -it -v "$(CURDIR)":/app:ro -w /app node:22-alpine node scripts/hash-password.mjs

secret: ## Сгенерировать SESSION_SECRET
	@docker run --rm node:22-alpine node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

lock: ## Обновить package-lock.json после правки package.json
	$(NODE) npm install --package-lock-only

clean: ## Удалить контейнеры ВМЕСТЕ с данными Redis
	docker compose down -v
