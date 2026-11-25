import Link from 'next/link';
import { cache } from 'react';
import { connection } from 'next/server';
import defaultProfile from '@/data/default-profile.json';
import { FULL_SITE_URL, IS_STATIC, getDeployInfo } from '@/lib/config';
import LeadForm from '@/components/LeadForm';
import Projects from '@/components/Projects';
import VisitStats from '@/components/VisitStats';

// На GitHub Pages профиль берётся из data/default-profile.json в момент сборки.
// На сервере (Vercel / Docker) — из базы при каждом запросе, поэтому правки
// из редактора видны сразу, без пересборки.
const loadProfile = cache(async () => {
  if (IS_STATIC) return defaultProfile;
  await connection();
  try {
    const { getProfile } = await import('@/lib/profile');
    return await getProfile();
  } catch (error) {
    console.error('[profile] база недоступна, показываю профиль по умолчанию:', error.message);
    return defaultProfile;
  }
});

export async function generateMetadata() {
  const p = await loadProfile();
  return { title: [p.name, p.title].filter(Boolean).join(' — '), description: p.about.slice(0, 160) };
}

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export default async function HomePage() {
  const profile = await loadProfile();
  const deploy = getDeployInfo();

  return (
    <>
      {IS_STATIC && (
        <div className="static-banner" role="note">
          <strong>Статическая версия на GitHub Pages.</strong> Здесь только HTML, CSS и JS без сервера,
          поэтому счётчик посещений, форма заявки и вход в редактор не работают.
          {FULL_SITE_URL && (
            <>
              {' '}
              <a href={FULL_SITE_URL}>Открыть полную версию →</a>
            </>
          )}
        </div>
      )}

      <header className="topbar">
        <div className="container topbar-inner">
          <span className="topbar-name">{profile.name}</span>
          <nav className="topbar-nav" aria-label="Разделы">
            <a href="#projects">Проекты</a>
            <a href="#contact">Связаться</a>
            {!IS_STATIC && <Link href="/admin">Вход</Link>}
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero card">
          <div className="avatar" aria-hidden={!profile.avatarUrl}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- внешняя ссылка из редактора
              <img src={profile.avatarUrl} alt={profile.name} />
            ) : (
              <span>{initials(profile.name)}</span>
            )}
          </div>
          <div className="hero-body">
            <h1>{profile.name}</h1>
            {(profile.title || profile.location) && (
              <p className="hero-meta">{[profile.title, profile.location].filter(Boolean).join(' · ')}</p>
            )}
            {profile.about && <p className="hero-about">{profile.about}</p>}
            {profile.skills.length > 0 && (
              <ul className="chips" aria-label="Навыки">
                {profile.skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            )}
            {profile.contacts.length > 0 && (
              <ul className="contacts">
                {profile.contacts.map((c) => (
                  <li key={c.label + c.url}>
                    <a className="button button-ghost" href={c.url} target="_blank" rel="noopener noreferrer">
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <VisitStats />

        <section id="projects" className="section">
          <h2 className="section-title">Проекты</h2>
          <p className="section-lead">Нажмите на карточку, чтобы открыть проект на весь экран.</p>
          <Projects projects={profile.projects} />
        </section>

        <section id="contact" className="section">
          <h2 className="section-title">Оставить заявку</h2>
          <LeadForm />
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
          <span className="deploy-badge" title="Где запущена эта копия сайта">
            {deploy.target}
            {deploy.commit && <code>{deploy.commit}</code>}
          </span>
        </div>
      </footer>
    </>
  );
}
