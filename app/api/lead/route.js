import { clientIp, handleError, isSameOrigin, json, rateLimit, readJson } from '@/lib/http';
import { saveLead } from '@/lib/leads';
import { notifyLead } from '@/lib/telegram';
import { validateLead } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    if (!isSameOrigin(request)) return json({ error: 'Запрос с чужого сайта' }, 403);
    if (!(await rateLimit(`lead:${clientIp(request)}`, 3, 10 * 60))) {
      return json({ error: 'Слишком много заявок. Попробуйте через 10 минут.' }, 429);
    }

    const { isBot, ...data } = validateLead(await readJson(request));
    if (isBot) return json({ ok: true }); // бот заполнил скрытое поле — делаем вид, что всё хорошо

    const lead = await saveLead(data);
    const telegram = await notifyLead(lead);
    return json({ ok: true, telegram: telegram.sent });
  } catch (error) {
    return handleError(error);
  }
}
