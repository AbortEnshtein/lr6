import './globals.css';

export const metadata = {
  title: 'Сайт-визитка',
  description: 'Сайт-визитка с автодеплоем через GitHub Actions, Vercel и Docker',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
