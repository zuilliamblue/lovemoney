// frontend/app/cliente/[id]/hooks/useTotalDespesasCompleto.ts

import { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/firebase/config';

interface ParcelaFirestoreData {
  parcela?: number;
  parcelasTotais?: number;
  data?: Timestamp;
  dataPagamento?: Timestamp;
  descricao?: string;
  valor?: number;
  valorParcela?: number;
  categoria?: string;
  servico?: string;
  recorrente?: boolean;
  canceladaEm?: Timestamp;
  tipo?: string;
  custo?: number;
  diaPagamento?: Timestamp;
  criadoEm?: Timestamp;
  americano?: any;
  banco?: string;
  [key: string]: any;
}

// Interface de retorno do hook
interface UseTotalDespesasResult {
  total: number;
  loading: boolean;
  error: string | null;
}

/**
 * useTotalDespesasCompleto
 * ------------------------
 * Reproduz EXATAMENTE a lógica de soma de despesas que a sua DespesasPage faz,
 * incluindo o ciclo de fatura para cartões.
 *
 * O hook retorna:
 *   - total: soma de todas as categorias
 *   - loading: true enquanto estiver buscando/ somando
 *   - error: string, caso dê erro em alguma query
 *
 * PARA COPIAR NA DASHBOARD E NA DESPESAS:
 *   const { total, loading, error } = useTotalDespesasCompleto(uid);
 */
export function useTotalDespesasCompleto(uid: string): UseTotalDespesasResult {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setTotal(0);
      setLoading(false);
      return;
    }

    async function calcularTotal() {
      setLoading(true);
      setError(null);

      try {
        // 1) Definir intervalo do mês atual (primeiro dia 00:00 até último dia 23:59:59)
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        const primeiroDiaMes = new Date(anoAtual, mesAtual, 1, 0, 0, 0, 0);
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59, 999);
        const tsInicioMes = Timestamp.fromDate(primeiroDiaMes);
        const tsFimMes = Timestamp.fromDate(ultimoDiaMes);

        let somaTotal = 0;

        // 2) Somar “gastos” (coleção: usuarios/{uid}/gastos)
        //    → A DespesasPage usa o campo “data” para filtrar gastos, não “criadoEm”.
        {
          const refGastos = collection(db, 'usuarios', uid, 'gastos');
          const qGastos = query(
            refGastos,
            where('data', '>=', tsInicioMes),
            where('data', '<=', tsFimMes)
          );
          const snapGastos = await getDocs(qGastos);
          snapGastos.forEach(docSnap => {
            const data = docSnap.data() as ParcelaFirestoreData;
            somaTotal += Number(data.valor) || 0;
          });
        }

        // 3) Somar “assinaturas” (débito) (coleção: usuarios/{uid}/assinaturas)
        //    → A DespesasPage usa o campo “diaPagamento” para filtrar assinaturas? Na verdade, 
        //      as assinaturas de débito são filtradas por “createdEm” (ou “criadoEm”), conforme a lógica original.
        {
          const refAssDeb = collection(db, 'usuarios', uid, 'assinaturas');
          const qAssDeb = query(
            refAssDeb,
            where('criadoEm', '>=', tsInicioMes),
            where('criadoEm', '<=', tsFimMes)
          );
          const snapAssDeb = await getDocs(qAssDeb);
          snapAssDeb.forEach(docSnap => {
            const data = docSnap.data() as ParcelaFirestoreData;
            somaTotal += Number(data.valor) || 0;
          });
        }

        // 4) Somar “assinaturas via cartão” (subcoleção: usuarios/{uid}/cartoes/{cartaoId}/gastos)
        //    → Aqui, a DespesasPage filtra por “tipo === 'assinaturas'” e campo “diaPagamento” dentro do mês
        {
          const cartoesSnap = await getDocs(collection(db, 'usuarios', uid, 'cartoes'));
          for (const docCart of cartoesSnap.docs) {
            const refGastosCart =
              collection(db, 'usuarios', uid, 'cartoes', docCart.id, 'gastos');
            const qGastosCart = query(
              refGastosCart,
              where('tipo', '==', 'assinaturas'),
              where('diaPagamento', '>=', tsInicioMes),
              where('diaPagamento', '<=', tsFimMes)
            );
            const snapGastosCart = await getDocs(qGastosCart);
            snapGastosCart.forEach(docSnap => {
              const data = docSnap.data() as ParcelaFirestoreData;
              somaTotal += Number(data.valor) || 0;
            });
          }
        }

        // 5) Somar “boletos”, “pix”, “financiamentos” e “emprestimos”
        //    → Todos filtrados por “dataPagamento” dentro do mês
        {
          const colecoesParcelas = ['boletos', 'pix', 'financiamentos', 'emprestimos'];
          for (const chave of colecoesParcelas) {
            const ref = collection(db, 'usuarios', uid, chave);
            const q = query(
              ref,
              where('dataPagamento', '>=', tsInicioMes),
              where('dataPagamento', '<=', tsFimMes)
            );
            const snap = await getDocs(q);
            snap.forEach(docSnap => {
              const data = docSnap.data() as ParcelaFirestoreData;
              somaTotal += Number(data.valorParcela) || 0;
            });
          }
        }

        // 6) Somar “gastos de cartão de crédito” (subscomo: usuarios/{uid}/cartoes/{cartaoId}/gastos)
        //    → Aqui precisamos FILTRAR pelo “ciclo de fatura”, não pelo mês calendário
        {
          // Função que calcula { inicio, fim } do ciclo de fatura com base em dia de fechamento e dia de vencimento
          function getCicloFaturaPorVencimento(
            ano: number,
            mes: number,
            diaFechamento: number,
            diaVencimento: number
          ) {
            // Determina a data de vencimento no mês corrente
            const vencimento = new Date(ano, mes, diaVencimento, 0, 0, 0, 0);
            // Se o dia de fechamento for igual ou posterior ao dia de vencimento,
            // significa que a fatura fechou no mês anterior.
            let fechamentoMes = mes;
            let fechamentoAno = ano;
            if (diaFechamento >= diaVencimento) {
              fechamentoMes = mes - 1;
              if (fechamentoMes < 0) {
                fechamentoMes = 11;
                fechamentoAno--;
              }
            }
            // Data de fechamento
            const fechamento = new Date(
              fechamentoAno,
              fechamentoMes,
              diaFechamento,
              0,
              0,
              0,
              0
            );
            // Início do ciclo é diaFechamento do mês anterior ao mês de fechamento
            let inicioMes = fechamentoMes - 1;
            let inicioAno = fechamentoAno;
            if (inicioMes < 0) {
              inicioMes = 11;
              inicioAno--;
            }
            const inicio = new Date(
              inicioAno,
              inicioMes,
              diaFechamento,
              0,
              0,
              0,
              0
            );
            return { inicio, fim: fechamento };
          }

          const cartoesSnap2 = await getDocs(collection(db, 'usuarios', uid, 'cartoes'));
          for (const docCart of cartoesSnap2.docs) {
            const cartData = docCart.data() as ParcelaFirestoreData & {
              fechamento: number;
              vencimento: number;
            };
            const { fechamento, vencimento } = cartData;
            if (
              typeof fechamento !== 'number' ||
              typeof vencimento !== 'number'
            ) {
              continue; // pula se não tiver esses dados
            }

            // Calcula ciclo de fatura para o mês atual
            const ciclo = getCicloFaturaPorVencimento(
              anoAtual,
              mesAtual,
              fechamento,
              vencimento
            );
            const tsInicioCiclo = Timestamp.fromDate(ciclo.inicio);
            // Use “< fim” (exclui o próprio dia de fechamento)
            const tsFimCiclo = Timestamp.fromDate(ciclo.fim);

            // Agora filtra subcoleção “gastos” daquele cartão por campo “data”
            const refGastosCart = collection(
              db,
              'usuarios',
              uid,
              'cartoes',
              docCart.id,
              'gastos'
            );
            const qCart = query(
              refGastosCart,
              where('data', '>=', tsInicioCiclo),
              where('data', '<', tsFimCiclo)
            );
            const snapCart = await getDocs(qCart);
            snapCart.forEach(docSnap => {
              const data = docSnap.data() as ParcelaFirestoreData;
              somaTotal += Number(data.valor) || 0;
            });
          }
        }

        // Atualiza o estado com o total final
        setTotal(somaTotal);
      } catch (err: any) {
        console.error('Erro em useTotalDespesasCompleto:', err);
        setError(err.message || 'Erro inesperado');
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    calcularTotal();
  }, [uid]);

  return { total, loading, error };
}
