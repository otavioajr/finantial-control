import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// Função simples para verificar autenticação
export function isAuthenticated() {
  return auth.currentUser !== null;
}

// Verifica se email existe
export async function checkEmailExists(email) {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods && methods.length > 0;  // Retorna true se houver métodos de login para o email
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    // Se o erro for auth/invalid-email, retorna false em vez de lançar erro
    if (error.code === 'auth/invalid-email') {
      return false;
    }
    throw error; // Lança outros tipos de erro
  }
}

// Login com validação melhorada
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      localStorage.setItem('userLoggedIn', 'true');
      window.location.href = 'home.html';
    }
  } catch (error) {
    console.error("Erro no login:", error);
    localStorage.removeItem('userLoggedIn');
    
    // Trata erros específicos
    if (error.code === 'auth/wrong-password') {
      throw new Error('Senha incorreta');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('Usuário não encontrado');
    } else {
      throw error; // Lança outros tipos de erro
    }
  }
}

// Registro com dados adicionais
export async function register(email, password, username) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Salva dados adicionais do usuário
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      email: email,
      createdAt: new Date(),
    });

    window.location.href = "home.html";
  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    throw error;
  }
}

// Certifique-se que a função logout está exportada corretamente
export async function logout() {
  try {
    await signOut(auth);
    localStorage.removeItem('userLoggedIn');
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout: " + error.message);
  }
}

// E que a função checkAuth está correta
export function checkAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && !window.location.pathname.endsWith('index.html')) {
        window.location.replace('index.html');
      }
      unsubscribe();
      resolve(user);
    });
  });
}
