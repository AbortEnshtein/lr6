import { NextResponse } from 'next/server';
import { checkCredentials, createSessionCookie, missingAuthConfig } from '@/lib/auth';
import { clientIp, handleError, isHttps, isSameOrigin, json, rateLimit, readJson } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isSameOrigin(request)) return json({ error: 'Запрос с чужого сайта' }, 403);

    const missing = missingAuthConfig();
    if (missing.length) {
      return json({ error: `Вход не настроен: задайте ${missing.join(', ')}` }, 503);
    }

    // защита от перебора: 5 попыток за 15 минут с одного IP
    if (!(await rateLimit(`login:${clientIp(request)}`, 5, 15 * 60))) {
      return json({ error: 'Слишком много попыток. Подождите 15 минут.' }, 429);
    }

    const { username, password } = await readJson(request, 2048);
    if (!checkCredentials(username, password)) {
      return json({ error: 'Неверный логин или пароль' }, 401);
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(createSessionCookie(process.env.ADMIN_USERNAME, isHttps(request)));
    return res;
  } catch (error) {
    return handleError(error);
  }
}
