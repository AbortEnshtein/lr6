import { getSessionUser, missingAuthConfig } from '@/lib/auth';
import { authFingerprint } from '@/lib/crypto';
import { json } from '@/lib/http';
import { storageKind } from '@/lib/store';
import { isTelegramConfigured } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return json({
      authenticated: false,
      configured: missingAuthConfig().length === 0,
      // сравните с выводом `make check-login`: совпадает — значит, на хостинге те же логин и хеш
      fingerprint: authFingerprint(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD_HASH),
    });
  }
  return json({ authenticated: true, user, storage: storageKind, telegram: isTelegramConfigured() });
}
