import { clientIp, handleError, json, rateLimit } from '@/lib/http';
import { registerVisit } from '@/lib/visits';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!(await rateLimit(`visit:${clientIp(request)}`, 30, 60))) {
      return json({ error: 'Слишком много запросов' }, 429);
    }
    return json(await registerVisit());
  } catch (error) {
    return handleError(error);
  }
}
