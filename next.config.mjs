// Один и тот же код собирается в трёх режимах:
//  1. Vercel          — `next build`: страницы + серверные API-функции.
//  2. Docker          — DOCKER_BUILD=1: standalone-сервер Node.js для контейнера.
//  3. GitHub Pages    — NEXT_PUBLIC_STATIC_EXPORT=1: только статические HTML/CSS/JS.
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const isDocker = process.env.DOCKER_BUILD === '1';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Страницы и layout имеют расширение .jsx, серверные обработчики
  // (app/api/**/route.js) — .js. В статической сборке Next.js видит только
  // .jsx, поэтому API просто не попадает в сборку для GitHub Pages.
  pageExtensions: isStatic ? ['jsx'] : ['jsx', 'js'],

  ...(isStatic
    ? {
        output: 'export',
        // Сайт на Pages живёт по адресу https://<user>.github.io/<repo>/
        basePath: process.env.PAGES_BASE_PATH || '',
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),

  ...(isDocker && { output: 'standalone' }),
};

export default nextConfig;
