// src/app/cliente/[id]/assinaturas/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/firebase/config';
import {
  collection, getDocs, doc, deleteDoc, updateDoc, Timestamp,
} from 'firebase/firestore';
import { FaSpinner, FaCog, FaRegCreditCard, FaBan, FaTrash } from 'react-icons/fa'; // Removido FaEdit (não usado)

// --- Interfaces para tipagem dos dados do Firestore ---
interface AssinaturaFirestoreData {
  id: string; // ID do documento Firestore
  servico?: string;
  descricao?: string;
  valor: number;
  diaPagamento?: Timestamp;
  data?: Timestamp; // Para assinaturas salvas como gastos de cartão (campo 'data' também pode existir)
  recorrente: boolean;
  canceladaEm: Timestamp | null;
  origem: 'debito' | 'cartao';
  cartao?: string; // Nome do banco do cartão
  cartaoId?: string; // ID do documento do cartão (para subcoleção)
  tipo?: string; // 'assinaturas' quando vem de gastos de cartão
  criadoEm?: Timestamp; // Adicionado para ordenação
}

// --- Componente Principal da Página ---
export default function AssinaturasPage() {
  const params = useParams();
  const uid = typeof params.id === 'string' ? params.id : params.id ? params.id[0] : '';

  const [assinaturas, setAssinaturas] = useState<AssinaturaFirestoreData[]>([]);
  const [modal, setModal] = useState<null | {
    assinatura: AssinaturaFirestoreData; // Tipagem mais específica
    confirmCancel?: boolean;
    confirmDelete?: boolean;
    editValor?: boolean;
    valorTemp: string; // O input é string, converteremos ao salvar
  }>(null);

  const [loading, setLoading] = useState(true); // Começa como true para mostrar spinner inicial
  const [aviso, setAviso] = useState('');

  // Função para buscar todas as assinaturas (débito e cartão)
  useEffect(() => {
    const fetchAssinaturas = async () => {
      if (!uid) {
        setLoading(false);
        return;
      }
      setLoading(true);

      let lista: AssinaturaFirestoreData[] = [];

      try {
        // 1. Busca assinaturas de débito (coleção 'assinaturas')
        const snapDebito = await getDocs(collection(db, 'usuarios', uid as string, 'assinaturas')); // uid as string
        const assinaturasDebito = snapDebito.docs
          .map(d => ({ id: d.id, ...(d.data() as Omit<AssinaturaFirestoreData, 'id'>), origem: 'debito' } as AssinaturaFirestoreData))
          .filter(a => a.recorrente && !a.canceladaEm); // Mostra apenas as ativas e não canceladas

        lista = lista.concat(assinaturasDebito);

        // 2. Busca assinaturas dos cartões (subcoleção 'gastos' com tipo 'assinaturas')
        const cartSnap = await getDocs(collection(db, 'usuarios', uid as string, 'cartoes')); // uid as string
        for (const docCart of cartSnap.docs) {
          const gastosSnap = await getDocs(
            collection(db, 'usuarios', uid as string, 'cartoes', docCart.id, 'gastos') // uid as string
          );
          const gastosAssinaturaCartao = gastosSnap.docs
            .map(d => ({
              id: d.id,
              ...(d.data() as Omit<AssinaturaFirestoreData, 'id'>), // Cast para o tipo esperado
              cartao: docCart.data().banco, // Nome do banco do cartão
              cartaoId: docCart.id, // ID do cartão para futuras referências
              origem: 'cartao'
            } as AssinaturaFirestoreData))
            .filter(a => a.tipo === 'assinaturas' && a.recorrente && !a.canceladaEm); // Filtra por tipo e se está ativa
          
          lista = lista.concat(gastosAssinaturaCartao);
        }
      } catch (error) {
        console.error("Erro ao buscar assinaturas:", error);
        setAviso("Erro ao carregar assinaturas.");
      } finally {
        setAssinaturas(lista.sort((a,b) => (a.criadoEm?.seconds || 0) - (b.criadoEm?.seconds || 0))); // Ordena por data de criação
        setLoading(false);
      }
    };
    fetchAssinaturas();
  }, [uid]); // Dependência do uid para refetch quando o ID do usuário muda

  // Efeito para esconder avisos após um tempo
  useEffect(() => {
    if (aviso) {
      const timer = setTimeout(() => setAviso(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [aviso]);

  // Excluir assinatura (deleta mesmo do Firestore)
  const excluirAssinatura = async (assinatura: AssinaturaFirestoreData) => {
    setLoading(true);
    try {
      if (assinatura.origem === 'debito') {
        await deleteDoc(doc(db, 'usuarios', uid as string, 'assinaturas', assinatura.id)); // uid as string
      } else {
        // Garantir que cartaoId existe para assinaturas de cartão
        if (!assinatura.cartaoId) {
          throw new Error("ID do cartão ausente para exclusão de assinatura via cartão.");
        }
        await deleteDoc(doc(db, 'usuarios', uid as string, 'cartoes', assinatura.cartaoId, 'gastos', assinatura.id)); // uid as string
      }
      setAssinaturas(prev => prev.filter(a => a.id !== assinatura.id)); // Remove da UI
      setAviso('Assinatura excluída com sucesso!');
    } catch (error) {
      console.error("Erro ao excluir assinatura:", error);
      setAviso('Erro ao excluir assinatura.');
    } finally {
      setLoading(false);
      setModal(null); // Fecha o modal
    }
  };

  // Cancelar assinatura (só marca o canceladaEm)
  const cancelarAssinatura = async (assinatura: AssinaturaFirestoreData) => {
    setLoading(true);
    try {
      const ref = assinatura.origem === 'debito'
        ? doc(db, 'usuarios', uid as string, 'assinaturas', assinatura.id) // uid as string
        : doc(db, 'usuarios', uid as string, 'cartoes', assinatura.cartaoId as string, 'gastos', assinatura.id); // uid as string, cartaoId as string
      
      await updateDoc(ref, { 
        recorrente: false, // Marca como não recorrente
        canceladaEm: Timestamp.now() // Define a data de cancelamento
      });
      // Em vez de filtrar, refetch para garantir o estado mais atualizado e o filtro `!a.canceladaEm`
      // setAssinaturas(prev => prev.filter(a => a.id !== assinatura.id)); 
      setAviso('Assinatura cancelada com sucesso!');
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      setAviso('Erro ao cancelar assinatura.');
    } finally {
      setLoading(false);
      setModal(null); // Fecha o modal
      fetchAssinaturas(); // Chamar fetchAssinaturas para recarregar com o estado atualizado
    }
  };

  // Alterar valor
  const alterarValor = async (assinatura: AssinaturaFirestoreData, novoValor: number) => {
    setLoading(true);
    try {
      const ref = assinatura.origem === 'debito'
        ? doc(db, 'usuarios', uid as string, 'assinaturas', assinatura.id) // uid as string
        : doc(db, 'usuarios', uid as string, 'cartoes', assinatura.cartaoId as string, 'gastos', assinatura.id); // uid as string, cartaoId as string
      
      await updateDoc(ref, { valor: novoValor });
      setAssinaturas(prev =>
        prev.map(a =>
          a.id === assinatura.id ? { ...a, valor: novoValor } : a
        )
      );
      setAviso('Valor alterado com sucesso!');
    } catch (error) {
      console.error("Erro ao alterar valor:", error);
      setAviso('Erro ao alterar valor.');
    } finally {
      setLoading(false);
      setModal(null); // Fecha o modal
    }
  };

  return (
    <div className="p-2 sm:p-6 max-w-lg sm:max-w-2xl mx-auto text-white">

      {loading && (
        <div className="flex justify-center items-center my-10">
          <FaSpinner className="animate-spin text-3xl text-gray-400" />
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">Assinaturas Ativas</h1>

      {aviso && (
        <div className="mb-2 text-center bg-green-600 text-white rounded py-2 px-4 font-semibold animate-pulse">
          {aviso}
        </div>
      )}

      {!loading && assinaturas.length === 0 && (
        <div className="text-gray-400 text-center">Nenhuma assinatura ativa encontrada.</div>
      )}

      {!loading && assinaturas.map(ass => (
        <div key={ass.id} className="flex justify-between items-center bg-[#222] rounded p-3 my-2">
          <div>
            <div className="font-semibold">{ass.servico || ass.descricao}</div>
            <div className="text-xs text-gray-400">
              {ass.origem === 'debito' ? 'Débito Automático' : ass.cartao ? `Cartão: ${ass.cartao}` : 'Cartão Indefinido'}
            </div>
            <div className="text-lg font-bold">{(ass.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
          </div>
          <button
            className="p-2 text-xl text-blue-400 hover:text-blue-600"
            onClick={() => setModal({ assinatura: ass, valorTemp: String(ass.valor || 0) })} // Inicializa valorTemp
            title="Gerenciar"
          >
            <FaCog />
          </button>
        </div>
      ))}


      {/* Modal de gerenciamento */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-[#222] rounded p-6 max-w-xs w-full space-y-4">
            <h2 className="text-lg font-bold mb-2">Gerenciar Assinatura</h2>
            <div className="font-semibold">{modal.assinatura.servico || modal.assinatura.descricao}</div>

            {/* Valor com edição inline */}
            <div>
              <label className="block text-xs mb-1">Valor</label>
              {!modal.editValor ? (
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {(modal.assinatura.valor || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </span>
                  <button
                    className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold"
                    onClick={() =>
                      setModal({
                        ...modal,
                        editValor: true,
                        valorTemp: String(modal.assinatura.valor || 0) // Garante que seja string
                      })
                    }
                    disabled={loading}
                  >
                    Alterar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-28 p-2 rounded bg-[#111] mb-0"
                    value={modal.valorTemp}
                    onChange={e =>
                      setModal({ ...modal, valorTemp: e.target.value })
                    }
                    disabled={loading}
                  />
                  <button
                    className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold"
                    onClick={async () => {
                      const novoValor = parseFloat(modal.valorTemp);
                      if (!isNaN(novoValor) && novoValor !== modal.assinatura.valor) {
                        await alterarValor(modal.assinatura, novoValor);
                        setModal(prev => prev ? { ...prev, editValor: false } : null); // Volta ao modo de visualização
                        setAviso('Valor alterado com sucesso!');
                      } else {
                        setModal({ ...modal, editValor: false });
                      }
                    }}
                    disabled={loading}
                  >
                    Salvar
                  </button>
                  <button
                    className="px-2 py-1 rounded bg-gray-600 text-white text-xs font-bold"
                    onClick={() => setModal({ ...modal, editValor: false })}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {/* Cancelar Assinatura com confirmação extra */}
            {!modal.confirmCancel ? (
              <button
                className="w-full flex items-center gap-2 justify-center py-2 rounded bg-yellow-600 text-white font-bold"
                onClick={() => setModal({ ...modal, confirmCancel: true })}
                disabled={loading}
              >
                <FaBan /> Cancelar Assinatura
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-yellow-200 text-yellow-900 rounded p-2 text-sm text-center">
                  Tem certeza que deseja cancelar esta assinatura?<br />
                  Ela não será mais exibida em meses futuros.
                </div>
                <button
                  className="w-full flex items-center gap-2 justify-center py-2 rounded bg-yellow-700 text-white font-bold"
                  onClick={async () => {
                    await cancelarAssinatura(modal.assinatura);
                    // setAviso('Assinatura cancelada com sucesso!'); // Já setado dentro da função
                  }}
                  disabled={loading}
                >
                  Confirmar Cancelamento
                </button>
                <button
                  className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
                  onClick={() => setModal({ ...modal, confirmCancel: false })}
                  disabled={loading}
                >
                  Voltar
                </button>
              </div>
            )}

            {/* Excluir Assinatura com confirmação extra */}
            {!modal.confirmDelete ? (
              <button
                className="w-full flex items-center gap-2 justify-center py-2 rounded bg-red-600 text-white font-bold"
                onClick={() => setModal({ ...modal, confirmDelete: true })}
                disabled={loading}
              >
                <FaTrash /> Excluir Assinatura
              </button>
            ) : (
              <div className="space-y-2">
                <div className="bg-red-200 text-red-900 rounded p-2 text-sm text-center">
                  Tem certeza que deseja <b>EXCLUIR</b> todos os dados desta assinatura?<br />
                  <b>Essa ação é irreversível</b> e irá remover <b>TODOS</b> os registros passados e futuros!
                </div>
                <button
                  className="w-full flex items-center gap-2 justify-center py-2 rounded bg-red-700 text-white font-bold"
                  onClick={() => excluirAssinatura(modal.assinatura)}
                  disabled={loading}
                >
                  Confirmar Exclusão
                </button>
                <button
                  className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
                  onClick={() => setModal({ ...modal, confirmDelete: false })}
                  disabled={loading}
                >
                  Voltar
                </button>
              </div>
            )}

            <button
              className="w-full flex items-center gap-2 justify-center py-2 rounded bg-gray-600 text-white"
              onClick={() => setModal(null)}
              disabled={loading}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}