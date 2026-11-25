import Link from 'next/link';
import AdminApp from '@/components/AdminApp';
import { FULL_SITE_URL, IS_STATIC } from '@/lib/config';

export const metadata = {
  title: 'Редактор',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  if (IS_STATIC) {
    return (
      <main className="container narrow">
        <div className="card admin-card">
          <h1>Редактор недоступен</h1>
          <p>
            На GitHub Pages нет сервера и базы данных, поэтому войти и сохранить изменения здесь нельзя.
          </p>
          <p className="row">
            <Link className="button button-ghost" href="/">
              ← На сайт
            </Link>
            {FULL_SITE_URL && (
              <a className="button" href={`${FULL_SITE_URL.replace(/\/$/, '')}/admin`}>
                Редактор на полной версии
              </a>
            )}
          </p>
        </div>
      </main>
    );
  }
  return <AdminApp />;
}
