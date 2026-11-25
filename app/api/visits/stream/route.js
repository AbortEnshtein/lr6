import { isVisitorId } from '@/lib/validation';
import { heartbeat, readStats } from '@/lib/visits';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TICK_MS = 2000;
// Serverless-функция не может держать соединение вечно: через ~25 с закрываем
// поток, и браузерный EventSource сам переподключится через 1 с (retry).
const LIFETIME_MS = 25_000;

// Server-Sent Events: сервер сам «проталкивает» свежую статистику в браузер.
export async function GET(request) {
  const vid = new URL(request.url).searchParams.get('vid');
  const visitorId = isVisitorId(vid) ? vid : null;
  const encoder = new TextEncoder();
  let timer;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const startedAt = Date.now();
      let last = '';

      const send = (chunk) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        controller.close();
      };
      request.signal.addEventListener('abort', close);

      const tick = async () => {
        if (closed) return;
        try {
          if (visitorId) await heartbeat(visitorId);
          const payload = JSON.stringify(await readStats());
          // шлём данные только при изменении, иначе — комментарий-«пинг»
          send(payload !== last ? `data: ${payload}\n\n` : ': ping\n\n');
          last = payload;
        } catch (error) {
          console.error('[visits/stream]', error.message);
        }
        if (Date.now() - startedAt > LIFETIME_MS) return close();
        timer = setTimeout(tick, TICK_MS);
      };

      send('retry: 1000\n\n');
      tick();
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
