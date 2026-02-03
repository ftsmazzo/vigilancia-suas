import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vigilância Socioassistencial',
  description: 'Aplicação de dados e manutenção - Vigilância',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
