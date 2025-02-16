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
  return new Promise((resolve) => {
    const unsubscribe = onAuthChange((user) => {
      currentUser = user;
      console.log('Estado de autenticação:', user ? 'Autenticado' : 'Não autenticado');
      
      if (user) {
        showApp();
        // Carrega os dados em segundo plano
        loadUserData()
          .then(() => {
            resolve(user);
          })
          .catch((error) => {
            console.error('Erro ao carregar dados:', error);
            resolve(user);
          });
      } else {
        showLogin();
        resolve(null);
      }
    });

    // Adicionar cleanup para evitar memory leaks
    window.addEventListener('unload', () => {
      unsubscribe();
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
  if (!currentUser) {
    console.log('Nenhum usuário autenticado');
    return;
  }
  
  try {
    console.log('Carregando dados para usuário:', currentUser.uid);
    const data = await getUserData(currentUser.uid);
    
    if (!data) {
      console.log('Nenhum dado encontrado para o usuário');
      return;
    }

    currentUser.isAdmin = data.isAdmin;
    console.log('Dados carregados com sucesso');
    
    // Usar setTimeout para evitar o erro do message channel
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('userDataLoaded', { 
        detail: data,
        bubbles: true 
      }));
    }, 0);

    return data;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
}

function showApp() {
  console.log('Usuário logado, exibindo app');
  document.getElementById('login-page').classList.add('hidden'); // Corrigido: deve ser add, não remove
  document.getElementById('app-container').classList.remove('hidden');
}

function showLogin() {
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
  
  // Garantir que os formulários de autenticação estejam visíveis
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  // Mostrar o formulário de login por padrão
  if (loginForm) {
    loginForm.classList.add('active');
    document.querySelector('.auth-tab[data-tab="login"]')?.classList.add('active');
  }
  if (registerForm) {
    registerForm.classList.remove('active');
    document.querySelector('.auth-tab[data-tab="register"]')?.classList.remove('active');
  }
}
