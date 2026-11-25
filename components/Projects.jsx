'use client';

import { useEffect, useRef, useState } from 'react';

const SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups';

export default function Projects({ projects }) {
  const [active, setActive] = useState(null);
  const dialogRef = useRef(null);
  const project = active === null ? null : projects[active];

  useEffect(() => {
    if (project) dialogRef.current?.showModal();
  }, [project]);

  if (projects.length === 0) return <p className="muted">Проекты пока не добавлены.</p>;

  return (
    <>
      <ul className="projects">
        {projects.map((p, i) => (
          <li key={p.url + i} className="project card">
            <div className="project-preview">
              {/* уменьшенная «живая» копия сайта; клики по ней перехватывает кнопка сверху */}
              <iframe src={p.url} title={`Превью: ${p.title}`} loading="lazy" sandbox={SANDBOX} tabIndex={-1} aria-hidden="true" referrerPolicy="no-referrer" />
              <button type="button" className="project-open" onClick={() => setActive(i)} aria-label={`Открыть проект «${p.title}» на весь экран`}>
                <span>Развернуть ⤢</span>
              </button>
            </div>
            <div className="project-body">
              <h3>{p.title}</h3>
              {p.description && <p>{p.description}</p>}
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="project-link">
                {new URL(p.url).host} ↗
              </a>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        className="project-dialog"
        onClose={() => setActive(null)}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current.close()}
      >
        {project && (
          <div className="dialog-inner">
            <div className="dialog-bar">
              <strong>{project.title}</strong>
              <span className="dialog-hint">Пустой экран? Сайт запрещает встраивание — откройте в новой вкладке.</span>
              <a className="button button-ghost" href={project.url} target="_blank" rel="noopener noreferrer">
                В новой вкладке ↗
              </a>
              <button type="button" className="button" onClick={() => dialogRef.current.close()}>
                Закрыть ✕
              </button>
            </div>
            <iframe src={project.url} title={project.title} sandbox={SANDBOX} referrerPolicy="no-referrer" />
          </div>
        )}
      </dialog>
    </>
  );
}
