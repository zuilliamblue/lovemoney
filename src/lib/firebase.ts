// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // Se for usar autenticação

const firebaseConfig = {
  apiKey: "AIzaSyDsUH_2WsUUprHLUA7qtAx9-jt93v1pbZY",
  authDomain: "love-money-b6544.firebaseapp.com",
  projectId: "love-money-b6544",
  storageBucket: "love-money-b6544.firebasestorage.app",
  messagingSenderId: "1034972487841",
  appId: "1:1034972487841:web:b62ab17a65d211508e10e0",
  measurementId: "G-KLG9Y0FLYK"

};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa os serviços que você vai usar
export const db = getFirestore(app);
export const auth = getAuth(app); // Se for usar autenticação

export default app;