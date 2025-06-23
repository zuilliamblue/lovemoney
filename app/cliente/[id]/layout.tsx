// src/app/cliente/[id]/layout.tsx
'use client'; // Manter esta diretiva

import React from 'react';
// import Head from 'next/head'; // Removido, Head de next/head não é ideal para layouts no App Router.
// Se precisar de meta tags dinâmicas no futuro, use `generateMetadata` ou adicione <head> dentro do componente

interface ClienteLayoutProps {
  children: React.ReactNode;
  params: {
    id: string; // Garantimos que 'id' é uma string
  };
}

export default function ClientLayout({ children, params }: ClienteLayoutProps) {
  // Acesso ao ID do cliente logado via params
  const { id } = params;

  // Você pode adicionar elementos de layout específicos para a área do cliente aqui,
  // como uma barra lateral de navegação ou um cabeçalho.
  // Por exemplo, um link para o perfil ou para deslogar pode usar o `id` aqui.

  return (
    <>
      {/*
        Considerando que você já tem um RootLayout (layout-principal.tsx) que envolve todo o app,
        este ClienteLayout pode focar em elementos específicos da área do cliente,
        sem duplicar <html> ou <body>.
        Ele renderiza os `children` (as páginas internas como dashboard, despesas, etc.).
      */}
      <div className="flex min-h-screen bg-black">
        {/* Exemplo de barra lateral (pode ser um componente separado) */}
        <aside className="w-64 bg-[#0f1f1f] text-white p-4 hidden md:block"> {/* Escondido em telas pequenas */}
          <h2 className="text-xl font-bold mb-4">Bem-vindo(a)!</h2>
          <p className="text-sm text-gray-300">ID do Cliente: {id}</p> {/* Mostra o ID do cliente */}
          {/* Adicione links específicos do cliente aqui */}
          <nav className="mt-6">
            <ul>
              <li className="mb-2"><a href={`/cliente/${id}/dashboard`} className="block py-2 px-3 rounded hover:bg-yellow-400 hover:text-black transition">Dashboard</a></li>
              <li className="mb-2"><a href={`/cliente/${id}/despesas`} className="block py-2 px-3 rounded hover:bg-yellow-400 hover:text-black transition">Despesas</a></li>
              <li className="mb-2"><a href={`/cliente/${id}/cartoes`} className="block py-2 px-3 rounded hover:bg-yellow-400 hover:text-black transition">Cartões</a></li>
              {/* Adicione mais links conforme necessário */}
            </ul>
          </nav>
        </aside>

        {/* Conteúdo principal da área do cliente */}
        <main className="flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </>
  );
}