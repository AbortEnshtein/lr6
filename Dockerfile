# syntax=docker/dockerfile:1
# Один Dockerfile для всего: проверки, статическая сборка для Pages и рабочий образ.
#   docker build --target check .              — линтеры и тесты
#   docker build --target static -o out .      — статический сайт для GitHub Pages
#   docker build .                             — образ с сервером (по умолчанию)

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- зависимости (кешируются, пока не меняется package-lock.json) ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS source
COPY . .

# --- автопроверки качества: ESLint, Stylelint, юнит-тесты ---
FROM source AS check
RUN npm run lint && npm run lint:css && npm test

# --- статическая сборка для GitHub Pages ---
FROM source AS static-build
ARG PAGES_BASE_PATH=""
ARG FULL_SITE_URL=""
ARG COMMIT_SHA=""
ENV PAGES_BASE_PATH=$PAGES_BASE_PATH \
    NEXT_PUBLIC_FULL_SITE_URL=$FULL_SITE_URL \
    COMMIT_SHA=$COMMIT_SHA
RUN npm run build:static

FROM scratch AS static
COPY --from=static-build /app/out /

# --- серверная сборка (Next.js standalone) ---
FROM source AS builder
ENV DOCKER_BUILD=1
RUN npm run build

# --- итоговый образ: только то, что нужно для запуска ---
FROM base AS runner
ARG COMMIT_SHA=""
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DEPLOY_TARGET=Docker \
    COMMIT_SHA=$COMMIT_SHA
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD wget -qO- http://127.0.0.1:3000/api/health > /dev/null || exit 1
CMD ["node", "server.js"]
