const escapeHtml = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

export const isTelegramConfigured = () =>
  Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/** Отправляет уведомление о новой заявке в Telegram через Bot API. */
export async function notifyLead(lead) {
  if (!isTelegramConfigured()) return { sent: false, reason: 'not-configured' };

  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(lead.createdAt));

  const text = [
    '📩 <b>Новая заявка с сайта</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(lead.name)}`,
    `<b>Контакт:</b> ${escapeHtml(lead.contact)}`,
    `<b>Сообщение:</b>\n${escapeHtml(lead.message)}`,
    '',
    `🕒 ${date} (МСК)`,
  ].join('\n');

  try {
    const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const { description } = await res.json().catch(() => ({}));
      console.error(`[telegram] ошибка ${res.status}: ${description || 'нет описания'}`);
      return { sent: false, reason: 'api-error' };
    }
    return { sent: true };
  } catch (error) {
    console.error('[telegram] не удалось отправить сообщение:', error.message);
    return { sent: false, reason: 'network-error' };
  }
}
