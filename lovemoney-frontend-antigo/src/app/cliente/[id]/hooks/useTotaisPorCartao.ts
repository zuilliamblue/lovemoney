// frontend/app/cliente/[id]/hooks/useTotaisPorCartao.ts

import { useEffect, useState } from 'react';
import { db } from '@/firebase/config';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

// Função auxiliar para calcular o período de fatura a partir de vencimento e fechamento
function getCicloFaturaPorVencimento(
  ano: number,
  mes: number,
  diaFechamento: number,
  diaVencimento: number
) {
  const vencimento = new Date(ano, mes, diaVencimento, 0, 0, 0, 0);
  let fechamentoMes = mes;
  let fechamentoAno = ano;
  // Se o dia de fechamento for maior ou igual ao dia de vencimento,
  // a fatura do mês corrente já “fechou” no mês anterior.
  if (diaFechamento >= diaVencimento) {
    fechamentoMes = mes - 1;
    if (fechamentoMes < 0) {
      fechamentoMes = 11;
      fechamentoAno--;
    }
  }
  const fechamento = new Date(fechamentoAno, fechamentoMes, diaFechamento, 0, 0, 0, 0);

  let inicioMes = fechamentoMes - 1;
  let inicioAno = fechamentoAno;
  if (inicioMes < 0) {
    inicioMes = 11;
    inicioAno--;
  }
  const inicio = new Date(inicioAno, inicioMes, diaFechamento, 0, 0, 0, 0);

  return { inicio, fim: fechamento };
}

// Tipo do objeto de retorno: chave = cartaoId, valor = soma dos gastos dessse cartão
export type TotaisPorCartao = Record<string, number>;

/**
 * Hook: useTotaisPorCartao
 * - Recebe:
 *    uid  → ID do usuário logado
 *    ano  → ano corrente selecionado (ou atual)
 *    mes  → mês corrente selecionado (0–11)
 * - Retorna:
 *    totais → objeto { [cartaoId]: somaDosGastosNoPeríodo }
 *    loading → true enquanto faz a consulta, false quando termina
 *    error   → string se ocorrer erro, ou null caso sucesso
 */
export function useTotaisPorCartao(
  uid: string,
  ano: number,
  mes: number
) {
  const [totais, setTotais] = useState<TotaisPorCartao>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Se não tiver UID válido, não faz sentido rodar a query
    if (!uid) {
      setTotais({});
      setLoading(false);
      return;
    }

    async function calcularTotais() {
      setLoading(true);
      setError(null);

      try {
        // Objeto temporário para armazenar somas antes de setar no estado
        const valoresTemp: TotaisPorCartao = {};

        // 1) Buscamos todos os cartões cadastrados para este usuário
        const cartoesRef = collection(db, 'usuarios', uid, 'cartoes');
        const cartaoSnap = await getDocs(cartoesRef);

        // 2) Para cada cartão, calculamos seu período de fatura e somamos os gastos
        for (const docCart of cartaoSnap.docs) {
          const cartaoData = docCart.data();
          const { fechamento, vencimento } = cartaoData as {
            fechamento?: number;
            vencimento?: number;
          };

          // Se faltar dados de fechamento/vencimento, ignora esse cartão
          if (fechamento === undefined || vencimento === undefined) {
            valoresTemp[docCart.id] = 0;
            continue;
          }

          // Calcula o ciclo de fatura (início e fim) para o mês/ano fornecidos
          const ciclo = getCicloFaturaPorVencimento(ano, mes, fechamento, vencimento);
          const tsInicio = Timestamp.fromDate(ciclo.inicio);
          const tsFim = Timestamp.fromDate(ciclo.fim);

          // 3) Monta a query na subcoleção 'gastos' desse cartão,
          // filtrando por campo "data" entre tsInicio (inclusive) e tsFim (exclusive)
          const gastosRef = collection(db, 'usuarios', uid, 'cartoes', docCart.id, 'gastos');
          const q = query(
            gastosRef,
            where('data', '>=', tsInicio),
            where('data', '<', tsFim)
          );

          const gastosSnap = await getDocs(q);
          let soma = 0;

          // 4) Soma o campo 'valor' de cada documento retornado
          gastosSnap.forEach((docG) => {
            const dado = docG.data();
            soma += Number(dado.valor) || 0;
          });

          valoresTemp[docCart.id] = soma;
        }

        // 5) Atualiza o estado com todas as somas calculadas para cada cartão
        setTotais(valoresTemp);
      } catch (err: any) {
        console.error('Erro em useTotaisPorCartao:', err);
        setError('Falha ao calcular totais por cartão');
        setTotais({});
      } finally {
        setLoading(false);
      }
    }

    calcularTotais();
  }, [uid, ano, mes]);

  return { totais, loading, error };
}
