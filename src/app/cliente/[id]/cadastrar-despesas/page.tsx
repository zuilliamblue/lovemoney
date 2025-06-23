// src/app/cliente/[id]/cadastrar-despesas/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config'; //
import { FaCheckCircle } from 'react-icons/fa';

// Definindo interfaces para melhor tipagem dos dados do Firestore
interface CartaoFirestoreData {
  id: string;
  banco: string;
  vencimento: number;
  fechamento: number;
  apelido?: string;
}

// Interfaces para os dados a serem salvos
interface DespesaComumData {
  descricao: string;
  tipo: string;
  categoria: string;
  valor: number;
  data: Timestamp;
  criadoEm: Timestamp;
}

interface CartaoGastoData {
  descricao: string;
  tipo: string;
  categoria: string;
  parcela: number;
  totalParcelas: number;
  valor: number;
  data: Timestamp;
  chaveUnica: string;
  criadoEm: Timestamp;
}

interface AssinaturaData {
  descricao: string;
  servico: string;
  valor: number;
  diaPagamento: Timestamp;
  recorrente: boolean;
  criadoEm: Timestamp;
  canceladaEm: Timestamp | null;
}

interface FinanciamentoData {
  descricao: string;
  tipo: string;
  financiamento: string;
  valor: number;
  parcela: number;
  parcelasTotais: number;
  dataPagamento: Timestamp;
  chaveUnica: string;
  criadoEm: Timestamp;
}

interface EmprestimoData {
  descricao: string;
  tipo: string;
  banco: string;
  valor: number;
  parcela: number;
  parcelasTotais: number;
  dataPagamento: Timestamp;
  chaveUnica: string;
  criadoEm: Timestamp;
}

interface PixBoletoParceladoData {
  descricao: string;
  tipo: string;
  beneficiario: string;
  valor: number; // Para pix/boleto, o campo é 'valor', não 'valorParcela'
  parcela: number;
  parcelasTotais: number;
  dataPagamento: Timestamp;
  chaveUnica: string;
  criadoEm: Timestamp;
}


const tipos = ['Compra Única', 'Cartão de Crédito', 'Assinatura', 'Financiamentos', 'Empréstimos', 'Pix Parcelado', 'Boleto Parcelado'];
const servicos = ['Amazon Music', 'Amazon Prime', 'Apple TV', 'Deezer', 'Disney', 'Max', 'Mercado Livre', 'Netflix', 'Outros (Digite)', 'Spotify', 'Youtube'];
const financTypes = ['Imóvel', 'Veículo', 'Outros (Digite)'];
const bancosEmprestimo = ['Nubank', 'Banco do Brasil', 'Itau', 'Santander', 'Bradesco', 'XP', 'Inter', 'Digio', 'Neon', 'Caixa', 'Crefisa', 'Creditas', 'Mercado Pago', 'PicPay', 'Outros (Digite)'];
const baseCats = ['Trabalho/Empresa', 'Aluguel', 'Condomínio', 'Seguros', 'Farmácia', 'Jogos', 'Tabacaria', 'Acessórios', 'Roupas', 'Calçados', 'Casa', 'Mercado', 'Manutenção Veicular', 'Transporte', 'Internet', 'Luz', 'Sabesp/Água', 'Gás', 'Diversão', 'Telefone Fixo', 'Celular', 'Segurança', 'Combustível', 'TV', 'Streaming', 'Igreja', 'Doações', 'Plano de Saúde', 'Pets', 'Ensino', 'Pessoas', 'IPVA', 'Multas', 'Financiamento Veobiliário', 'Financiamento Imobiliário', 'Outros Financiamentos', 'Presentes']; // Corrigido 'Financiamento Veobiliário' para 'Financiamento Veicular'
const categorias = ['Outros', 'Digitar', 'Alimentação', ...baseCats.sort()];

const parseLocalDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0); // Ajusta para meio-dia para evitar problemas de fuso horário
};
const formatDDMMYYYY = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
};
const formatBRL = (num: number) => num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const capitalizeWords = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '); // Adicionado toLowerCase() para evitar capitalizar tudo

export default function CadastrarDespesaPage() {
  const params = useParams(); //
  // Garante que uid seja sempre uma string
  const uid = typeof params.id === 'string' ? params.id : params.id ? params.id[0] : ''; //
  const router = useRouter();

  const [tipo, setTipo] = useState(tipos[0]);
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState(categorias[0]);
  const [customCat, setCustomCat] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10)); // Data para Compra Única e base para Cartão de Crédito
  const [valor, setValor] = useState(''); // Valor total para Compra Única, Cartão de Crédito e Assinatura

  const [beneficiario, setBeneficiario] = useState('');
  const [dataParcelada, setDataParcelada] = useState(new Date().toISOString().slice(0, 10)); // Data para Pix/Boleto Parcelado
  const [parcelasParceladas, setParcelasParceladas] = useState('');
  const [valorParcelaParcelada, setValorParcelaParcelada] = useState(''); // Valor POR parcela para Pix/Boleto

  const [bancoEmprestimo, setBancoEmprestimo] = useState(bancosEmprestimo[0]);
  const [customBanco, setCustomBanco] = useState('');
  const [parcelasEmprestimo, setParcelasEmprestimo] = useState('');
  const [dataEmprestimo, setDataEmprestimo] = useState(new Date().toISOString().slice(0, 10)); // Data para Empréstimos
  const [valorParcelaEmprestimo, setValorParcelaEmprestimo] = useState(''); // Valor POR parcela para Empréstimos

  const [cartoes, setCartoes] = useState<CartaoFirestoreData[]>([]); // Tipagem mais específica
  const [cartaoSelecionado, setCartaoSelecionado] = useState('');
  const [parcelas, setParcelas] = useState(''); // Parcelas para Cartão de Crédito

  const [servico, setServico] = useState(servicos[0]);
  const [customServico, setCustomServico] = useState('');
  const [diaPagamento, setDiaPagamento] = useState(new Date().toISOString().slice(0, 10)); // Dia para Assinaturas
  const [recorrencia, setRecorrencia] = useState(true);

  const [finType, setFinType] = useState(financTypes[0]);
  const [customFin, setCustomFin] = useState('');
  const [nextPayment, setNextPayment] = useState(new Date().toISOString().slice(0, 10)); // Próximo Pagamento para Financiamentos
  const [remaining, setRemaining] = useState(''); // Parcelas Restantes para Financiamentos
  const [installValue, setInstallValue] = useState(''); // Valor POR parcela para Financiamentos

  const [showModal, setShowModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [formaPagamento, setFormaPagamento] = useState('Débito');
  const [canceladaEm, setCanceladaEm] = useState<string | null>(null); // Não usado diretamente no formulário de cadastro, mas mantido.

  // Efeito para carregar cartões
  useEffect(() => {
    if (
      (tipo === 'Cartão de Crédito' || (tipo === 'Assinatura' && formaPagamento === 'Cartão')) && uid
    ) {
      (async () => {
        try {
          const snap = await getDocs(collection(db, 'usuarios', uid as string, 'cartoes')); // uid as string para tipagem
          const items: CartaoFirestoreData[] = [];
          snap.forEach(doc =>
            items.push({
              id: doc.id,
              ...(doc.data() as Omit<CartaoFirestoreData, 'id'>) // Cast para o tipo esperado, omitindo o 'id' que já é adicionado
            })
          );
          // ordena alfabeticamente pelo nome do banco
          items.sort((a, b) =>
            a.banco.localeCompare(b.banco)
          );
          setCartoes(items);
        } catch (error) {
          console.error("Erro ao carregar cartões:", error);
          // Tratar erro (ex: exibir mensagem para o usuário)
        }
      })();
    } else {
      setCartoes([]); // Limpa os cartões se não for tipo Cartão de Crédito ou Assinatura via Cartão
      setCartaoSelecionado(''); // Limpa a seleção
    }
  }, [tipo, uid, formaPagamento]); //


  const resetForm = () => {
    setTipo(tipos[0]);
    setDescricao('');
    setCategoria(categorias[0]);
    setCustomCat('');
    setData(new Date().toISOString().slice(0, 10));
    setValor('');
    setCartaoSelecionado('');
    setParcelas('');
    setServico(servicos[0]);
    setCustomServico('');
    setDiaPagamento(new Date().toISOString().slice(0, 10));
    setRecorrencia(true);
    setFinType(financTypes[0]);
    setCustomFin('');
    setNextPayment(new Date().toISOString().slice(0, 10));
    setRemaining('');
    setInstallValue('');
    setBancoEmprestimo(bancosEmprestimo[0]);
    setCustomBanco('');
    setParcelasEmprestimo('');
    setDataEmprestimo(new Date().toISOString().slice(0, 10));
    setValorParcelaEmprestimo('');
    setBeneficiario('');
    setDataParcelada(new Date().toISOString().slice(0, 10));
    setParcelasParceladas('');
    setValorParcelaParcelada('');
    setFormaPagamento('Débito'); // Reseta para o padrão
  };

  const salvarDespesa = async () => {
    setCarregando(true);
    try {
      if (!descricao.trim()) throw new Error('Descrição obrigatória');

      const dataBase = parseLocalDate(data);
      const chaveUnica = crypto.randomUUID();

      // Funções para parsear valores monetários de string para float
      const parseCurrency = (str: string) => parseFloat(str.trim().replace(/\s/g, '').replace('R$', '').replace(/\./g, '').replace(',', '.'));

      // === PIX ou BOLETO PARCELADO ===
      if (tipo === 'Pix Parcelado' || tipo === 'Boleto Parcelado') {
        const parcelas = Number(parcelasParceladas);
        const valorParcela = parseCurrency(valorParcelaParcelada);
        if (!beneficiario.trim()) throw new Error('Beneficiário obrigatório');
        if (isNaN(parcelas) || parcelas < 1) throw new Error('Quantidade de parcelas inválida');
        if (isNaN(valorParcela) || valorParcela <= 0) throw new Error('Valor da parcela inválido');
        const dataInicio = parseLocalDate(dataParcelada);
        const colecao = tipo === 'Pix Parcelado' ? 'pix' : 'boletos';

        // Grava uma parcela por mês, todas com a mesma chaveUnica
        for (let i = 0; i < parcelas; i++) {
          const dataParcela = new Date(dataInicio);
          dataParcela.setMonth(dataParcela.getMonth() + i);
          const pixBoletoData: PixBoletoParceladoData = { // Tipagem explícita
            descricao,
            tipo,
            beneficiario,
            valor: valorParcela, // Correção: o campo é 'valor' para estas coleções
            parcela: i + 1,
            parcelasTotais: parcelas,
            dataPagamento: Timestamp.fromDate(dataParcela),
            chaveUnica,
            criadoEm: Timestamp.now()
          };
          await addDoc(collection(db, 'usuarios', uid as string, colecao), pixBoletoData); // uid as string
        }
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }

      // === CARTÃO DE CRÉDITO ===
      if (tipo === 'Cartão de Crédito') {
        if (!cartaoSelecionado) throw new Error('Cartão não selecionado');
        const numParcelas = Number(parcelas) || 1;
        const valorNumericoTotal = parseCurrency(valor);
        if (isNaN(valorNumericoTotal) || valorNumericoTotal <= 0) throw new Error('Valor total inválido');
        const valorParcela = valorNumericoTotal / numParcelas;

        for (let i = 0; i < numParcelas; i++) {
          const dataParcela = new Date(dataBase);
          dataParcela.setMonth(dataParcela.getMonth() + i);

          const cartaoGasto: CartaoGastoData = { // Tipagem explícita
            descricao,
            tipo,
            categoria: categoria === 'Digitar' ? customCat.trim() : categoria,
            parcela: i + 1,
            totalParcelas: numParcelas,
            valor: valorParcela,
            data: Timestamp.fromDate(dataParcela),
            chaveUnica,
            criadoEm: Timestamp.now()
          };
          await addDoc(collection(db, 'usuarios', uid as string, 'cartoes', cartaoSelecionado as string, 'gastos'), cartaoGasto); // uid, cartaoSelecionado as string
        }
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }

      // === FINANCIAMENTOS ===
      if (tipo === 'Financiamentos') {
        const financiamento = finType === 'Outros (Digite)' ? customFin.trim() : finType;
        const parcelasRestantes = Number(remaining);
        const valorParcela = parseCurrency(installValue);
        if (isNaN(parcelasRestantes) || parcelasRestantes < 1) throw new Error('Quantidade de parcelas inválida');
        if (isNaN(valorParcela) || valorParcela <= 0) throw new Error('Valor da parcela inválido');
        const dataInicio = parseLocalDate(nextPayment);

        for (let i = 0; i < parcelasRestantes; i++) {
          const dataParcela = new Date(dataInicio);
          dataParcela.setMonth(dataParcela.getMonth() + i);
          const financiamentoData: FinanciamentoData = { // Tipagem explícita
            descricao,
            tipo,
            financiamento,
            valor: valorParcela, // Correção: o campo é 'valor' para estas coleções
            parcela: i + 1,
            parcelasTotais: parcelasRestantes,
            dataPagamento: Timestamp.fromDate(dataParcela),
            chaveUnica,
            criadoEm: Timestamp.now()
          };
          await addDoc(collection(db, 'usuarios', uid as string, 'financiamentos'), financiamentoData); // uid as string
        }
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }

      // === EMPRÉSTIMOS ===
      if (tipo === 'Empréstimos') {
        const banco = bancoEmprestimo === 'Outros (Digite)' ? customBanco.trim() : bancoEmprestimo;
        const parcelas = Number(parcelasEmprestimo);
        const valorParcela = parseCurrency(valorParcelaEmprestimo);
        const dataInicio = parseLocalDate(dataEmprestimo);
        if (!banco) throw new Error('Banco obrigatório');
        if (isNaN(parcelas) || parcelas < 1) throw new Error('Quantidade de parcelas inválida');
        if (isNaN(valorParcela) || valorParcela <= 0) throw new Error('Valor da parcela inválido');

        for (let i = 0; i < parcelas; i++) {
          const dataParcela = new Date(dataInicio);
          dataParcela.setMonth(dataParcela.getMonth() + i);
          const emprestimoData: EmprestimoData = { // Tipagem explícita
            descricao,
            tipo,
            banco,
            valor: valorParcela, // Correção: o campo é 'valor' para estas coleções
            parcela: i + 1,
            parcelasTotais: parcelas,
            dataPagamento: Timestamp.fromDate(dataParcela),
            chaveUnica,
            criadoEm: Timestamp.now()
          };
          await addDoc(collection(db, 'usuarios', uid as string, 'emprestimos'), emprestimoData); // uid as string
        }
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }

      // === COMPRA ÚNICA ===
      if (tipo === 'Compra Única' ) { // Removido 'Outras Recorrências' daqui, Assinatura já cobre recorrências
        const categoriaFinal = categoria === 'Digitar' ? customCat.trim() : categoria;
        const valorNumerico = parseCurrency(valor);
        if (isNaN(valorNumerico) || valorNumerico <= 0) throw new Error('Valor inválido');

        const despesaComum: DespesaComumData = { // Tipagem explícita
          descricao,
          tipo,
          categoria: categoriaFinal,
          valor: valorNumerico,
          data: Timestamp.fromDate(dataBase),
          criadoEm: Timestamp.now()
        };
        await addDoc(collection(db, 'usuarios', uid as string, 'gastos'), despesaComum); // uid as string
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }

      // === ASSINATURA (e "Outras Recorrências" podem ser consideradas assinaturas genéricas) ===
      if (tipo === 'Assinatura' || tipo === 'Outras Recorrências') { // Adicionado 'Outras Recorrências' aqui
        const serv = servico === 'Outros (Digite)' ? customServico.trim() : servico;
        if (!serv) throw new Error('Serviço/Nome da Recorrência obrigatório');
        const descricaoFinal = descricao.trim() ? descricao.trim() : serv;

        const valorNumericoAssinatura = parseCurrency(valor);
        if (isNaN(valorNumericoAssinatura) || valorNumericoAssinatura <= 0) throw new Error('Valor inválido');

        const assinaturaData: AssinaturaData = { // Tipagem explícita
          descricao: descricaoFinal,
          servico: serv,
          valor: valorNumericoAssinatura,
          diaPagamento: Timestamp.fromDate(parseLocalDate(diaPagamento)),
          recorrente: recorrencia,
          criadoEm: Timestamp.now(),
          canceladaEm: null
        };

        if (formaPagamento === 'Débito') {
          await addDoc(collection(db, 'usuarios', uid as string, 'assinaturas'), assinaturaData); // uid as string
        } else if (formaPagamento === 'Cartão') {
          if (!cartaoSelecionado) throw new Error('Cartão não selecionado para assinatura');
          // Para assinaturas via cartão, salvaremos na subcoleção de gastos do cartão,
          // mas com o tipo "assinaturas" e campos adicionais de assinatura
          const cartaoGastoAssinatura: CartaoGastoData & { servico: string, diaPagamento: Timestamp, recorrente: boolean, canceladaEm: Timestamp | null } = {
            descricao: descricaoFinal,
            tipo: 'assinaturas', // Tipo especial para diferenciar dos gastos de cartão comuns
            categoria: 'Assinaturas', // Categoria fixa para assinaturas
            valor: valorNumericoAssinatura,
            data: Timestamp.fromDate(parseLocalDate(diaPagamento)), // Usando 'data' para compatibilidade com gastos, mas guardando 'diaPagamento' tb
            servico: serv,
            diaPagamento: Timestamp.fromDate(parseLocalDate(diaPagamento)),
            recorrente: recorrencia,
            chaveUnica: chaveUnica, // Assinaturas também podem ter uma chave única, se houver lógica de grupos
            criadoEm: Timestamp.now(),
            canceladaEm: null,
            parcela: 1, // Assinatura não tem parcelas
            totalParcelas: 1 // Assinatura não tem parcelas
          };
          await addDoc(collection(db, 'usuarios', uid as string, 'cartoes', cartaoSelecionado as string, 'gastos'), cartaoGastoAssinatura); // uid, cartaoSelecionado as string
        }
        resetForm();
        setShowModal(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        return;
      }


    } catch (err: any) {
      console.error('Erro completo ao salvar despesa:', err?.message || err);
      alert(err?.message || 'Erro desconhecido ao salvar.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <form onSubmit={e => { e.preventDefault(); setShowModal(true); }} className="focus:outline-none w-full max-w-md bg-[#1a2a2a] p-6 rounded text-white space-y-4">
        <h1 className="text-2xl font-bold">Lançar Despesas</h1>
        {showSuccess && <div className="flex items-center gap-2 bg-green-600 text-black p-2 rounded"><FaCheckCircle /> Cadastrado com sucesso!</div>}
        {/* Descrição */}
        <div><label className="block mb-1">Descrição</label><input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} className="w-full p-2 rounded bg-[#111]" required /></div>
        {/* Tipo */}
        <div><label className="block mb-1">Tipo</label><select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-2 rounded bg-[#111]">{tipos.map(t => (
          <option key={t} value={t}>
            {t === 'Compra Única' ? 'À Vista' : t}
          </option>
        ))}</select></div>


        {/* Cartão */}
        {tipo === 'Cartão de Crédito' && (
          <>
            <div>
              <label className="block mb-1">Cartão</label>
              <select value={cartaoSelecionado} onChange={e => setCartaoSelecionado(e.target.value)} className="w-full p-2 rounded bg-[#111]" required>
                <option value="">Selecione um cartão</option>
                {cartoes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.apelido
                      ? `${c.banco} - ${c.apelido}`
                      : c.banco
                    }
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1">Data da Compra</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full p-2 rounded bg-[#111] text-white appearance-none" style={{ colorScheme: 'dark' }} required />
            </div>

            <div>
              <label className="block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full p-2 rounded bg-[#111]"
                required
              >
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
              {categoria === 'Digitar' && (
                <input
                  type="text"
                  placeholder="Digite a categoria"
                  value={customCat}
                  onChange={e => setCustomCat(e.target.value)}
                  className="w-full p-2 rounded bg-[#111] mt-2"
                  required
                />
              )}
            </div>

            <div>
              <label className="block mb-1">Qtde. Parcelas</label>
              <input type="number" min={1} step={1} value={parcelas} onChange={e => setParcelas(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-2 rounded bg-[#111]" />
            </div>

            <div>
              <label className="block mb-1">Valor Total</label>
              <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="w-full p-2 rounded bg-[#111]" required />
            </div>
          </>
        )}



        {/* Assinatura */}
        {(tipo === 'Assinatura' || tipo === 'Outras Recorrências') && ( // Alterado para incluir 'Outras Recorrências'
          <>
            <div>
              <label className="block mb-1">Forma de Pagamento</label>
              <select
                value={formaPagamento}
                onChange={e => setFormaPagamento(e.target.value)}
                className="w-full p-2 rounded bg-[#111]"
                required
              >
                <option value="Débito">Débito</option>
                <option value="Cartão">Cartão</option>
              </select>
            </div>

            {formaPagamento === 'Cartão' && (
              <div>
                <label className="block mb-1">Cartão</label>
                <select
                  value={cartaoSelecionado}
                  onChange={e => setCartaoSelecionado(e.target.value)}
                  className="w-full p-2 rounded bg-[#111]"
                  required
                >
                  <option value="">Selecione um cartão</option>
                  {cartoes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.banco}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block mb-1">Serviço/Nome (Ex: Academia, Aluguel)</label>
              <select
                value={servico}
                onChange={e => setServico(e.target.value)}
                className="w-full p-2 rounded bg-[#111]"
                required
              >
                {servicos.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {servico === 'Outros (Digite)' && (
              <input
                type="text"
                placeholder="Digite o serviço/nome"
                value={customServico}
                onChange={e => setCustomServico(e.target.value)}
                className="w-full p-2 rounded bg-[#111] mt-2"
                required
              />
            )}

            <div>
              <label className="block mb-1">Dia de Pagamento</label>
              <input
                type="date"
                value={diaPagamento}
                onChange={e => setDiaPagamento(e.target.value)}
                className="w-full p-2 rounded bg-[#111] text-white appearance-none"
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={recorrencia}
                  onChange={e => setRecorrencia(e.target.checked)}
                />
                Recorrente
              </label>
            </div>

            <div>
              <label className="block mb-1">Valor</label>
              <input
                type="text"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full p-2 rounded bg-[#111]"
                required
              />
            </div>


          </>
        )}



        {/* Pix ou Boleto Parcelado */}
        {(tipo === 'Pix Parcelado' || tipo === 'Boleto Parcelado') && (
          <>
            <div>
              <label className="block mb-1">Para quem foi o Pagamento?</label>
              <input
                type="text"
                value={beneficiario}
                onChange={e => setBeneficiario(e.target.value)}
                className="w-full p-2 rounded bg-[#111]"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Dia de Pagamento da 1ª Parcela</label>
              <input
                type="date"
                value={dataParcelada}
                onChange={e => setDataParcelada(e.target.value)}
                className="w-full p-2 rounded bg-[#111] text-white"
                style={{ colorScheme: 'dark' }}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Quantidade de Parcelas</label>
              <input
                type="number"
                min={1}
                value={parcelasParceladas}
                onChange={e => setParcelasParceladas(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full p-2 rounded bg-[#111]"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Valor da Parcela</label>
              <input
                type="text"
                value={valorParcelaParcelada}
                onChange={e => setValorParcelaParcelada(e.target.value)}
                placeholder="0,00"
                className="w-full p-2 rounded bg-[#111]"
                required
              />
            </div>
          </>
        )}


        {tipo === 'Empréstimos' && (
          <>
            <div><label className="block mb-1">Banco</label>
              <select value={bancoEmprestimo} onChange={e => setBancoEmprestimo(e.target.value)} className="w-full p-2 rounded bg-[#111]">
                {bancosEmprestimo.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            {bancoEmprestimo === 'Outros (Digite)' && (
              <div><input type="text" placeholder="Digite o banco" value={customBanco} onChange={e => setCustomBanco(e.target.value)} className="w-full p-2 rounded bg-[#111] mt-2" required /></div>
            )}
            <div><label className="block mb-1">Dia de Pagamento da 1ª Parcela</label>
              <input type="date" value={dataEmprestimo} onChange={e => setDataEmprestimo(e.target.value)} className="w-full p-2 rounded bg-[#111] text-white appearance-none" style={{ colorScheme: 'dark' }} required />
            </div>
            <div><label className="block mb-1">Total de Parcelas</label>
              <input type="number" min={1} step={1} value={parcelasEmprestimo} onChange={e => setParcelasEmprestimo(e.target.value)} className="w-full p-2 rounded bg-[#111]" required />
            </div>
            <div><label className="block mb-1">Valor da Parcela</label>
              <input type="text" value={valorParcelaEmprestimo} onChange={e => setValorParcelaEmprestimo(e.target.value)} className="w-full p-2 rounded bg-[#111]" placeholder="0,00" required />
            </div>
          </>
        )}

        {/* Financiamentos */}
        {tipo === 'Financiamentos' && (
          <>
            <div><label className="block mb-1">Tipo de Financiamento</label><select value={finType} onChange={e => setFinType(e.target.value)} className="w-full p-2 rounded bg-[#111]" required>{financTypes.map(f => <option key={f}>{f}</option>)}</select></div>
            {finType === 'Outros (Digite)' && <input type="text" placeholder="Digite o tipo de financiamento" value={customFin} onChange={e => setCustomFin(e.target.value)} className="w-full p-2 rounded bg-[#111] mt-2" required />}
            <div><label className="block mb-1">Dia de Pagamento da 1ª Parcela</label><input type="date" value={nextPayment} onChange={e => setNextPayment(e.target.value)} className="w-full p-2 rounded bg-[#111] text-white appearance-none" style={{ colorScheme: 'dark' }} required /></div>
            <div><label className="block mb-1">Parcelas Restantes</label><input type="number" min={1} step={1} value={remaining} onChange={e => setRemaining(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-2 rounded bg-[#111]" placeholder="" required /></div>
            <div><label className="block mb-1">Valor da Parcela</label><input type="text" value={installValue} onChange={e => setInstallValue(e.target.value)} placeholder="0,00" className="w-full p-2 rounded bg-[#111]" required /></div>
          </>
        )}
        {/* Categoria e Valor para Compra Única */}
        {tipo === 'Compra Única' && (
          <>
            <div>
              <label className="block mb-1">Quando foi paga?</label>
              <input
                type="date"
                className="w-full p-2 rounded bg-[#111] text-white appearance-none"
                style={{ colorScheme: 'dark' }}
                value={data}
                onChange={e => setData(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block mb-1">Categoria</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value)} className="w-full p-2 rounded bg-[#111]" required>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
              {categoria === 'Digitar' && (
                <input type="text" placeholder="Digite a categoria" value={customCat} onChange={e => setCustomCat(e.target.value)} className="w-full p-2 rounded bg-[#111] mt-2" required />
              )}
            </div>
            <div>
              <label className="block mb-1">Valor</label>
              <input type="text" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" className="w-full p-2 rounded bg-[#111]" required />
            </div>
          </>
        )}
        <button type="submit" disabled={carregando} className="w-full py-2 rounded bg-green-500 text-black font-bold">Cadastrar</button>
      </form>


      {/* Modal de confirmação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1a2a2a] p-6 rounded text-white max-w-sm w-full space-y-6">

            {/* Título */}
            <h2 className="text-center text-xl font-bold">Confirme o Lançamento</h2>

            {/* Descrição e Tipo */}
            <div className="text-center space-y-1">
              <p className="text-lg">{capitalizeWords(descricao)}</p>
              <p className="text-lg">{tipo}</p>
            </div>

            {/* Campos específicos por tipo */}
            <div className="space-y-2">
              {/* Cartão de Crédito */}
              {tipo === 'Cartão de Crédito' && (
                <>
                  <div className="flex justify-between gap-4">
                    <span>Cartão</span>
                    <span>
                      {(() => {
                        const c = cartoes.find(c => c.id === cartaoSelecionado)
                        return c
                          ? c.apelido
                            ? `${c.banco} - ${c.apelido}`
                            : c.banco
                          : ''
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Parcelas</span>
                    <span>{parcelas || 1}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valor da Parcela</span>
                    <span>
                      {formatBRL(
                        parseFloat(valor.replace(/[^0-9,]/g, '').replace(',', '.')) /
                        (Number(parcelas) || 1)
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Assinatura */}
              {(tipo === 'Assinatura' || tipo === 'Outras Recorrências') && (
                <>
                  <div className="flex justify-between gap-4">
                    <span>Serviço/Nome</span>
                    <span>
                      {servico === 'Outros (Digite)' ? customServico : servico}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Dia Pagamento</span>
                    <span>{formatDDMMYYYY(diaPagamento)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Recorrente</span>
                    <span>{recorrencia ? 'Sim' : 'Não'}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valor</span>
                    <span>
                      {formatBRL(
                        parseFloat(valor.replace(/[^0-9,]/g, '').replace(',', '.'))
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Financiamentos */}
              {tipo === 'Financiamentos' && (
                <>
                  <div className="flex justify-between gap-4">
                    <span>Financiamento</span>
                    <span>
                      {finType === 'Outros (Digite)' ? customFin : finType}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Próx. Pagamento</span>
                    <span>{formatDDMMYYYY(nextPayment)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Parcelas Restantes</span>
                    <span>{remaining || 1}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valor da Parcela</span>
                    <span>
                      {formatBRL(
                        parseFloat(
                          installValue.replace(/[^0-9,]/g, '').replace(',', '.')
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Data Final</span>
                    <span>
                      {formatDDMMYYYY(
                        new Date(
                          parseLocalDate(nextPayment).setMonth(
                            parseLocalDate(nextPayment).getMonth() +
                            (Number(remaining) || 1) -
                            1
                          )
                        )
                          .toISOString()
                          .slice(0, 10)
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Empréstimos */}
              {tipo === 'Empréstimos' && (
                <>
                  <div className="flex justify-between gap-4">
                    <span>Banco</span>
                    <span>
                      {bancoEmprestimo === 'Outros (Digite)'
                        ? customBanco
                        : bancoEmprestimo}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Próx. Pagamento</span>
                    <span>{formatDDMMYYYY(dataEmprestimo)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Parcelas</span>
                    <span>{parcelasEmprestimo}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valor da Parcela</span>
                    <span>
                      {formatBRL(
                        parseFloat(
                          valorParcelaEmprestimo.replace(/[^0-9,]/g, '').replace(',', '.')
                        )
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Pix Parcelado / Boleto Parcelado */}
              {(tipo === 'Pix Parcelado' || tipo === 'Boleto Parcelado') && (
                <>
                  <div className="flex justify-between gap-4">
                    <span>Beneficiário</span>
                    <span>{beneficiario}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Próx. Pagamento</span>
                    <span>{formatDDMMYYYY(dataParcelada)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Parcelas</span>
                    <span>{parcelasParceladas}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Valor da Parcela</span>
                    <span>
                      {formatBRL(
                        parseFloat(
                          valorParcelaParcelada.replace(/[^0-9,]/g, '').replace(',', '.')
                        )
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Data Final</span>
                    <span>
                      {formatDDMMYYYY(
                        new Date(
                          parseLocalDate(dataParcelada).setMonth(
                            parseLocalDate(dataParcelada).getMonth() +
                            (Number(parcelasParceladas) || 1) -
                            1
                          )
                        )
                          .toISOString()
                          .slice(0, 10)
                      )}
                    </span>
                  </div>
                </>
              )}

              {/* Data (para Compra Única) */}
              {tipo === 'Compra Única' && (
                <div className="flex justify-between gap-4">
                  <span>Data</span>
                  <span>{formatDDMMYYYY(data)}</span>
                </div>
              )}

              {/* Valor Total - Lógica Condicional para exibição */}
              <div className="flex justify-between gap-4 font-bold text-lg border-t border-gray-700 pt-2 mt-2">
                <span>Valor Total</span>
                <span>
                  {(() => {
                    const parseVal = (valStr: string) => parseFloat(valStr.replace(/[^0-9,]/g, '').replace(',', '.'));
                    switch (tipo) {
                      case 'Cartão de Crédito':
                        const totalCC = parseVal(valor);
                        return formatBRL(isNaN(totalCC) ? 0 : totalCC);
                      case 'Empréstimos':
                        const valEmp = parseVal(valorParcelaEmprestimo);
                        const parcEmp = Number(parcelasEmprestimo);
                        return formatBRL(isNaN(valEmp) || isNaN(parcEmp) ? 0 : valEmp * parcEmp);
                      case 'Financiamentos':
                        const valFin = parseVal(installValue);
                        const remFin = Number(remaining);
                        return formatBRL(isNaN(valFin) || isNaN(remFin) ? 0 : valFin * remFin);
                      case 'Pix Parcelado':
                      case 'Boleto Parcelado':
                        const valParc = parseVal(valorParcelaParcelada);
                        const numParc = Number(parcelasParceladas);
                        return formatBRL(isNaN(valParc) || isNaN(numParc) ? 0 : valParc * numParc);
                      case 'Compra Única':
                      case 'Assinatura':
                      case 'Outras Recorrências':
                        const valUnica = parseVal(valor);
                        return formatBRL(isNaN(valUnica) ? 0 : valUnica);
                      default:
                        return formatBRL(0);
                    }
                  })()}
                </span>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancelar
              </button>
              <button
                onClick={salvarDespesa}
                disabled={carregando}
                className="px-4 py-2 bg-blue-500 rounded"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}