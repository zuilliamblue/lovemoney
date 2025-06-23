// src/app/cliente/[id]/cartoes/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  getDocs,
  query, // Embora não usado explicitamente aqui, pode ser necessário para futuras extensões.
  where, // Embora não usado explicitamente aqui, pode ser necessário para futuras extensões.
  Timestamp, // Embora não usado explicitamente aqui, pode ser necessário para futuras extensões.
} from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importação específica do locale
import { useTotaisPorCartao } from '../hooks/useTotaisPorCartao';


interface CartaoFirestoreData { // Tipagem para os dados do Firestore
  id: string;
  banco: string;
  vencimento: number;
  fechamento: number;
  apelido?: string;
}

export default function CartoesPage() {
  const params = useParams(); // Use params para acessar o ID
  // Garante que uid seja sempre uma string, mesmo que params.id seja string[] ou undefined
  const uid = typeof params.id === 'string' ? params.id : params.id ? params.id[0] : '';
  const router = useRouter();

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  // O hook useTotaisPorCartao já lida com o uid
  const { totais, loading: loadingTotais, error: errorTotais } = useTotaisPorCartao(uid, anoAtual, mesAtual);

  const [cartoes, setCartoes] = useState<CartaoFirestoreData[]>([]);
  // mesSelecionado não está sendo usado, mas vou mantê-lo se for para uso futuro.
  const [mesSelecionado, setMesSelecionado] = useState<number>(
    new Date().getMonth()
  );


  const meses = [
    'Escolher', // Geralmente para um dropdown de seleção de mês
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  useEffect(() => {
    async function carregarCartoes() {
      if (!uid) { // Não tenta buscar se o UID não estiver disponível
        setCartoes([]);
        return;
      }
      try {
        // uid as string para garantir que o TypeScript aceite
        const ref = collection(db, 'usuarios', uid as string, 'cartoes');
        const snap = await getDocs(ref);
        const lista: CartaoFirestoreData[] = [];
        snap.forEach((doc) => {
          // Cast para o tipo esperado ao pegar os dados do documento
          const data = doc.data() as Omit<CartaoFirestoreData, 'id'>;
          lista.push({
            id: doc.id,
            banco: data.banco,
            vencimento: data.vencimento,
            fechamento: data.fechamento,
            apelido: data.apelido,
          });
        });
        setCartoes(lista);
      } catch (error) {
        console.error("Erro ao carregar cartões:", error);
        // Você pode adicionar um estado de erro aqui para exibir na UI
      }
    }

    carregarCartoes();
  }, [uid]); // Dependência do uid para refetch quando o ID do usuário muda

  return (
    <div className="min-h-screen bg-black text-white p-4">

      {/* Bloco com ícone acima e título abaixo, ambos centralizados */}
      <div className="w-full flex flex-col items-center mb-4">
        {/* Ícone maior (ajuste “text-6xl” para outro tamanho se preferir) */}
        <span className="text-6xl">💳</span>
        {/* Título “Meus Cartões” centralizado abaixo do ícone */}
        <h1 className="text-2xl font-bold mt-2">Meus Cartões</h1>
      </div>

      <Link
        href={`/cliente/${uid}/cadastrar-cartao`}
        className="inline-block mb-6 bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-bold"
      >
        + Cadastrar Cartão
      </Link>

      {loadingTotais && <div className="text-center text-gray-400">Carregando totais dos cartões...</div>}
      {errorTotais && <div className="text-center text-red-500">Erro ao carregar totais: {errorTotais}</div>}

      {/* Lista de cartões */}
      <div className="grid gap-4">
        {cartoes.length === 0 && !loadingTotais && (
            <p className="text-center text-gray-400">Nenhum cartão cadastrado ainda.</p>
        )}
        {cartoes.map((cartao) => (
          <div
            key={cartao.id}
            className="bg-[#1a2a2a] p-4 rounded shadow hover:bg-[#223] cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <Image
                src={`/logos/${cartao.banco}.png`}
                alt={cartao.banco}
                width={50}
                height={50}
                className="rounded-full object-cover"
                onError={(e) => {
                  // Fallback para uma imagem genérica se a logo não for encontrada
                  e.currentTarget.src = '/logos/Outros.png'; // Garanta que 'Outros.png' existe em public/logos
                  e.currentTarget.alt = 'Logo não encontrada';
                }}
              />
              <div>
                <h2 className="font-semibold">
                  {cartao.banco}
                  {cartao.apelido ? ` – ${cartao.apelido}` : ''}
                </h2>
                <p className="text-sm text-white/70">
                  Vencimento: dia {cartao.vencimento}
                </p>
                <p className="text-sm text-white/70">
                  Fechamento: dia {cartao.fechamento}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold text-green-400">
                  {/* Verifica se totais[cartao.id] é um número antes de formatar */}
                  {typeof totais[cartao.id] === 'number'
                    ? totais[cartao.id].toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : 'R$ 0,00'}
                </p>
                <span className="text-xs text-white/40">
                  {/* Formatação da data usando date-fns */}
                  {format(new Date(anoAtual, mesAtual, 1), 'MMMM', {
                    locale: ptBR,
                  }).replace(/\b\w/g, (char) => char.toUpperCase())} {/* Capitaliza a primeira letra do mês */}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}