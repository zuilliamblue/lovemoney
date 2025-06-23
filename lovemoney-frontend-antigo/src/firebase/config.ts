// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Importe o Firestore
import { getAuth } from "firebase/auth"; // Importe o Auth
import { getAnalytics } from "firebase/analytics"; // Você já tinha este

// Suas credenciais do Firebase - agora vêm de variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Garante que o app Firebase seja inicializado apenas uma vez
// Isso evita erros de "Firebase: No Firebase App '[DEFAULT]' has been created" em ambientes como Next.js
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Inicializa os serviços que você vai usar
export const db = getFirestore(app);
export const auth = getAuth(app);
// Condicionalmente inicializa o Analytics, pois ele pode dar erro em ambientes que não são de navegador
// Além disso, apenas se o measurementId estiver disponível
let analytics: any;
if (app.name && typeof window !== 'undefined' && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.warn("Analytics não pôde ser inicializado:", error);
  }
}

export { app, analytics };