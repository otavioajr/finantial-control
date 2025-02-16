import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  onAuthChange,
  getUserData,
  updateUserData 
} from './firebase-config.js';

let currentUser = null;

export function initAuth() {
  // Mostra a tela de login por padrão antes de verificar autenticação
  showLogin();
  
  return new Promise((resolve) => {
    onAuthChange((user) => {
      currentUser = user;
      console.log('Estado de autenticação alterado:', user);
      if (user) {
        showApp();
        loadUserData().then(() => resolve(user));
      } else {
        showLogin();
        resolve(null);
      }
    });
  });
}

export async function login(username, password) {
  try {
    await loginUser(username, password);
  } catch (error) {
    throw error;
  }
}

export async function register(email, password) {
  try {
    await registerUser(email, password);
    // Removido o login automático após o registro
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    await logoutUser();
  } catch (error) {
    throw error;
  }
}

export async function saveUserData(data) {
  if (!currentUser) return;
  try {
    await updateUserData(currentUser.uid, data);
  } catch (error) {
    throw error;
  }
}

export function isCurrentUserAdmin() {
  return currentUser?.isAdmin || false;
}

async function loadUserData() {
  if (!currentUser) return;
  try {
    const data = await getUserData(currentUser.uid);
    currentUser.isAdmin = data.isAdmin;
    window.dispatchEvent(new CustomEvent('userDataLoaded', { detail: data }));
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('login-page').classList.remove('hidden');
}
