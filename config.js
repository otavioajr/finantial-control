import { db, auth } from "./firebase-config.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { criarTransacoesSalariais } from "./finance.js";

// Salvar configurações
export async function salvarConfiguracoes(novasConfigs) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const configRef = doc(db, "configuracoes", user.uid);
    const configDoc = await getDoc(configRef);

    if (configDoc.exists()) {
      // Atualiza as configurações existentes
      await updateDoc(configRef, novasConfigs);
    } else {
      // Cria novas configurações
      await setDoc(configRef, {
        ...novasConfigs,
        userId: user.uid,
        createdAt: new Date()
      });
    }

    // Se as configurações incluem salário, cria as transações
    if ('salarioBase' in novasConfigs) {
      await criarTransacoesSalariais(novasConfigs);
    }

    alert("Configurações salvas com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar configurações:", error);
    alert("Erro ao salvar configurações: " + error.message);
  }
}

// Carregar configurações
export async function carregarConfiguracoes() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const configRef = doc(db, "configuracoes", user.uid);
    const configDoc = await getDoc(configRef);

    if (configDoc.exists()) {
      return configDoc.data();
    }

    return null;
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    return null;
  }
}