'use client';

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaGoogle, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [mostraSenha, setMostraSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Validações em tempo real
  const emailValido = email.includes('@');
  const senhaCurta = senha.length > 0 && senha.length < 6;
  const senhasDiferentes = confirmaSenha.length > 0 && senha !== confirmaSenha;

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValido) { setErro('E-mail inválido.'); return; }
    if (senha.length < 6) { setErro('Senha deve ter no mínimo 6 dígitos.'); return; }
    if (senha !== confirmaSenha) { setErro('As senhas não coincidem.'); return; }
    setErro(''); setCarregando(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(userCred.user, { displayName: nome });
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro no sign-up:', err);
      setErro(err.message || 'Erro ao criar conta.');
    } finally {
      setCarregando(false);
    }
  }

  async function signupWithGoogle() {
    setErro('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Erro no Google sign-up:', err);
      setErro(err.message || 'Erro ao cadastrar com Google.');
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center px-4 space-y-6">
      <img src="/logo.png" alt="LoveMoney" className="w-40 drop-shadow-[0_0_15px_gold]" />

      <button
        onClick={signupWithGoogle}
        className="w-full max-w-sm flex items-center justify-center border border-white/20 rounded-md py-2 bg-white/5 hover:bg-white/10 transition text-white"
      >
        <FaGoogle className="text-red-500 mr-2" />
        Cadastrar com Google
      </button>

      <div className="flex items-center w-full max-w-sm">
        <hr className="flex-grow border-white/20" />
        <span className="px-2 text-white/70">ou</span>
        <hr className="flex-grow border-white/20" />
      </div>

      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4 bg-white/5 p-6 rounded-xl backdrop-blur shadow-lg text-white">
        <h2 className="text-white text-xl font-bold text-center mb-2">Cadastre-se</h2>

        <input
          type="text"
          placeholder="Nome"
          value={nome}
          onChange={e => setNome(e.target.value)}
          className="w-full p-2 rounded bg-white/10 placeholder-white/70 border border-white/20 text-white"
          required
        />

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-white/10 placeholder-white/70 border border-white/20 text-white"
          required
        />
        {!emailValido && email.length > 0 && (
          <p className="text-yellow-300 text-sm">O e-mail deve conter '@'.</p>
        )}

        <div className="relative">
          <input
            type={mostraSenha ? 'text' : 'password'}
            placeholder="Senha"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            className="w-full p-2 pr-10 rounded bg-white/10 placeholder-white/70 border border-white/20 text-white"
            required
          />
          <button
            type="button"
            onClick={() => setMostraSenha(!mostraSenha)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white"
          >
            {mostraSenha ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
        {senhaCurta && (
          <p className="text-yellow-300 text-sm">A senha precisa ter no mínimo 6 dígitos.</p>
        )}

        <input
          type={mostraSenha ? 'text' : 'password'}
          placeholder="Confirmar senha"
          value={confirmaSenha}
          onChange={e => setConfirmaSenha(e.target.value)}
          className="w-full p-2 rounded bg-white/10 placeholder-white/70 border border-white/20 text-white"
          required
        />
        {senhasDiferentes && (
          <p className="text-yellow-300 text-sm">As senhas não coincidem.</p>
        )}

        {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full py-2 rounded bg-yellow-400 text-black disabled:opacity-50 hover:bg-yellow-300 transition"
        >
          {carregando ? 'Criando...' : 'Cadastrar'}
        </button>

        <div className="text-center text-sm">
          <Link href="/login" className="text-white underline">
            Já tem conta? Faça login
          </Link>
        </div>
      </form>
    </div>
  );
}
