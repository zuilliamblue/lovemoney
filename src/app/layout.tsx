// src/app/layout.tsx - VERSÃO CORRETA E FINAL
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LoveMoney • Controle Financeiro',
  description: 'Gerencie suas finanças de forma simples e inteligente com o LoveMoney.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full bg-black">
      <body className="h-full">{children}</body>
    </html>
  );
}