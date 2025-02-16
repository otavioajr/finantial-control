// script.js
import { initApp, setupEventListeners } from './ui.js';
import { initAuth, login, register } from './auth.js';

document.addEventListener("DOMContentLoaded", async () => {
  // Espera a inicialização da autenticação antes de continuar
  await initAuth();
  initApp();
  setupEventListeners();
  setupAuthListeners();
});

function setupAuthListeners() {
  // Toggle entre login e registro
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Oculta os formulários existentes
      document.querySelectorAll('.auth-form').forEach(form => form.classList.add('hidden'));
      
      const formId = `${tab.dataset.tab}-form`;
      document.getElementById(formId).classList.remove('hidden');
    });
  });

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
}
