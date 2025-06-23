// Cole este código no seu arquivo da página de login

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/firebase/config';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { FaGoogle } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function criarUsuarioNoFirestore(user: any) {
    try {
      const userRef = doc(db, 'usuarios', user.uid);
      await setDoc(
        userRef,
        {
          nome: user.displayName || '',
          email: user.email || '',
          avatar: user.photoURL || '',
          criadoEm: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (fireErr) {
      console.error('Erro ao salvar usuário no Firestore:', fireErr);
    }
  }

  async function loginEmailSenha(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, senha);
      const user = cred.user;
      await criarUsuarioNoFirestore(user);
      router.push(`/cliente/${user.uid}/dashboard`);
    } catch (authErr: any) {
      setErro('E-mail ou senha incorretos.');
      console.error('Erro de autenticação (email/senha):', authErr);
    } finally {
      setCarregando(false);
    }
  }

  async function loginGoogle() {
    setErro('');
    setCarregando(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await criarUsuarioNoFirestore(user);
      router.push(`/cliente/${user.uid}/dashboard`);
    } catch (authErr: any) {
      setErro('Erro ao fazer login com Google.');
      console.error('Erro de autenticação (Google):', authErr);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center items-center p-4">
      {/* LOGO AJUSTADO: w-40 para w-32 e mb-6 para mb-8 */}
      <img src="/logo.png" alt="LoveMoney" className="w-32 mb-8 drop-shadow-[0_0_15px_gold]" />

      <button
        onClick={loginGoogle}
        disabled={carregando}
        className="w-full max-w-sm flex items-center justify-center border border-white/20 rounded-md py-2 bg-white/5 hover:bg-white/10 text-white mb-4"
      >
        <FaGoogle className="text-red-500 mr-2" />
        Continue com Google
      </button>

      <div className="flex items-center w-full max-w-sm mb-4">
        <hr className="flex-grow border-white/20" />
        <span className="px-2 text-white/70">ou</span>
        <hr className="flex-grow border-white/20" />
      </div>

      <form onSubmit={loginEmailSenha} className="w-full max-w-sm bg-white/5 p-6 rounded-xl backdrop-blur shadow-lg space-y-4">
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-white/10 text-white placeholder-white/70 border border-white/20"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          className="w-full p-2 rounded bg-white/10 text-white placeholder-white/70 border border-white/20"
          required
        />
        {erro && <p className="text-red-500 text-sm text-center">{erro}</p>}
        <button
          type="submit"
          disabled={carregando}
          className="w-full py-2 rounded bg-yellow-400 text-black disabled:opacity-50 hover:bg-yellow-300 transition"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
        <div className="flex justify-between text-sm text-white">
          <Link href="/recuperar-senha" className="underline">
            Esqueci a senha
          </Link>
          <Link href="/cadastro" className="underline">
            Cadastre-se
          </Link>
        </div>
      </form>
    </div>
  );
}