// frontend/app/cliente/[id]/dashboard/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import {
  FaSpinner,
  FaPills, // Ícone de pílulas, mas você o usa para 'Assinaturas'
  FaUniversity,
  FaHome,
  FaBolt, // Ícone de raio, você o usa para 'Pix'
  FaFileInvoice
} from 'react-icons/fa';
import { useTotalDespesasCompleto } from '../hooks/useTotalDespesasCompleto';

const formatBRL = (num: number) =>
  num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const catEmojiMap: Record<string, string> = {
  'Trabalho/Empresa': '💼',
  'Aluguel': '🏠',
  'Condomínio': '🏢',
  'Seguros': '🛡️',
  'Farmácia': '💊',
  'Jogos': '🎮',
  'Tabacaria': '🚬',
  'Acessórios': '🎁',
  'Roupas': '👕',
  'Calçados': '👟',
  'Casa': '🏡',
  'Mercado': '🛒',
  'Manutenção Veicular': '🔧',
  'Transporte': '🚌',
  'Internet': '🌐',
  'Luz': '💡',
  'Sabesp/Água': '🚰',
  'Gás': '⛽',
  'Diversão': '🎉',
  'Telefone Fixo': '☎️',
  'Celular': '📱',
  'Segurança': '🔒',
  'Combustível': '⛽',
  'TV': '📺',
  'Streaming': '🎬',
  'Igreja': '⛪',
  'Doações': '🎁',
  'Plano de Saúde': '❤️',
  'Pets': '🐶',
  'Ensino': '📚',
  'Pessoas': '👥',
  'IPVA': '🚗',
  'Multas': '⚠️',
};

// Interface para dados de cartão do Firestore
interface CartaoFirestoreData {
  id: string;
  banco: string;
  fechamento: number;
  vencimento: number; // Adicionado para completude, embora não usado na lógica de "melhores cartões" diretamente.
  apelido?: string;
}

export default function DashboardUsuarioPage() {
  const params = useParams(); // Usar params para acessar o ID
  // Garante que uid seja sempre uma string.
  const uid = typeof params.id === 'string' ? params.id : params.id ? params.id[0] : '';
  const router = useRouter();

  // Hook que retorna total de despesas do mês atual
  // uid as string para garantir que o hook receba o tipo correto
  const {
    total: totalDespesas,
    loading: loadingHook,
    error: errorHook,
  } = useTotalDespesasCompleto(uid as string);

  const [loading, setLoading] = useState<boolean>(true);
  const [assinaturasTotal, setAssinaturasTotal] = useState<number>(0);
  const [boletosTotal, setBoletosTotal] = useState<number>(0);
  const [emprestimosTotal, setEmprestimosTotal] = useState<number>(0);
  const [financiamentosTotal, setFinanciamentosTotal] = useState<number>(0);
  const [pixTotal, setPixTotal] = useState<number>(0);
  const [categoriasTotais, setCategoriasTotais] = useState<Record<string, number>>({});
  const [melhoresCartoes, setMelhoresCartoes] = useState<
    { id: string; banco: string; fechamento: number }[]
  >([]);

  useEffect(() => {
    async function carregarDados() {
      // Se uid não for uma string válida (vazio ou undefined), sai.
      if (!uid) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Intervalo do mês atual
      const hoje = new Date();
      const mesAtual = hoje.getMonth();
      const anoAtual = hoje.getFullYear();
      const primeiroDiaMes = new Date(anoAtual, mesAtual, 1, 0, 0, 0, 0);
      const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59, 999);
      const tsInicioMes = Timestamp.fromDate(primeiroDiaMes);
      const tsFimMes = Timestamp.fromDate(ultimoDiaMes);

      const diaHoje = hoje.getDate();

      let somaAssinaturas = 0;
      let somaBoletos = 0;
      let somaEmprestimos = 0;
      let somaFinanciamentos = 0;
      let somaPix = 0;
      const catMap: Record<string, number> = {};

      try {
        // uid as string para garantir que o TypeScript aceite
        const uidString = uid as string;

        // 1) Assinaturas (coleção 'assinaturas') por 'criadoEm' no mês
        const refAss = collection(db, 'usuarios', uidString, 'assinaturas');
        const qAss = query(
          refAss,
          where('criadoEm', '>=', tsInicioMes),
          where('criadoEm', '<=', tsFimMes)
        );
        const snapAss = await getDocs(qAss);
        snapAss.forEach(docSnap => {
          const data = docSnap.data() as { valor?: number }; // Tipagem para o valor
          somaAssinaturas += Number(data.valor) || 0;
        });

        // 1b) Assinaturas via cartão (subcoleção 'cartoes/{id}/gastos', tipo==='assinaturas', filtrar por 'diaPagamento')
        const cartoesSnap = await getDocs(collection(db, 'usuarios', uidString, 'cartoes'));
        for (const docCart of cartoesSnap.docs) {
          const refGastosCart = collection(db, 'usuarios', uidString, 'cartoes', docCart.id, 'gastos');
          const qCartAss = query(
            refGastosCart,
            where('tipo', '==', 'assinaturas'),
            where('diaPagamento', '>=', tsInicioMes),
            where('diaPagamento', '<=', tsFimMes)
          );
          const snapCartAss = await getDocs(qCartAss);
          snapCartAss.forEach(docSnap => {
            const data = docSnap.data() as { valor?: number };
            somaAssinaturas += Number(data.valor) || 0;
          });
        }
        setAssinaturasTotal(somaAssinaturas);

        // 2) Boletos por 'dataPagamento' no mês
        const refBoletos = collection(db, 'usuarios', uidString, 'boletos');
        const qBoletos = query(
          refBoletos,
          where('dataPagamento', '>=', tsInicioMes),
          where('dataPagamento', '<=', tsFimMes)
        );
        const snapBoletos = await getDocs(qBoletos);
        snapBoletos.forEach(docSnap => {
          const data = docSnap.data() as { valor?: number };
          somaBoletos += Number(data.valor) || 0;
        });
        setBoletosTotal(somaBoletos);

        // 3) Empréstimos por 'dataPagamento' no mês
        const refEmp = collection(db, 'usuarios', uidString, 'emprestimos');
        const qEmp = query(
          refEmp,
          where('dataPagamento', '>=', tsInicioMes),
          where('dataPagamento', '<=', tsFimMes)
        );
        const snapEmp = await getDocs(qEmp);
        snapEmp.forEach(docSnap => {
          const data = docSnap.data() as { valor?: number };
          somaEmprestimos += Number(data.valor) || 0;
        });
        setEmprestimosTotal(somaEmprestimos);

        // 4) Financiamentos por 'dataPagamento' no mês
        const refFin = collection(db, 'usuarios', uidString, 'financiamentos');
        const qFin = query(
          refFin,
          where('dataPagamento', '>=', tsInicioMes),
          where('dataPagamento', '<=', tsFimMes)
        );
        const snapFin = await getDocs(qFin);
        snapFin.forEach(docSnap => {
          const data = docSnap.data() as { valor?: number };
          somaFinanciamentos += Number(data.valor) || 0;
        });
        setFinanciamentosTotal(somaFinanciamentos);

        // 5) Pix por 'dataPagamento' no mês
        const refPix = collection(db, 'usuarios', uidString, 'pix');
        const qPix = query(
          refPix,
          where('dataPagamento', '>=', tsInicioMes),
          where('dataPagamento', '<=', tsFimMes)
        );
        const snapPix = await getDocs(qPix);
        snapPix.forEach(docSnap => {
          const data = docSnap.data() as { valorParcela?: number }; // 'valorParcela' para Pix
          somaPix += Number(data.valorParcela) || 0;
        });
        setPixTotal(somaPix);

        // 6) Gastos por 'data' no mês
        const refGastos = collection(db, 'usuarios', uidString, 'gastos');
        const qGastos = query(
          refGastos,
          where('data', '>=', tsInicioMes),
          where('data', '<=', tsFimMes)
        );
        const snapGastos = await getDocs(qGastos);
        snapGastos.forEach(docSnap => {
          const data = docSnap.data() as { categoria?: string; valor?: number; };
          const cat = data.categoria || 'Outros';
          const val = Number(data.valor) || 0;
          catMap[cat] = (catMap[cat] || 0) + val;
        });

        // 6b) Gastos de cartão no mês (subcoleção 'cartoes/{id}/gastos', filtrar por 'data', exceto tipo==='assinaturas')
        for (const docCart of cartoesSnap.docs) {
          const refGastosCart = collection(db, 'usuarios', uidString, 'cartoes', docCart.id, 'gastos');
          const qCartGastos = query(
            refGastosCart,
            where('data', '>=', tsInicioMes),
            where('data', '<=', tsFimMes)
          );
          const snapCartGastos = await getDocs(qCartGastos);
          snapCartGastos.forEach(docSnap => {
            const data = docSnap.data() as { tipo?: string; categoria?: string; valor?: number; };
            if (data.tipo !== 'assinaturas') {
              const cat = data.categoria || 'Outros';
              const val = Number(data.valor) || 0;
              catMap[cat] = (catMap[cat] || 0) + val;
            }
          });
        }
        setCategoriasTotais(catMap);

        // 7) Melhores Datas dos Cartões (filtrar por fechamento ≥ dia de hoje)
        const arr: { id: string; banco: string; fechamento: number }[] = [];
        cartoesSnap.docs.forEach(docCart => {
          // Cast para o tipo esperado ao pegar os dados do documento
          const data = docCart.data() as CartaoFirestoreData;
          // Verifica se 'fechamento' é um número
          if (typeof data.fechamento === 'number') {
            arr.push({
              id: docCart.id,
              banco: data.banco,
              fechamento: data.fechamento,
            });
          }
        });
        arr.sort((a, b) => {
          // 1) calcula quantos dias tem o mês atual
          const diasNoMes = new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0
          ).getDate();

          // 2) função que retorna dias até o próximo fechamento
          const calculaDias = (fech: number) =>
            fech > diaHoje
              ? fech - diaHoje
              : diasNoMes - diaHoje + fech;

          // 3) ordena do maior para o menor "dias até fechar"
          return calculaDias(b.fechamento) - calculaDias(a.fechamento);
        });
        setMelhoresCartoes(arr.slice(0, 2));
      } catch (err) {
        console.error('Erro ao carregar dados do Dashboard:', err);
        // Opcional: exibir uma mensagem de erro na UI
        // setError('Falha ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    }

    carregarDados();
  }, [uid]); // Dependência do uid para refetch quando o ID do usuário muda.

  if (loading || loadingHook) {
    return (
      <div className="flex justify-center items-center h-screen bg-black">
        <FaSpinner className="animate-spin text-4xl text-gray-400" />
      </div>
    );
  }

  if (errorHook) {
    return (
      <div className="p-4 bg-black text-red-500">
        <p>Erro ao carregar despesas: {errorHook}</p>
      </div>
    );
  }

  // Ordena categorias por valor (descendente)
  const sortedCategorias = Object.entries(categoriasTotais).sort(([, aVal], [, bVal]) => bVal - aVal);

  return (
    <div className="p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl mx-auto text-white bg-black min-h-screen">
      {/* Botão “Lançar Despesas” */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => router.push(`/cliente/${uid}/cadastrar-despesas`)}
          className="px-4 py-2 bg-green-300 text-black font-semibold rounded"
        >
          Lançar Despesas
        </button>
      </div>

      {/* Total do Mês Atual */}
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold">
          Total do Mês Atual: <span className="text-green-400">{formatBRL(totalDespesas)}</span>
        </h1>
      </div>

      {/* Melhores Datas dos Cartões */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-3">Melhores cartões para usar hoje</h2>
        {melhoresCartoes.length === 0 ? (
          <p className="text-gray-300">Nenhum cartão com fechamento pendente hoje.</p>
        ) : (
          melhoresCartoes.map(cartao => (
            <div
              key={cartao.id}
              className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded mb-3"
            >
              <span className="font-medium">{cartao.banco}</span>
              <span className="text-gray-400">Fechamento: dia {cartao.fechamento}</span>
            </div>
          ))
        )}
      </div>

      {/* Assinaturas */}
      {assinaturasTotal > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaPills className="mr-2" /> Assinaturas
          </h2>
          <p className="text-lg">{formatBRL(assinaturasTotal)}</p>
        </div>
      )}

      {/* Boletos */}
      {boletosTotal > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaFileInvoice className="mr-2" /> Boletos
          </h2>
          <p className="text-lg">{formatBRL(boletosTotal)}</p>
        </div>
      )}

      {/* Empréstimos */}
      {emprestimosTotal > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaUniversity className="mr-2" /> Empréstimos
          </h2>
          <p className="text-lg">{formatBRL(emprestimosTotal)}</p>
        </div>
      )}

      {/* Financiamentos */}
      {financiamentosTotal > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaHome className="mr-2" /> Financiamentos
          </h2>
          <p className="text-lg">{formatBRL(financiamentosTotal)}</p>
        </div>
      )}

      {/* Pix */}
      {pixTotal > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2 flex items-center">
            <FaBolt className="mr-2" /> Pix
          </h2>
          <p className="text-lg">{formatBRL(pixTotal)}</p>
        </div>
      )}

      {/* Gastos por Categoria (ordenados) */}
      {sortedCategorias.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">Gastos por Categoria</h2>
          <div className="space-y-4">
            {sortedCategorias.map(([cat, valor]) => {
              const emoji = catEmojiMap[cat] || '💰';
              const randomColor = '#' + Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, '0');
              return (
                <div
                  key={cat}
                  className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded"
                >
                  <div className="flex items-center">
                    <span
                      className="text-2xl mr-3"
                      style={{ color: randomColor }}
                    >
                      {emoji}
                    </span>
                    <span>{cat}</span>
                  </div>
                  <span>{formatBRL(valor)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}