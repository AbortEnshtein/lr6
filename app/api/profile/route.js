import { getSessionUser } from '@/lib/auth';
import { handleError, isSameOrigin, json, readJson } from '@/lib/http';
import { getProfile, saveProfile } from '@/lib/profile';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return json(await getProfile());
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request) {
  try {
    if (!isSameOrigin(request)) return json({ error: 'Запрос с чужого сайта' }, 403);
    if (!(await getSessionUser())) return json({ error: 'Требуется вход' }, 401);
    return json({ ok: true, profile: await saveProfile(await readJson(request)) });
  } catch (error) {
    return handleError(error);
  }
}
