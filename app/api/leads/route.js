import { getSessionUser } from '@/lib/auth';
import { handleError, json } from '@/lib/http';
import { listLeads } from '@/lib/leads';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!(await getSessionUser())) return json({ error: 'Требуется вход' }, 401);
    return json({ leads: await listLeads() });
  } catch (error) {
    return handleError(error);
  }
}
