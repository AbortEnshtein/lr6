import { getSessionUser, missingAuthConfig } from '@/lib/auth';
import { json } from '@/lib/http';
import { storageKind } from '@/lib/store';
import { isTelegramConfigured } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ authenticated: false, configured: missingAuthConfig().length === 0 });
  return json({ authenticated: true, user, storage: storageKind, telegram: isTelegramConfigured() });
}
