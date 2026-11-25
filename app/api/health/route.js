import { db, storageKind, storageSource } from '@/lib/store';

export const dynamic = 'force-dynamic';

// Проверка «жив ли сервис» — её используют Docker HEALTHCHECK и CI.
export async function GET() {
  let database = 'ok';
  try {
    await db.ping();
  } catch {
    database = 'error';
  }
  const ok = database === 'ok';
  return Response.json({ ok, storage: storageKind, source: storageSource, database }, { status: ok ? 200 : 503 });
}
