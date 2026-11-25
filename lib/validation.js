// Проверка данных, приходящих с клиента. Без зависимостей от Next.js —
// покрыта тестами (tests/validation.test.js).

export class ValidationError extends Error {}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function text(value, { field, min = 0, max }) {
  const v = value ?? '';
  if (typeof v !== 'string') throw new ValidationError(`${field}: ожидается текст`);
  const s = v.trim();
  if (s.length < min) {
    throw new ValidationError(min === 1 ? `${field}: обязательное поле` : `${field}: минимум ${min} символа`);
  }
  if (s.length > max) throw new ValidationError(`${field}: не длиннее ${max} символов`);
  return s;
}

function link(value, { field, protocols, required = false, max = 500 }) {
  const s = text(value, { field, min: required ? 1 : 0, max });
  if (!s) return '';
  let parsed;
  try {
    parsed = new URL(s);
  } catch {
    throw new ValidationError(`${field}: некорректная ссылка`);
  }
  if (!protocols.includes(parsed.protocol)) {
    const allowed = protocols.map((p) => p.replace(':', '')).join(', ');
    throw new ValidationError(`${field}: допустимы только ссылки ${allowed}`);
  }
  return s;
}

function list(value, { field, max }) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new ValidationError(`${field}: ожидается список`);
  if (value.length > max) throw new ValidationError(`${field}: не больше ${max} элементов`);
  return value;
}

function item(value, field) {
  if (!isObject(value)) throw new ValidationError(`${field}: некорректные данные`);
  return value;
}

/** Профиль, который редактируется в /admin. */
export function validateProfile(input) {
  if (!isObject(input)) throw new ValidationError('Некорректные данные профиля');

  return {
    name: text(input.name, { field: 'Имя', min: 1, max: 80 }),
    title: text(input.title, { field: 'Должность', max: 120 }),
    location: text(input.location, { field: 'Город', max: 80 }),
    about: text(input.about, { field: 'О себе', max: 2000 }),
    avatarUrl: link(input.avatarUrl, { field: 'Аватар', protocols: ['https:'] }),
    skills: list(input.skills, { field: 'Навыки', max: 30 }).map((s, i) =>
      text(s, { field: `Навык №${i + 1}`, min: 1, max: 40 }),
    ),
    contacts: list(input.contacts, { field: 'Контакты', max: 10 }).map((c, i) => {
      const n = `Контакт №${i + 1}`;
      item(c, n);
      return {
        label: text(c.label, { field: `${n}, название`, min: 1, max: 40 }),
        url: link(c.url, {
          field: `${n}, ссылка`,
          protocols: ['https:', 'http:', 'mailto:', 'tel:'],
          required: true,
          max: 300,
        }),
      };
    }),
    projects: list(input.projects, { field: 'Проекты', max: 12 }).map((p, i) => {
      const n = `Проект №${i + 1}`;
      item(p, n);
      return {
        title: text(p.title, { field: `${n}, название`, min: 1, max: 80 }),
        description: text(p.description, { field: `${n}, описание`, max: 300 }),
        // только https: http-страницы браузер не покажет во iframe на https-сайте
        url: link(p.url, { field: `${n}, ссылка`, protocols: ['https:'], required: true }),
      };
    }),
  };
}

/** Заявка из формы обратной связи. Поле website — ловушка для ботов. */
export function validateLead(input) {
  if (!isObject(input)) throw new ValidationError('Некорректные данные заявки');
  return {
    name: text(input.name, { field: 'Имя', min: 1, max: 80 }),
    contact: text(input.contact, { field: 'Контакт', min: 3, max: 120 }),
    message: text(input.message, { field: 'Сообщение', min: 1, max: 2000 }),
    isBot: typeof input.website === 'string' && input.website.trim() !== '',
  };
}

const VISITOR_ID = /^[A-Za-z0-9-]{8,64}$/;
export const isVisitorId = (v) => typeof v === 'string' && VISITOR_ID.test(v);
