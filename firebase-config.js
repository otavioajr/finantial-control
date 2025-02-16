import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Configuração do Firebase
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
// const analytics = getAnalytics(app); // Opcional, remova se não for usar
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = 'root';
const ADMIN_PASSWORD = 'Belinha@0147';

// Adicionar após a inicialização do Firebase
async function setupAdminUser() {
  try {
    // Tenta fazer login como admin primeiro
    try {
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('Admin já existe');
      await signOut(auth); // Faz logout para não interferir com o fluxo normal
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Se o admin não existe, cria ele
        const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: ADMIN_EMAIL,
          isAdmin: true,
          configSalarial: {},
          transacoes: {
            receitas: [],
            despesas: []
          },
          inicioMes: new Date().getMonth() + 1,
          inicioAno: new Date().getFullYear()
        });
        console.log('Admin criado com sucesso');
        await signOut(auth); // Faz logout após criar
      } else {
        console.error('Erro ao verificar admin:', error);
      }
    }
  } catch (error) {
    console.error('Erro ao configurar admin:', error);
  }
}

// Modificar a função de login para usar email diretamente
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Removido o setup de admin aqui para tornar o login mais rápido
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Criar documento inicial do usuário com todos os campos necessários
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      isAdmin: false,
      configSalarial: {
        salarioBase: 0,
        temAdiantamento: false,
        porcentagemAdiantamento: 40,
        diaAdiantamento: 15,
        diaPagamento: 30,
        diaSalario: 5,
        querInvestir: false,
        investPorcentagem: 0,
        investManual: 0
      },
      transacoes: {
        receitas: [],
        despesas: []
      },
      inicioMes: new Date().getMonth() + 1,
      inicioAno: new Date().getFullYear()
    });
    
    return userCredential.user;
  } catch (error) {
    throw new Error(getErrorMessage(error.code));
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('Erro ao fazer logout');
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Modificar a função getUserData para incluir informação de admin
export async function getUserData(userId) {
  try {
    if (!userId) {
      console.error('ID do usuário não fornecido');
      return null;
    }

    if (!auth.currentUser) {
      console.error('Usuário não está autenticado');
      return null;
    }

    console.log('Tentando acessar documento:', userId);
    const docRef = doc(db, 'users', userId);
    
    try {
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.log('Documento não existe, criando novo...');
        const defaultData = {
          email: auth.currentUser.email,
          isAdmin: false,
          configSalarial: {
            salarioBase: 0,
            temAdiantamento: false,
            porcentagemAdiantamento: 40,
            diaAdiantamento: 15,
            diaPagamento: 30,
            diaSalario: 5,
            querInvestir: false,
            investPorcentagem: 0,
            investManual: 0
          },
          transacoes: {
            receitas: [],
            despesas: []
          },
          inicioMes: new Date().getMonth() + 1,
          inicioAno: new Date().getFullYear()
        };

        // Tenta criar o documento
        try {
          await setDoc(docRef, defaultData);
          console.log('Documento criado com sucesso');
          return defaultData;
        } catch (setError) {
          console.error('Erro ao criar documento:', setError);
          throw new Error('Erro ao criar perfil do usuário');
        }
      }

      return docSnap.data();
    } catch (getError) {
      console.error('Erro ao acessar documento:', getError);
      throw new Error('Erro ao acessar dados do usuário');
    }
  } catch (error) {
    console.error('Erro detalhado:', error);
    throw error;
  }
}

export async function updateUserData(userId, data) {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, data);
  } catch (error) {
    throw new Error('Erro ao atualizar dados do usuário');
  }
}

function getErrorMessage(errorCode) {
  const errorMessages = {
    'auth/invalid-email': 'Email inválido',
    'auth/user-disabled': 'Usuário desabilitado',
    'auth/user-not-found': 'Usuário não encontrado',
    'auth/wrong-password': 'Senha incorreta',
    'auth/email-already-in-use': 'Email já está em uso',
    'auth/operation-not-allowed': 'Operação não permitida',
    'auth/weak-password': 'Senha muito fraca'
  };
  return errorMessages[errorCode] || 'Erro desconhecido';
}
