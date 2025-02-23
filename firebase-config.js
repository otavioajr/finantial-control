// firebase-config.js
// Exemplo mínimo de configuração do Firebase. Substitua com as suas credenciais do Firebase.

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB_pmDLHiOZV7BCBOOUctLKcBCuLv3jiHU",
    authDomain: "controle-financeiro-money.firebaseapp.com",
    projectId: "controle-financeiro-money",
    storageBucket: "controle-financeiro-money.firebasestorage.app",
    messagingSenderId: "494576547149",
    appId: "1:494576547149:web:ad424481633428bbaf3304",
    measurementId: "G-5B4053L6E4"
  };

const app = initializeApp(firebaseConfig);

// Exporte instâncias para usar no restante do app
export const auth = getAuth(app);
export const db = getFirestore(app);

// Atualize estas regras de segurança no Console do Firebase:
/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Funções auxiliares
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUserDoc(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Regras para coleção users
    match /users/{userId} {
      allow read, write: if isUserDoc(userId);
    }
    
    // Regras para coleção configuracoes
    match /configuracoes/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
    
    // Regras para coleção transacoes
    match /transacoes/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
*/
