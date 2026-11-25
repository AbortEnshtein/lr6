// NEXT_PUBLIC_* переменные подставляются в код на этапе сборки,
// поэтому флаг одинаково доступен и на сервере, и в браузере.
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';

// Ссылка на полную версию сайта (Vercel) — показывается на GitHub Pages.
export const FULL_SITE_URL = process.env.NEXT_PUBLIC_FULL_SITE_URL || '';

/** Где и из какого коммита запущен сайт — видно в подвале страницы. */
export function getDeployInfo() {
  const target = IS_STATIC
    ? 'GitHub Pages'
    : process.env.VERCEL === '1'
      ? 'Vercel'
      : process.env.DEPLOY_TARGET || 'локальный сервер';

  const sha = process.env.COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
  return { target, commit: sha ? sha.slice(0, 7) : '' };
}
