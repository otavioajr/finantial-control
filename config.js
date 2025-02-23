import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { criarTransacoesSalariais } from "./finance.js";

// Função para verificar autenticação
async function verificarAuth() {
  return new Promise((resolve, reject) => {
    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      reject(new Error("Timeout ao verificar autenticação"));
    }, 10000);

    const unsubscribe = auth.onAuthStateChanged(user => {
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    }, (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Salvar configurações
export async function salvarConfiguracoes(novasConfigs) {
  try {
    const user = await verificarAuth();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // Buscar configurações antigas para comparar mudanças
    const configRef = doc(db, "configuracoes", user.uid);
    const configAntigaDoc = await getDoc(configRef);
    const configAntiga = configAntigaDoc.exists() ? configAntigaDoc.data() : null;

    // Ajusta o objeto de configuração
    const configData = {
      ...novasConfigs,
      userId: user.uid,
      updatedAt: new Date()
    };

    try {
      // Salva as novas configurações
      if (configAntigaDoc.exists()) {
        await updateDoc(configRef, configData);
      } else {
        configData.createdAt = new Date();
        await setDoc(configRef, configData);
      }

      // Verifica se houve mudança nas configurações de salário ou investimento
      const houveMudancaInvestimento = configAntiga && (
        configAntiga.temInvestimento !== novasConfigs.temInvestimento ||
        configAntiga.porcentagemInvestimento !== novasConfigs.porcentagemInvestimento ||
        configAntiga.valorFixoInvestimento !== novasConfigs.valorFixoInvestimento ||
        configAntiga.salarioBase !== novasConfigs.salarioBase
      );

      // Se houve mudança no investimento ou salário, atualiza as transações
      if ('salarioBase' in novasConfigs || houveMudancaInvestimento) {
        console.log("Atualizando transações salariais e de investimento...");
        await criarTransacoesSalariais({
          ...novasConfigs,
          userId: user.uid,
          atualizarInvestimentos: true
        });
      }

      return true;
    } catch (error) {
      console.error("Erro ao salvar no Firestore:", error);
      throw new Error("Erro ao salvar configurações: " + error.message);
    }
  } catch (error) {
    console.error("Erro completo:", error);
    throw error;
  }
}

// Carregar configurações
export async function carregarConfiguracoes() {
  try {
    const user = await verificarAuth();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    console.log("Carregando configurações para usuário:", user.uid);
    
    const configRef = doc(db, "configuracoes", user.uid);
    const configDoc = await getDoc(configRef);

    if (configDoc.exists()) {
      console.log("Configurações encontradas");
      return configDoc.data();
    }

    console.log("Nenhuma configuração encontrada");
    return null;
  } catch (error) {
    console.error("Erro detalhado ao carregar configurações:", error);
    throw new Error(error.message || "Erro ao carregar configurações");
  }
}