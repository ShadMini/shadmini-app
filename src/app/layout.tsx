import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ShadMini AI',
  description: 'تطبيق ShadMini AI - مساعدك الذكي متعدد النماذج',
  icons: { icon: '/logo.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
