// src/app/cliente/[id]/layout.tsx - SEU LAYOUT DE MENU, NO LUGAR CERTO
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBars, FaTimes } from 'react-icons/fa';
import { auth } from '@/firebase/config';

// O import do globals.css é feito apenas no layout raiz, não precisa aqui.

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Extrai uid para gerar links dinâmicos
  const parts = pathname.split('/');
  const uid = parts[2] || auth.currentUser?.uid || '';
  const base = `/cliente/${uid}`;

  const menuItems = [
    { href: `${base}/dashboard`, label: 'Meu Painel' },
    { href: `${base}/cadastrar-despesas`, label: 'Lançar Despesas' },
    { href: `${base}/despesas`, label: 'Despesas' },
    { href: `${base}/cartoes`, label: 'Cartões' },
    { href: `${base}/assinaturas`, label: 'Assinaturas' },
  ];

  return (
    <div className="min-h-screen"> {/* Div principal em vez de <html> e <body> */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 text-white"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu de navegação"
      >
        <FaBars size={24} />
      </button>

      {/* Overlay do menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black opacity-75"
            onClick={() => setIsOpen(false)}
          />
          <nav className="relative w-72 bg-[#0f1f1f] h-full p-6">
            <button
              type="button"
              className="absolute top-4 right-4 text-white"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar menu de navegação"
            >
              <FaTimes size={24} />
            </button>
            <img
              src="/logo.png"
              alt="LoveMoney"
              className="w-32 mb-8 mx-auto"
            />
            {menuItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`block py-2 px-3 rounded my-2 font-bold ${
                  pathname === item.href ? 'bg-yellow-400 text-black' : 'hover:bg-gray-700'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="absolute bottom-6 left-6 flex items-center space-x-2">
              <img
                src={auth.currentUser?.photoURL || '/logo.png'}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <Link href={`${base}/perfil`} className="text-sm font-bold text-white">
                Perfil
              </Link>
            </div>
          </nav>
        </div>
      )}

      {/* Conteúdo principal com padding para não ficar embaixo do botão do menu */}
      <main className="w-full p-6 pt-16">
        {children}
      </main>
    </div>
  );
}