// finance.js
import { db, auth } from "./firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  onSnapshot,
  Timestamp,
  getDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";
import { 
  isDiaUtil, 
  encontrarDiaUtilAnterior, 
  ajustarDiaParaMes, 
  formatarData, 
  FERIADOS_NACIONAIS,
  isDiaNaoUtil,
  formatMoney,
  getDataTooltip,
  formatTransacoesTooltip
} from './date-utils.js';

// Primeiro, adicione esta variável global no início do arquivo
let statusMeses = {};

// Atualizar a função convertDateToTimestamp
function convertDateToTimestamp(dataInput) {
  try {
    // Garante que a data está no formato correto YYYY-MM-DD
    if (!dataInput || !/^\d{4}-\d{2}-\d{2}$/.test(dataInput)) {
      throw new Error('Formato de data inválido');
    }

    // Cria a data às 12:00:00 para evitar problemas de timezone
    const [year, month, day] = dataInput.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    // Verifica se a data é válida
    if (isNaN(date.getTime())) {
      throw new Error('Data inválida');
    }

    return Timestamp.fromDate(date);
  } catch (error) {
    console.error('Erro ao converter data:', error);
    throw error;
  }
}

// Modifique a função addReceita
export async function addReceita(valor, data, descricao) {
  const user = auth.currentUser;
  if (!user) {
    console.error("Usuário não autenticado");
    return;
  }

  try {
    const novaTransacao = {
      userId: user.uid,
      tipo: "receita",
      valor: Number(valor),
      data: convertDateToTimestamp(data),
      descricao: descricao,
      createdAt: new Date()
    };

    await addDoc(collection(db, "transacoes"), novaTransacao);
    console.log("Receita adicionada com sucesso");
    alert("Receita adicionada com sucesso!");
    return true;
  } catch (error) {
    console.error("Erro ao adicionar receita:", error);
    alert("Erro ao adicionar receita: " + error.message);
    return false;
  }
}

// Modifique a função addDespesa
export async function addDespesa(valor, data, descricao, tipoDespesa, qtdMeses = 1) {
  const user = auth.currentUser;
  if (!user) {
    console.error("Usuário não autenticado");
    return;
  }

  try {
    const promises = [];
    const [anoInicial, mesInicial, diaInicial] = data.split('-').map(Number);

    for (let i = 0; i < qtdMeses; i++) {
      const dataParcela = new Date(anoInicial, mesInicial - 1 + i, diaInicial);
      const dataFormatada = dataParcela.toISOString().split('T')[0];
      const descricaoCompleta = qtdMeses > 1 
        ? `${descricao} (${i + 1}/${qtdMeses})`
        : descricao;

      const novaTransacao = {
        userId: user.uid,
        tipo: "despesa",
        valor: Number(valor),
        data: convertDateToTimestamp(dataFormatada),
        descricao: descricaoCompleta,
        tipoDespesa: tipoDespesa,
        createdAt: new Date(),
        parcelaAtual: i + 1,
        totalParcelas: qtdMeses
      };

      promises.push(addDoc(collection(db, "transacoes"), novaTransacao));
    }

    await Promise.all(promises);
    console.log("Despesa(s) adicionada(s) com sucesso");
    alert(`${qtdMeses} despesa(s) adicionada(s) com sucesso!`);
    return true;
  } catch (error) {
    console.error("Erro ao adicionar despesa:", error);
    alert("Erro ao adicionar despesa: " + error.message);
    return false;
  }
}

// Adicione esta função auxiliar para debug
function logTransacao(transacao) {
  console.log("Nova transação:", {
    ...transacao,
    data: transacao.data.toDate(),
    createdAt: transacao.createdAt.toDate()
  });
}

// Modifique também a função getRelatorioMensal
export async function getRelatorioMensal(ano, mes) {
  const user = auth.currentUser;
  if (!user) return [];

  // Ajusta as datas início e fim para considerar o fuso horário
  const startDate = new Date(ano, mes - 1, 1, 0, 0, 0);
  const endDate = new Date(ano, mes, 0, 23, 59, 59, 999);

  try {
    const q = query(
      collection(db, "transacoes"),
      where("userId", "==", user.uid),
      where("data", ">=", Timestamp.fromDate(startDate)),
      where("data", "<=", Timestamp.fromDate(endDate))
    );

    const querySnapshot = await getDocs(q);

    let result = [];
    querySnapshot.forEach((docSnap) => {
      result.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Ordenar por data ou outro critério se desejar
    // result.sort((a, b) => (a.data > b.data ? 1 : -1));

    return result;
  } catch (error) {
    console.error("Erro ao buscar relatório mensal:", error);
    return [];
  }
}

// Retorna todas as transações do usuário
export async function getAllTransacoes() {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, "transacoes"),
      where("userId", "==", user.uid)
    );
    const querySnapshot = await getDocs(q);

    let result = [];
    querySnapshot.forEach((docSnap) => {
      result.push({ id: docSnap.id, ...docSnap.data() });
    });
    // Opcional: ordenar por data
    // result.sort((a, b) => (a.data > b.data ? 1 : -1));
    return result;
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
}

// Deleta transação pelo ID
export async function deleteTransacao(id) {
  try {
    // Primeiro, obtém a transação que será excluída
    const transacaoRef = doc(db, "transacoes", id);
    const transacaoDoc = await getDoc(transacaoRef);
    const transacao = transacaoDoc.data();

    // Se for uma despesa fixa parcelada
    if (transacao.tipo === "despesa" && 
        transacao.tipoDespesa === "fixa" && 
        transacao.totalParcelas > 1) {
      
      const descricaoBase = transacao.descricao.split(" (")[0]; // Remove o sufixo (X/Y)
      const parcelaAtual = transacao.parcelaAtual;
      
      // Busca todas as parcelas relacionadas a partir da parcela atual
      const parcelasQuery = query(
        collection(db, "transacoes"),
        where("userId", "==", auth.currentUser.uid),
        where("tipoDespesa", "==", "fixa"),
        where("valor", "==", transacao.valor),
        where("totalParcelas", "==", transacao.totalParcelas)
      );

      const parcelasSnapshot = await getDocs(parcelasQuery);
      
      // Exclui apenas as parcelas a partir da selecionada
      const batch = writeBatch(db);
      parcelasSnapshot.forEach(doc => {
        const parcela = doc.data();
        // Verifica se é da mesma série de parcelas e se é a partir da parcela atual
        if (parcela.descricao.startsWith(descricaoBase) && 
            parcela.parcelaAtual >= parcelaAtual) {
          batch.delete(doc.ref);
        }
      });
      
      await batch.commit();
      alert(`Parcelas ${parcelaAtual} até ${transacao.totalParcelas} foram excluídas com sucesso!`);
    } else {
      // Se não for parcelada, exclui apenas a transação específica
      await deleteDoc(transacaoRef);
      alert("Transação excluída com sucesso!");
    }
    return true;
  } catch (error) {
    console.error("Erro ao excluir transação:", error);
    alert("Erro ao excluir transação: " + error.message);
    throw error;
  }
}

// Função para inicializar o relatório
// Adicionar variável para controlar inicialização
let isReportInitialized = false;

// Modificar a função initializeReport para melhor controle das atualizações
export function initializeReport() {
  if (isReportInitialized) return; // Evita inicialização múltipla
  
  const tableBody = document.getElementById("relatorioTableBody");
  const selectAno = document.getElementById("selectAno");
  const monthButtons = document.querySelectorAll(".month-btn");
  
  if (!tableBody || !selectAno || !monthButtons.length) return;

  isReportInitialized = true;
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;
  let currentUnsubscribe = null;

  // Função para atualizar o relatório
  async function updateReport(ano = anoAtual, mes = mesAtual) {
    try {
      if (currentUnsubscribe) {
        currentUnsubscribe();
      }

      const startDate = new Date(Date.UTC(ano, mes - 1, 1));
      const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

      const q = query(
        collection(db, "transacoes"),
        where("userId", "==", auth.currentUser.uid),
        where("data", ">=", Timestamp.fromDate(startDate)),
        where("data", "<=", Timestamp.fromDate(endDate))
      );

      // Busca inicial
      const initialSnapshot = await getDocs(q);
      const initialTransacoes = [];
      initialSnapshot.forEach(doc => {
        initialTransacoes.push({ id: doc.id, ...doc.data() });
      });
      
      await atualizarTabelaMesclada(ano, mes, initialTransacoes);
      await verificarStatusMeses(ano);
      await atualizarRodape(initialTransacoes); // Adiciona esta linha

      // Configura listener para atualizações em tempo real
      currentUnsubscribe = onSnapshot(q, async (snapshot) => {
        const transacoes = [];
        snapshot.forEach(doc => {
          transacoes.push({ id: doc.id, ...doc.data() });
        });
        await atualizarTabelaMesclada(ano, mes, transacoes);
        await verificarStatusMeses(ano);
        await atualizarRodape(transacoes); // Adiciona esta linha
      });
    } catch (error) {
      console.error("Erro ao atualizar relatório:", error);
    }
  }

  // Inicialização
  (async function inicializarRelatorio() {
    try {
      // Limpa o select antes de popular
      selectAno.innerHTML = '';
      
      // Popula select de anos (5 anos para trás e 5 para frente)
      for (let ano = anoAtual - 5; ano <= anoAtual + 5; ano++) {
        const option = document.createElement("option");
        option.value = ano;
        option.textContent = ano;
        if (ano === anoAtual) option.selected = true;
        selectAno.appendChild(option);
      }

      // Desmarca todos os meses e seleciona o atual
      monthButtons.forEach(btn => {
        btn.classList.remove('selected');
        if (parseInt(btn.dataset.mes) === mesAtual) {
          btn.classList.add('selected');
        }
      });

      // Carrega dados iniciais
      await verificarStatusMeses(anoAtual);
      await updateReport(anoAtual, mesAtual);

      // Event listeners
      selectAno.addEventListener("change", async () => {
        const anoSelecionado = parseInt(selectAno.value);
        const mesSelecionado = parseInt(document.querySelector(".month-btn.selected")?.dataset.mes || mesAtual);
        await verificarStatusMeses(anoSelecionado);
        await updateReport(anoSelecionado, mesSelecionado);
      });

      monthButtons.forEach(btn => {
        btn.addEventListener("click", async () => {
          monthButtons.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          const mesSelecionado = parseInt(btn.dataset.mes);
          const anoSelecionado = parseInt(selectAno.value);
          await updateReport(anoSelecionado, mesSelecionado);
        });
      });

    } catch (error) {
      console.error("Erro na inicialização do relatório:", error);
    }
  })();

  // Retorna função de limpeza
  return () => {
    if (currentUnsubscribe) {
      currentUnsubscribe();
    }
  };
}

// Adicionar função para limpar a inicialização quando sair da página
function cleanupReport() {
  isReportInitialized = false;
  if (unsubscribe) { // Esta variável não está definida
    unsubscribe();
  }
  saldosPorMes = {};
}

// Adicionar event listener para limpar quando sair da página
window.addEventListener('unload', cleanupReport);

// Adicionar variável global para armazenar o último saldo conhecido de cada mês
let saldosPorMes = {};

// Adicione esta variável global para controlar a última atualização
let ultimaAtualizacao = null;

// Modificar a função calcularSaldoAcumulado
async function calcularSaldoAcumulado(ano, mes) {
  try {
    const user = auth.currentUser;
    if (!user) return 0;

    // Cria data início (primeiro dia do mês) e fim (último dia do mês)
    const startDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59));

    const q = query(
      collection(db, "transacoes"),
      where("userId", "==", user.uid),
      where("data", ">=", Timestamp.fromDate(startDate)),
      where("data", "<=", Timestamp.fromDate(endDate))
    );

    const querySnapshot = await getDocs(q);
    let saldo = 0;

    querySnapshot.forEach(doc => {
      const transacao = doc.data();
      if (transacao.tipo === "receita") {
        saldo += Number(transacao.valor);
      } else if (transacao.tipo === "despesa") {
        saldo -= Number(transacao.valor);
      }
    });

    return saldo;
  } catch (error) {
    console.error("Erro ao calcular saldo:", error);
    return 0;
  }
}

// Modificar a função atualizarTabelaMesclada para ser mais eficiente
async function atualizarTabelaMesclada(ano, mes, transacoes) {
  const tableBody = document.getElementById("relatorioTableBody");
  if (!tableBody) return;

  // Limpa a tabela
  tableBody.innerHTML = '';

  // Zera os totais ao iniciar
  let totalEntrada = 0;
  let totalSaida = 0;
  let totalDespesaDiaria = 0;
  let saldoAcumulado = 0;
  let teveSaldoNegativo = false;
  let temSaldoNegativo = false;

  try {
    // Busca o saldo acumulado até o mês anterior
    if (mes > 1) {
      // Para janeiro do ano atual, não tem saldo anterior
      const startDate = new Date(Date.UTC(ano, 0, 1)); // Começo do ano
      const endDate = new Date(Date.UTC(ano, mes - 1, 0)); // Fim do mês anterior

      const qAnterior = query(
        collection(db, "transacoes"),
        where("userId", "==", auth.currentUser.uid),
        where("data", ">=", Timestamp.fromDate(startDate)),
        where("data", "<=", Timestamp.fromDate(endDate))
      );

      const snapshotAnterior = await getDocs(qAnterior);
      snapshotAnterior.forEach(doc => {
        const transacao = doc.data();
        if (transacao.tipo === "receita") {
          saldoAcumulado += Number(transacao.valor);
        } else if (transacao.tipo === "despesa") {
          saldoAcumulado -= Number(transacao.valor);
        }
      });
    }

    // Se não houver transações no mês atual, mostra apenas o saldo anterior
    if (!transacoes || transacoes.length === 0) {
      const totalDias = new Date(ano, mes, 0).getDate();
      for (let dia = 1; dia <= totalDias; dia++) {
        const data = new Date(ano, mes - 1, dia);
        const tr = document.createElement("tr");
        const isNaoUtil = isDiaNaoUtil(data);
        const saldoClass = saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo';

        tr.innerHTML = `
          <td class="${isNaoUtil ? 'dia-nao-util' : ''}" title="${getDataTooltip(data)}">
            ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}
          </td>
          <td>-</td>
          <td>-</td>
          <td>-</td>
          <td class="${saldoClass}">${formatMoney(saldoAcumulado)}</td>
        `;
        tableBody.appendChild(tr);
      }
      
      // Zera os totais quando não há transações
      document.getElementById("totalEntrada").textContent = formatMoney(0);
      document.getElementById("totalSaida").textContent = formatMoney(0);
      document.getElementById("totalDespesaDiaria").textContent = formatMoney(0);
      return;
    }

    // Funções auxiliares aqui...

    // Organiza as transações por dia e tipo
    const transacoesPorDia = {};
    
    // Ordena as transações por data
    transacoes.sort((a, b) => a.data.toDate() - b.data.toDate());
    
    // Primeiro loop: organiza as transações por dia
    transacoes.forEach(item => {
      const data = item.data.toDate();
      const dia = data.getDate();
      
      if (!transacoesPorDia[dia]) {
        transacoesPorDia[dia] = {
          entrada: { valor: 0, transacoes: [] },
          saidaFixa: { valor: 0, transacoes: [] },
          despesaDiaria: { valor: 0, transacoes: [] }
        };
      }

      const valor = Number(item.valor);
      if (item.tipo === "receita") {
        transacoesPorDia[dia].entrada.valor += valor;
        transacoesPorDia[dia].entrada.transacoes.push(item);
        totalEntrada += valor;
      } else if (item.tipo === "despesa") {
        if (item.tipoDespesa === "fixa") {
          transacoesPorDia[dia].saidaFixa.valor += valor;
          transacoesPorDia[dia].saidaFixa.transacoes.push(item);
          totalSaida += valor;
        } else {
          transacoesPorDia[dia].despesaDiaria.valor += valor;
          transacoesPorDia[dia].despesaDiaria.transacoes.push(item);
          totalDespesaDiaria += valor;
        }
      }
    });

    // Cria as linhas da tabela
    const totalDias = new Date(ano, mes, 0).getDate();

    // Segundo loop: gera a tabela com saldo acumulado correto
    for (let dia = 1; dia <= totalDias; dia++) {
      const data = new Date(ano, mes - 1, dia);
      const dadosDia = transacoesPorDia[dia] || {
        entrada: { valor: 0, transacoes: [] },
        saidaFixa: { valor: 0, transacoes: [] },
        despesaDiaria: { valor: 0, transacoes: [] }
      };

      // Calcula o saldo do dia
      const entradas = dadosDia.entrada.valor;
      const saidas = dadosDia.saidaFixa.valor + dadosDia.despesaDiaria.valor;
      const saldoDia = entradas - saidas;
      
      // Atualiza o saldo acumulado
      saldoAcumulado += saldoDia;

      // Verifica saldo negativo
      if (saldoAcumulado < 0) {
        teveSaldoNegativo = true;
        temSaldoNegativo = true;
      }

      const tr = document.createElement("tr");
      const isNaoUtil = isDiaNaoUtil(data);
      const saldoClass = saldoAcumulado >= 0 ? 'saldo-positivo' : 'saldo-negativo';

      tr.innerHTML = `
        <td class="${isNaoUtil ? 'dia-nao-util' : ''}" title="${getDataTooltip(data)}">
          ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}
        </td>
        <td title="${dadosDia.entrada.transacoes.length ? formatTransacoesTooltip(dadosDia.entrada.transacoes) : ''}">
          ${dadosDia.entrada.valor > 0 ? formatMoney(dadosDia.entrada.valor) : '-'}
        </td>
        <td title="${dadosDia.saidaFixa.transacoes.length ? formatTransacoesTooltip(dadosDia.saidaFixa.transacoes) : ''}">
          ${dadosDia.saidaFixa.valor > 0 ? formatMoney(dadosDia.saidaFixa.valor) : '-'}
        </td>
        <td title="${dadosDia.despesaDiaria.transacoes.length ? formatTransacoesTooltip(dadosDia.despesaDiaria.transacoes) : ''}">
          ${dadosDia.despesaDiaria.valor > 0 ? formatMoney(dadosDia.despesaDiaria.valor) : '-'}
        </td>
        <td class="${saldoClass}">${formatMoney(saldoAcumulado)}</td>
      `;
      tableBody.appendChild(tr);
    }

    // Atualiza status e aparência do botão do mês
    // const chave = `${ano}-${mes}`;
    // statusMeses[chave] = {
    //   saldo: saldoAcumulado,
    //   temTransacoes: transacoes.length > 0,
    //   teveSaldoNegativo: teveSaldoNegativo
    // };

    // Atualiza a cor do botão do mês
    // const mesButton = document.querySelector(`.month-btn[data-mes="${mes}"]`);
    // if (mesButton && transacoes.length > 0) {
    //   mesButton.classList.remove('mes-negativo', 'mes-positivo');
    //   mesButton.classList.add(teveSaldoNegativo ? 'mes-negativo' : 'mes-positivo');
    // }

    // Atualiza os totais no rodapé
    document.getElementById("totalEntrada").textContent = formatMoney(totalEntrada);
    document.getElementById("totalSaida").textContent = formatMoney(totalSaida);
    document.getElementById("totalDespesaDiaria").textContent = formatMoney(totalDespesaDiaria);
  } catch (error) {
    console.error("Erro ao atualizar tabela:", error);
  }
}

// Adicione esta nova função para obter o saldo inicial
async function obterSaldoInicial(ano, mes) {
  // Se for janeiro, não tem saldo anterior
  if (mes === 1) return 0;

  const mesAnterior = mes - 1;
  const anoAnterior = ano;
  const chaveAnterior = `${anoAnterior}-${mesAnterior}`;

  // Verifica se já temos o saldo em cache
  if (saldosPorMes[chaveAnterior] !== undefined) {
    return saldosPorMes[chaveAnterior].saldo || 0;
  }

  // Se não está em cache, calcula o saldo do mês anterior
  const saldo = await calcularSaldoAcumulado(anoAnterior, mesAnterior);
  
  // Armazena em cache
  saldosPorMes[chaveAnterior] = {
    saldo: saldo,
    calculado: true
  };

  return saldo;
}

// Quando não houver transações, usamos a função original para placeholders
function atualizarTabelaRelatorio(ano, mes) {
  atualizarTabelaMesclada(ano, mes, []);
}

// Modifique também a função subscribeToTransacoes
export function subscribeToTransacoes(ano, mes, callback) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const startDate = new Date(Date.UTC(ano, mes - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));

  const q = query(
    collection(db, "transacoes"),
    where("userId", "==", user.uid),
    where("data", ">=", Timestamp.fromDate(startDate)),
    where("data", "<=", Timestamp.fromDate(endDate))
  );

  // Busca inicial para garantir dados imediatos
  getDocs(q).then((querySnapshot) => {
    const transacoes = [];
    querySnapshot.forEach((doc) => {
      transacoes.push({ id: doc.id, ...doc.data() });
    });
    if (callback) callback(transacoes);
  });

  // Retorna a inscrição para atualizações em tempo real
  return onSnapshot(q, (querySnapshot) => {
    const transacoes = [];
    querySnapshot.forEach((doc) => {
      transacoes.push({ id: doc.id, ...doc.data() });
    });
    if (callback) callback(transacoes);
  });
}

// Adicione esta nova função para deletar transações automáticas futuras
async function deletarTransacoesAutomaticasFuturas(userId, dataAtual) {
  try {
    const q = query(
      collection(db, "transacoes"),
      where("userId", "==", userId),
      where("data", ">=", Timestamp.fromDate(dataAtual)),
      where("isAutomatic", "==", true)
    );

    const querySnapshot = await getDocs(q);
    const promises = [];

    querySnapshot.forEach((doc) => {
      promises.push(deleteDoc(doc.ref));
    });

    await Promise.all(promises);
  } catch (error) {
    console.error("Erro ao deletar transações futuras:", error);
    throw error;
  }
}

// Modifique a função criarTransacoesSalariais
export async function criarTransacoesSalariais(config) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Pega a data atual
    const dataAtual = new Date();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();
    
    console.log("Deletando transações futuras a partir de:", new Date(anoAtual, mesAtual, 1));

    // Deleta transações automáticas futuras
    const qDelete = query(
      collection(db, "transacoes"),
      where("userId", "==", user.uid),
      where("data", ">=", Timestamp.fromDate(new Date(anoAtual, mesAtual, 1))),
      where("isAutomatic", "==", true)
    );

    const transacoesParaDeletar = await getDocs(qDelete);
    const batch = writeBatch(db);
    let countDeleted = 0;

    transacoesParaDeletar.forEach((doc) => {
      const transacao = doc.data();
      // Deleta se for salário, adiantamento ou investimento
      if (transacao.descricao.includes('Salário') || 
          transacao.descricao.includes('Investimento') ||
          transacao.descricao.includes('Adiantamento')) {
        batch.delete(doc.ref);
        countDeleted++;
      }
    });

    if (countDeleted > 0) {
      await batch.commit();
      console.log(`${countDeleted} transações antigas deletadas`);
    }

    // Resto da função permanece igual, criando novas transações...
    const promises = [];
    const dataInicio = new Date(anoAtual, mesAtual, 1);
    const dataFim = new Date(2100, 11, 31);
    const mesesTotais = (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + 
                       dataFim.getMonth() - dataInicio.getMonth() + 1;

    const {
      salarioBase,
      temAdiantamento,
      porcentagemAdiantamento,
      diaAdiantamento,
      diaPagamentoFinal,
      temInvestimento,
      porcentagemInvestimento,
      valorFixoInvestimento
    } = config;

    // Função auxiliar para ajustar data para dia útil (mantém a mesma)
    function ajustarParaDiaUtil(diaOriginal, mes, ano) {
      // Primeiro ajusta o dia para o mês (caso seja 31 em mês de 30 dias, por exemplo)
      const diaAjustado = ajustarDiaParaMes(diaOriginal, mes, ano);
      
      // Cria a data com o dia ajustado
      let data = new Date(ano, mes - 1, diaAjustado);
      
      // Se não for dia útil, encontra o dia útil anterior
      if (!isDiaUtil(data)) {
        data = encontrarDiaUtilAnterior(data);
      }
      
      return {
        data: data,
        diaEfetivo: data.getDate(), // Dia que será efetivamente usado
        diaOriginal: diaOriginal    // Dia que foi configurado originalmente
      };
    }

    // Gera transações até 2100
    for (let i = 0; i < mesesTotais; i++) {
      const ano = dataInicio.getFullYear() + Math.floor((dataInicio.getMonth() + i) / 12);
      const mes = (dataInicio.getMonth() + i) % 12 + 1;

      // Ajusta as datas para dias úteis
      let dataAdiantamento = null;
      let dataPagamento = null;

      if (temAdiantamento) {
        dataAdiantamento = ajustarParaDiaUtil(diaAdiantamento, mes, ano);
      }
      dataPagamento = ajustarParaDiaUtil(diaPagamentoFinal, mes, ano);

      // Calcula valores
      const valorInvestimentoTotal = temInvestimento ? 
        (valorFixoInvestimento || (salarioBase * porcentagemInvestimento / 100)) : 0;

      // Se tem adiantamento
      if (temAdiantamento) {
        // Calcula valor do adiantamento (sem desconto do investimento)
        const valorAdiantamento = (salarioBase * porcentagemAdiantamento) / 100;
        const valorPagamentoFinal = salarioBase - valorAdiantamento;

        // Calcula a proporção do investimento para cada parte do salário
        const investimentoAdiantamento = temInvestimento ? 
          (valorInvestimentoTotal * (valorAdiantamento / salarioBase)) : 0;
        const investimentoPagamentoFinal = temInvestimento ? 
          (valorInvestimentoTotal * (valorPagamentoFinal / salarioBase)) : 0;

        // Registra investimento do adiantamento se houver
        if (temInvestimento && investimentoAdiantamento > 0) {
          promises.push(addDoc(collection(db, "transacoes"), {
            userId: user.uid,
            tipo: "despesa",
            valor: investimentoAdiantamento,
            data: Timestamp.fromDate(dataAdiantamento.data),
            descricao: `Investimento (Adiantamento) - ${mes}/${ano}`,
            tipoDespesa: "fixa",
            createdAt: new Date(),
            isAutomatic: true,
            diaOriginal: diaAdiantamento,
            diaEfetivo: dataAdiantamento.diaEfetivo
          }));
        }

        // Registra adiantamento líquido
        promises.push(addDoc(collection(db, "transacoes"), {
          userId: user.uid,
          tipo: "receita",
          valor: valorAdiantamento,
          data: Timestamp.fromDate(dataAdiantamento.data),
          descricao: `Adiantamento Salarial - ${mes}/${ano}`,
          createdAt: new Date(),
          isAutomatic: true,
          diaOriginal: diaAdiantamento,
          diaEfetivo: dataAdiantamento.diaEfetivo
        }));

        // Registra investimento do pagamento final se houver
        if (temInvestimento && investimentoPagamentoFinal > 0) {
          promises.push(addDoc(collection(db, "transacoes"), {
            userId: user.uid,
            tipo: "despesa",
            valor: investimentoPagamentoFinal,
            data: Timestamp.fromDate(dataPagamento.data),
            descricao: `Investimento (Salário) - ${mes}/${ano}`,
            tipoDespesa: "fixa",
            createdAt: new Date(),
            isAutomatic: true,
            diaOriginal: diaPagamentoFinal,
            diaEfetivo: dataPagamento.diaEfetivo
          }));
        }

        // Registra pagamento final líquido
        promises.push(addDoc(collection(db, "transacoes"), {
          userId: user.uid,
          tipo: "receita",
          valor: valorPagamentoFinal,
          data: Timestamp.fromDate(dataPagamento.data),
          descricao: `Salário - ${mes}/${ano}`,
          createdAt: new Date(),
          isAutomatic: true,
          diaOriginal: diaPagamentoFinal,
          diaEfetivo: dataPagamento.diaEfetivo
        }));
      } else {
        // Se não tem adiantamento, registra apenas o pagamento integral
        
        // Registra investimento se houver
        if (temInvestimento && valorInvestimentoTotal > 0) {
          promises.push(addDoc(collection(db, "transacoes"), {
            userId: user.uid,
            tipo: "despesa",
            valor: valorInvestimentoTotal,
            data: Timestamp.fromDate(dataPagamento.data),
            descricao: `Investimento - ${mes}/${ano}`,
            tipoDespesa: "fixa",
            createdAt: new Date(),
            isAutomatic: true,
            diaOriginal: diaPagamentoFinal,
            diaEfetivo: dataPagamento.diaEfetivo
          }));
        }

        // Registra salário integral
        promises.push(addDoc(collection(db, "transacoes"), {
          userId: user.uid,
          tipo: "receita",
          valor: salarioBase,
          data: Timestamp.fromDate(dataPagamento.data),
          descricao: `Salário - ${mes}/${ano}`,
          createdAt: new Date(),
          isAutomatic: true,
          diaOriginal: diaPagamentoFinal,
          diaEfetivo: dataPagamento.diaEfetivo
        }));
      }
    }

    await Promise.all(promises);
    alert("Transações salariais atualizadas com sucesso até 2100!");
  } catch (error) {
    console.error("Erro ao criar transações salariais:", error);
    alert("Erro ao criar transações salariais: " + error.message);
  }
}

// Remova as outras declarações e mantenha apenas esta versão da função
export async function verificarStatusMeses(ano) {
  const user = auth.currentUser;
  if (!user) return;

  const monthPromises = [];

  // Itera de 1 a 12 para processar todos os meses em paralelo
  for (let mes = 1; mes <= 12; mes++) {
    monthPromises.push((async () => {
      let teveSaldoNegativo = false;
      let saldoAcumulado = 0;
      
      // Busca saldo acumulado até o mês anterior
      if (mes > 1) {
        const startDate = new Date(Date.UTC(ano, 0, 1));
        const endDate = new Date(Date.UTC(ano, mes - 1, 0));
        
        const qAnterior = query(
          collection(db, "transacoes"),
          where("userId", "==", user.uid),
          where("data", ">=", Timestamp.fromDate(startDate)),
          where("data", "<=", Timestamp.fromDate(endDate))
        );
        
        const snapshotAnterior = await getDocs(qAnterior);
        snapshotAnterior.forEach(doc => {
          const t = doc.data();
          saldoAcumulado += t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor);
        });
      }

      // Define datas de início e fim para o mês atual
      const startDate = new Date(Date.UTC(ano, mes - 1, 1));
      const endDate = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
      
      const q = query(
        collection(db, "transacoes"),
        where("userId", "==", user.uid),
        where("data", ">=", Timestamp.fromDate(startDate)),
        where("data", "<=", Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      const transacoes = [];
      querySnapshot.forEach(doc => {
        const t = doc.data();
        t.data = t.data.toDate();
        transacoes.push(t);
      });
      
      // Ordena e organiza as transações por dia
      transacoes.sort((a, b) => a.data - b.data);
      const totalDias = new Date(ano, mes, 0).getDate();
      const transacoesPorDia = {};
      
      transacoes.forEach(t => {
        const dia = t.data.getDate();
        if (!transacoesPorDia[dia]) transacoesPorDia[dia] = [];
        transacoesPorDia[dia].push(t);
      });
      
      // Calcula o saldo acumulado diariamente
      let saldoDiario = saldoAcumulado;  // Começa com o saldo dos meses anteriores

      for (let dia = 1; dia <= totalDias; dia++) {
        if (transacoesPorDia[dia]) {
          transacoesPorDia[dia].forEach(t => {
            saldoDiario += t.tipo === 'receita' ? Number(t.valor) : -Number(t.valor);
          });
        }

        // Se em QUALQUER dia o saldo ficar negativo, marca o mês como negativo
        if (saldoDiario < 0) {
          teveSaldoNegativo = true;
          break; // Pode parar de verificar, pois já sabemos que o mês terá status negativo
        }
      }
      
      // Atualiza a classe do botão do mês
      const mesButton = document.querySelector(`.month-btn[data-mes="${mes}"]`);
      if (mesButton) {
        mesButton.classList.remove('mes-negativo', 'mes-positivo');
        // Se teve qualquer saldo negativo durante o mês, fica vermelho
        mesButton.classList.add(teveSaldoNegativo ? 'mes-negativo' : 'mes-positivo');
      }
    })());
  }
  
  // Aguarda que todas as verificações sejam concluídas
  await Promise.all(monthPromises);
}

// Modifique a função atualizarRodape para verificar autenticação
export async function atualizarRodape(transacoes = null) {
  try {
    // Aguarda autenticação
    const user = await new Promise((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(user => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      console.log("Usuário não autenticado");
      return;
    }

    const footerElements = {
      entradas: document.getElementById("footerTotalEntradas"),
      saidas: document.getElementById("footerTotalSaida"),
      performance: document.getElementById("footerPerformance"),
      investido: document.getElementById("footerInvestido"),
      previsaoDiaria: document.getElementById("footerPrevisaoDiaria")
    };

    if (!Object.values(footerElements).every(el => el)) {
      console.error("Elementos do rodapé não encontrados");
      return;
    }

    // Se não recebeu transações, busca do mês atual
    if (!transacoes) {
      const dataAtual = new Date();
      const anoAtual = dataAtual.getFullYear();
      const mesAtual = dataAtual.getMonth() + 1;

      const startDate = new Date(Date.UTC(anoAtual, mesAtual - 1, 1, 0, 0, 0));
      const endDate = new Date(Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999));

      const q = query(
        collection(db, "transacoes"),
        where("userId", "==", auth.currentUser.uid),
        where("data", ">=", Timestamp.fromDate(startDate)),
        where("data", "<=", Timestamp.fromDate(endDate))
      );

      const querySnapshot = await getDocs(q);
      transacoes = [];
      querySnapshot.forEach(doc => {
        const data = doc.data().data.toDate();
        if (data.getMonth() + 1 === mesAtual) {
          transacoes.push({ id: doc.id, ...doc.data() });
        }
      });
    }

    // Inicializa os totais
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalInvestido = 0;

    // Calcula os totais
    transacoes.forEach(transacao => {
      const valor = Number(transacao.valor) || 0;
      if (transacao.tipo === "receita") {
        totalEntradas += valor;
      } else if (transacao.tipo === "despesa") {
        totalSaidas += valor;
        if (transacao.descricao.toLowerCase().includes('investimento')) {
          totalInvestido += valor;
        }
      }
    });

    // Calcula performance e previsão diária
    const performance = totalEntradas - totalSaidas;
    const hoje = new Date();
    const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const diasRestantes = ultimoDiaMes.getDate() - hoje.getDate() + 1;

    const saldoDisponivel = performance;
    const previsaoDiaria = (diasRestantes > 0 && saldoDisponivel > 0) 
      ? saldoDisponivel / diasRestantes 
      : 0;

    // Função auxiliar para formatar moeda
    const formatMoney = (value) => `R$ ${Number(value).toFixed(2)}`;

    // Atualiza os valores no rodapé
    footerElements.entradas.textContent = formatMoney(totalEntradas);
    footerElements.saidas.textContent = formatMoney(totalSaidas);
    footerElements.performance.textContent = formatMoney(performance);
    footerElements.investido.textContent = formatMoney(totalInvestido);
    footerElements.previsaoDiaria.textContent = formatMoney(previsaoDiaria);

    // Atualiza as classes
    footerElements.performance.className = `footer-value ${performance >= 0 ? 'positive' : 'negative'}`;
    footerElements.previsaoDiaria.className = 'footer-value positive';

  } catch (error) {
    console.error("Erro ao atualizar rodapé:", error);
  }
}

// Adicione esta nova função auxiliar
function atualizarBotaoMes(mes, status) {
  const mesButton = document.querySelector(`.month-btn[data-mes="${mes}"]`);
  if (mesButton) {
    // Remove classes antigas
    mesButton.classList.remove('mes-negativo', 'mes-positivo');
    
    // Adiciona nova classe baseada no status
    if (status.temTransacoes) {
      const novaClasse = status.saldo >= 0 ? 'mes-positivo' : 'mes-negativo';
      mesButton.classList.add(novaClasse);
    }
  }
}
