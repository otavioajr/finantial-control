// script.js
import { initApp, setupEventListeners } from './ui.js';
import { initAuth, login, register, logout } from './auth.js';

document.addEventListener("DOMContentLoaded", () => {
  // Inicializar autenticação e aguardar resultado
  initAuth().then((user) => {
    console.log('Inicialização completa, usuário:', user?.email || 'nenhum');
    if (user) {
      initApp();
      setupEventListeners();
    }
    setupAuthListeners();
  }).catch(error => {
    console.error('Erro na inicialização:', error);
    showLogin();
  });
});

function setupAuthListeners() {
  // Toggle entre login e registro
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active de todas as abas
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      // Adiciona active na aba clicada
      tab.classList.add('active');
      
      // Remove active de todos os formulários
      document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
        form.classList.remove('hidden'); // Remove hidden de todos os formulários
      });
      
      // Mostra o formulário correspondente
      const formId = `${tab.dataset.tab}-form`;
      const form = document.getElementById(formId);
      if (form) {
        form.classList.add('active');
        form.classList.remove('hidden');
      }
    });
  });

  // Ativar formulário de login por padrão
  const loginTab = document.querySelector('.auth-tab[data-tab="login"]');
  if (loginTab) {
    loginTab.click();
  }

  // Formulário de login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    console.log('Tentando login com email:', email);
    try {
      await login(email, password);
      console.log('Login efetuado');
    } catch (error) {
      alert(error.message);
    }
  });

  // Formulário de registro
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-password-confirm').value;
    
    if (password !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    
    try {
      await register(email, password);
      alert('Registro realizado com sucesso! Por favor, faça login.');
      
      // Limpa os campos do formulário
      document.getElementById('register-email').value = '';
      document.getElementById('register-password').value = '';
      document.getElementById('register-password-confirm').value = '';
      
      // Alterna para a aba de login
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.auth-tab[data-tab="login"]').classList.add('active');
      document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
      document.getElementById('login-form').classList.remove('hidden');
      
      // Preenche automaticamente o email no formulário de login
      document.getElementById('login-email').value = email;
    } catch (error) {
      alert(error.message);
    }
  });

  // Adicionar evento para o botão de logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await logout();
      console.log('Logout efetuado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout');
    }
  });
}
