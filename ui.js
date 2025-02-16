// ui.js
import { formatarMoeda, isBusinessDay, getHolidayName, getDayOfWeekName } from "./utils.js";
import { transacoes, configSalarial, inicioMes, inicioAno, adicionarReceita, adicionarDespesa, getSalaryValue, calcularValorDiarioDisponivel, salvarConfigSalarial, calcularSaldoAcumuladoAntes } from "./finance.js";

export function initApp() {
  setDataAtual();
  populateAnoSelect();
  updateInicioForm();
  carregarConfigSalarial();

  // Define os cards com a data atual
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth() + 1;
  document.querySelector(`.mes-card[data-mes="${mesAtual}"]`).classList.add('active');
  document.getElementById("ano-select").value = dataAtual.getFullYear();

  gerarLinhasTabela(mesAtual);
}

export function setupEventListeners() {
  // Evento do formulário de receita
  document.getElementById("form-receita").addEventListener("submit", (e) => {
    e.preventDefault();
    const valor = e.target.querySelector("#valor-receita").value;
    const data = e.target.querySelector("#data-receita").value;
    const descricao = e.target.querySelector("#desc-receita").value;
    adicionarReceita(valor, data, descricao);
    e.target.reset();
    setDataAtual();
    alert("Receita adicionada com sucesso!");
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });

  // Evento do formulário de despesa
  document.getElementById("form-despesa").addEventListener("submit", (e) => {
    e.preventDefault();
    const isFixa = document.getElementById("despesa-fixa").checked;
    const isDiaria = document.getElementById("despesa-diaria").checked;
    const valor = e.target.querySelector("#valor-despesa").value;
    const data = e.target.querySelector("#data-despesa").value;
    const descricao = e.target.querySelector("#desc-despesa").value;
    const numParcelas = isFixa ? parseInt(document.getElementById("num-parcelas").value) : 1;

    adicionarDespesa(valor, data, descricao, isFixa, isDiaria, numParcelas);
    e.target.reset();
    document.getElementById("despesa-diaria").checked = true;
    document.getElementById("parcelas-container").style.display = "none";
    setDataAtual();
    alert("Despesa adicionada com sucesso!");
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });

  // Adicionar evento para mostrar/esconder campo de parcelas
  document.getElementById("despesa-fixa").addEventListener("change", (e) => {
    const parcelasContainer = document.getElementById("parcelas-container");
    parcelasContainer.style.display = e.target.checked ? "block" : "none";
  });

  document.getElementById("despesa-diaria").addEventListener("change", (e) => {
    const parcelasContainer = document.getElementById("parcelas-container");
    parcelasContainer.style.display = "none";
    document.getElementById("num-parcelas").value = "1";
  });

  // Navegação entre páginas
  document.getElementById("btn-main").addEventListener("click", () => {
    document.getElementById("main-page").classList.remove("hidden");
    document.getElementById("relatorio-page").classList.add("hidden");
    document.getElementById("historico-page").classList.add("hidden");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById("btn-main").classList.add("active");
  });

  document.getElementById("btn-relatorio").addEventListener("click", () => {
    document.getElementById("main-page").classList.add("hidden");
    document.getElementById("relatorio-page").classList.remove("hidden");
    document.getElementById("historico-page").classList.add("hidden");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById("btn-relatorio").classList.add("active");
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });

  // Adicionar evento para o botão de histórico
  document.getElementById("btn-salvar-historico").addEventListener("click", () => {
    document.getElementById("main-page").classList.add("hidden");
    document.getElementById("relatorio-page").classList.add("hidden");
    document.getElementById("historico-page").classList.remove("hidden");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById("btn-salvar-historico").classList.add("active");
    atualizarHistorico();
  });

  // Botão de configuração salarial
  document.getElementById("config-button").addEventListener("click", () => {
    document.getElementById("config-panel").classList.toggle("active");
    document.getElementById("backdrop").classList.toggle("active");
  });

  // Fechar painel ao clicar no backdrop
  document.getElementById("backdrop").addEventListener("click", () => {
    document.getElementById("config-panel").classList.remove("active");
    document.getElementById("inicio-calc-panel").classList.remove("active");
    document.getElementById("backdrop").classList.remove("active");
  });

  // Toggle do adiantamento
  document.getElementById("tem-adiantamento").addEventListener("change", (e) => {
    document.getElementById("config-adiantamento").classList.toggle("hidden", !e.target.checked);
    document.querySelector(".dia-salario-único").classList.toggle("hidden", e.target.checked);
  });

  // Toggle do investimento
  document.getElementById("quer-investir").addEventListener("change", (e) => {
    document.getElementById("config-investimento").classList.toggle("hidden", !e.target.checked);
  });

  // Configuração de início
  document.getElementById("inicio-calc-btn").addEventListener("click", () => {
    document.getElementById("inicio-calc-panel").classList.add("active");
    document.getElementById("backdrop").classList.add("active");
  });

  // Salvar configuração salarial
  document.getElementById("form-salario").addEventListener("submit", (e) => {
    e.preventDefault();
    const novaConfig = {
      salarioBase: parseFloat(document.getElementById("valor-salario").value) || 0,
      temAdiantamento: document.getElementById("tem-adiantamento").checked,
      porcentagemAdiantamento: parseFloat(document.getElementById("porcentagem-adiantamento").value) || 40,
      diaAdiantamento: parseInt(document.getElementById("dia-adiantamento").value) || 15,
      diaPagamento: parseInt(document.getElementById("dia-pagamento").value) || 30,
      diaSalario: parseInt(document.getElementById("dia-salario").value) || 5,
      querInvestir: document.getElementById("quer-investir").checked,
      investPorcentagem: parseFloat(document.getElementById("invest-porcentagem").value) || 0,
      investManual: parseFloat(document.getElementById("invest-manual").value) || 0
    };
    
    salvarConfigSalarial(novaConfig);
    document.getElementById("config-panel").classList.remove("active");
    document.getElementById("backdrop").classList.remove("active");
    alert("Configuração salarial salva com sucesso!");
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });

  // Substituir evento do select de mês por evento dos cards
  document.querySelector('.meses-grid').addEventListener('click', (e) => {
    const mesCard = e.target.closest('.mes-card');
    if (!mesCard) return;

    // Remove active de todos os cards
    document.querySelectorAll('.mes-card').forEach(card => {
        card.classList.remove('active');
    });

    // Adiciona active ao card clicado
    mesCard.classList.add('active');

    // Gera relatório para o mês selecionado
    const mesSelecionado = parseInt(mesCard.dataset.mes);
    gerarLinhasTabela(mesSelecionado);
  });

  // Atualizar relatório quando mudar ano
  document.getElementById("ano-select").addEventListener("change", () => {
    const mesAtivo = document.querySelector('.mes-card.active');
    if (mesAtivo) {
        gerarLinhasTabela(parseInt(mesAtivo.dataset.mes));
    }
  });

  // Outros eventos (ex.: navegação, painel de configurações, despesas múltiplas) podem ser configurados aqui
  // Use event delegation para os itens da lista de múltiplas despesas, por exemplo.

  // Eventos para atualização em tempo real do salário previsto
  const camposAtualizacao = [
    "valor-salario",
    "porcentagem-adiantamento",
    "dia-adiantamento",
    "dia-pagamento",
    "dia-salario",
    "invest-porcentagem",
    "invest-manual"
  ];

  camposAtualizacao.forEach(id => {
    const elemento = document.getElementById(id);
    elemento.addEventListener("input", () => {
      atualizarPrevisaoInvestimento();
    });
  });

  // Checkboxes
  ["tem-adiantamento", "quer-investir"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
      atualizarPrevisaoInvestimento();
    });
  });

  // Adicionar listener do formulário de início de cálculos
  document.getElementById("form-inicio").addEventListener("submit", (e) => {
    e.preventDefault();
    // Atualiza as variáveis de início a partir dos campos do formulário
    const novoInicioMes = parseInt(document.getElementById("inicio-mes").value);
    const novoInicioAno = parseInt(document.getElementById("inicio-ano").value);
    // Atualiza as variáveis exportadas (lembre-se de que elas são 'let' em finance.js)
    inicioMes = novoInicioMes;
    inicioAno = novoInicioAno;
    alert("Configuração de início atualizada!");
    // Fecha o painel de início e o backdrop
    document.getElementById("inicio-calc-panel").classList.remove("active");
    document.getElementById("backdrop").classList.remove("active");
    // Recarrega o relatório com a nova configuração
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });

  // Adicionar evento para o botão de adicionar múltiplas despesas
  document.querySelector(".btn-add-expense").addEventListener("click", () => {
    const expensesList = document.getElementById("expenses-list");
    const expenseItem = document.createElement("div");
    expenseItem.className = "expense-item";
    
    // Obter data atual no formato YYYY-MM-DD
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataAtual = `${ano}-${mes}-${dia}`;
    
    expenseItem.innerHTML = `
      <button type="button" class="remove-expense">×</button>
      <input type="number" class="expense-value" step="0.01" placeholder="Valor" required>
      <input type="date" class="expense-date" value="${dataAtual}" required>
      <div class="desc-container">
        <input type="text" class="expense-desc" placeholder="Descrição">
        <input type="number" class="expense-parcelas" min="1" max="48" value="1" placeholder="Nº Parcelas" style="display: none;">
      </div>
      <div class="checkbox-group">
        <label>
          <input type="radio" name="tipo-despesa-${expensesList.children.length}" value="fixa" class="expense-type">
          Fixa
        </label>
        <label>
          <input type="radio" name="tipo-despesa-${expensesList.children.length}" value="diaria" class="expense-type" checked>
          Diária
        </label>
      </div>
    `;

    // Adicionar evento para remover a despesa
    expenseItem.querySelector(".remove-expense").addEventListener("click", (e) => {
      e.target.closest(".expense-item").remove();
    });

    // Adicionar evento para mostrar/esconder campo de parcelas
    expenseItem.querySelector('.expense-type[value="fixa"]').addEventListener('change', (e) => {
      const descContainer = e.target.closest('.expense-item').querySelector('.desc-container');
      descContainer.classList.add('show-parcelas');
      descContainer.querySelector('.expense-parcelas').style.display = 'block';
    });

    expenseItem.querySelector('.expense-type[value="diaria"]').addEventListener('change', (e) => {
      const descContainer = e.target.closest('.expense-item').querySelector('.desc-container');
      descContainer.classList.remove('show-parcelas');
      descContainer.querySelector('.expense-parcelas').style.display = 'none';
    });

    expensesList.appendChild(expenseItem);
  });

  // Adicionar evento para salvar múltiplas despesas
  document.getElementById("btn-save-multiple").addEventListener("click", () => {
    const expenseItems = document.querySelectorAll(".expense-item");
    let hasError = false;

    expenseItems.forEach(item => {
      const valor = item.querySelector(".expense-value").value;
      const data = item.querySelector(".expense-date").value;
      const descricao = item.querySelector(".expense-desc").value;
      const isFixa = item.querySelector(".expense-type[value='fixa']").checked;
      const isDiaria = item.querySelector(".expense-type[value='diaria']").checked;

      if (!valor || !data) {
        hasError = true;
        return;
      }

      adicionarDespesa(valor, data, descricao, isFixa, isDiaria);
    });

    if (hasError) {
      alert("Por favor, preencha todos os campos obrigatórios (valor e data)");
      return;
    }

    // Limpar a lista após salvar
    document.getElementById("expenses-list").innerHTML = "";
    alert("Despesas adicionadas com sucesso!");
    gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
  });
}

function setDataAtual() {
  // Obter data atual no fuso horário local
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  const dataFormatada = `${ano}-${mes}-${dia}`;

  document.getElementById("data-receita").value = dataFormatada;
  document.getElementById("data-despesa").value = dataFormatada;
}

function populateAnoSelect() {
  const select = document.getElementById("ano-select");
  select.innerHTML = "";
  const anoInicial = 2020;
  const maxYear = 2100;
  
  for (let i = anoInicial; i <= maxYear; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = i;
    if (i === new Date().getFullYear()) option.selected = true;
    select.appendChild(option);
  }
}

function updateInicioForm() {
  document.getElementById("inicio-mes").value = inicioMes;
  document.getElementById("inicio-ano").value = inicioAno;
}

function carregarConfigSalarial() {
  document.getElementById("valor-salario").value = configSalarial.salarioBase || "";
  document.getElementById("tem-adiantamento").checked = configSalarial.temAdiantamento;
  document.getElementById("porcentagem-adiantamento").value = configSalarial.porcentagemAdiantamento;
  document.getElementById("dia-adiantamento").value = configSalarial.diaAdiantamento;
  document.getElementById("dia-pagamento").value = configSalarial.diaPagamento;
  document.getElementById("dia-salario").value = configSalarial.diaSalario;
  const configAdiantamento = document.getElementById("config-adiantamento");
  configAdiantamento.classList.toggle("hidden", !configSalarial.temAdiantamento);
}

// Exemplo de função otimizada para gerar as linhas da tabela utilizando DocumentFragment
export function gerarLinhasTabela(mes) {
  const tbody = document.getElementById("tabela-body");
  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const ano = parseInt(document.getElementById("ano-select").value);
  const diasNoMes = new Date(ano, mes, 0).getDate();
  
  let saldoAcumulado = calcularSaldoAcumuladoAntes(mes, ano);
  
  const totalEntradas = transacoes.receitas.reduce((acc, r) => acc + r.valor, 0) + configSalarial.salarioBase;
  const totalSaidasFixas = transacoes.despesas.filter(d => d.fixa).reduce((acc, d) => acc + d.valor, 0);
  const totalSaidasDiarias = transacoes.despesas.filter(d => d.diaria).reduce((acc, d) => acc + d.valor, 0);
  
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataAtual = new Date(ano, mes - 1, dia);
    
    const receitasDoDiaList = transacoes.receitas.filter(r => 
      r.data.getDate() === dia && 
      r.data.getMonth() === mes - 1 && 
      r.data.getFullYear() === ano
    );
    const receitasDoDia = receitasDoDiaList.reduce((acc, r) => acc + r.valor, 0);
    
    const salarioDoDia = getSalaryValue(dia, mes, ano);
    const entrada = receitasDoDia + salarioDoDia;
    
    const despesasDoDiaList = transacoes.despesas.filter(d => 
      d.data.getDate() === dia && 
      d.data.getMonth() === mes - 1 && 
      d.data.getFullYear() === ano
    );
    const saidasDoDia = despesasDoDiaList.reduce((acc, d) => acc + d.valor, 0);
    
    saldoAcumulado += entrada - saidasDoDia;
    
    const tr = document.createElement("tr");
    const diaSemana = getDayOfWeekName(dataAtual);
    const feriado = getHolidayName(dataAtual);
    
    if (!isBusinessDay(dataAtual) || feriado) {
      tr.classList.add("non-business");
    }
    
    // Data com tooltip do dia da semana e feriado
    const tdData = document.createElement("td");
    tdData.textContent = dataAtual.toLocaleDateString("pt-BR");
    let tooltipData = `${diaSemana}`;
    if (feriado) {
      tooltipData += `\nFeriado: ${feriado}`;
    }
    tdData.title = tooltipData;
    tr.appendChild(tdData);
    
    // Célula de Entrada com tooltip detalhado
    const tdEntrada = document.createElement("td");
    tdEntrada.textContent = entrada > 0 ? formatarMoeda(entrada) : "-";
    let tooltipEntrada = "";
    receitasDoDiaList.forEach(r => {
      tooltipEntrada += `${formatarMoeda(r.valor)} - ${r.descricao.trim() || 'sem descrição'}\n`;
    });
    if (salarioDoDia > 0) {
      tooltipEntrada += `${formatarMoeda(salarioDoDia)} - salário\n`;
    }
    if (tooltipEntrada !== "") {
      tdEntrada.title = tooltipEntrada.trim();
    }
    tr.appendChild(tdEntrada);
    
    // Célula de Saída com tooltip detalhado
    const tdSaida = document.createElement("td");
    tdSaida.textContent = saidasDoDia > 0 ? formatarMoeda(saidasDoDia) : "-";
    let tooltipSaida = "";
    despesasDoDiaList.forEach(d => {
      tooltipSaida += `${formatarMoeda(d.valor)} - ${d.descricao.trim() || 'sem descrição'}\n`;
    });
    if (tooltipSaida !== "") {
      tdSaida.title = tooltipSaida.trim();
    }
    tr.appendChild(tdSaida);
    
    // Coluna fixa (sem tooltip)
    const tdDash = document.createElement("td");
    tdDash.textContent = "-";
    tr.appendChild(tdDash);
    
    // Coluna de Saldo
    const tdSaldo = document.createElement("td");
    tdSaldo.textContent = formatarMoeda(saldoAcumulado);
    tr.appendChild(tdSaldo);
    
    fragment.appendChild(tr);
  }
  tbody.appendChild(fragment);
  
  // Atualiza os cards do rodapé
  document.getElementById("footer-entradas").textContent = formatarMoeda(totalEntradas);
  document.getElementById("footer-saidas").textContent = formatarMoeda(totalSaidasFixas + totalSaidasDiarias);
  document.getElementById("footer-performance").textContent = formatarMoeda(saldoAcumulado);
  
  const valorDiarioRodape = totalSaidasDiarias > 0 ? 
    calcularValorDiarioDisponivel(totalEntradas, totalSaidasFixas, totalSaidasDiarias, diasNoMes) : 
    0;
  const tdDiario = document.getElementById("footer-diario");
  tdDiario.textContent = formatarMoeda(valorDiarioRodape);
  tdDiario.title = `Entrada Total: ${formatarMoeda(totalEntradas)} - sem descrição
Saídas Fixas: ${formatarMoeda(totalSaidasFixas)} - sem descrição
Saídas Diárias: ${formatarMoeda(totalSaidasDiarias)} - sem descrição`;
}

function atualizarPrevisaoInvestimento() {
  const salarioBase = parseFloat(document.getElementById("valor-salario").value) || 0;
  const previsaoElement = document.getElementById("invest-predicted");
  
  if (salarioBase === 0) {
    previsaoElement.innerHTML = '<span class="valor">R$ 0,00</span>';
    return;
  }

  // Cálculo do investimento
  let valorInvestimento = 0;
  if (document.getElementById("quer-investir").checked) {
    const investPorcentagem = parseFloat(document.getElementById("invest-porcentagem").value) || 0;
    const investManual = parseFloat(document.getElementById("invest-manual").value) || 0;
    
    if (investPorcentagem > 0) {
      valorInvestimento = salarioBase * (investPorcentagem / 100);
    } else if (investManual > 0) {
      valorInvestimento = investManual;
    }
  }

  const salarioLiquido = salarioBase - valorInvestimento;

  // Atualização da previsão com base no tipo de pagamento
  if (document.getElementById("tem-adiantamento").checked) {
    const porcentagem = parseFloat(document.getElementById("porcentagem-adiantamento").value) || 40;
    const diaAdiantamento = document.getElementById("dia-adiantamento").value || 15;
    const diaPagamento = document.getElementById("dia-pagamento").value || 30;
    
    const valorAdiantamento = salarioLiquido * (porcentagem / 100);
    const valorPagamento = salarioLiquido - valorAdiantamento;

    previsaoElement.innerHTML = `
      <div>Adiantamento: <span class="valor">${formatarMoeda(valorAdiantamento)}</span> 
      <span class="data">(dia ${diaAdiantamento})</span></div>
      <div>Pagamento: <span class="valor">${formatarMoeda(valorPagamento)}</span> 
      <span class="data">(dia ${diaPagamento})</span></div>
      ${valorInvestimento > 0 ? `<div>Investimento: <span class="valor">${formatarMoeda(valorInvestimento)}</span></div>` : ''}
    `;
  } else {
    const diaSalario = document.getElementById("dia-salario").value || 5;
    previsaoElement.innerHTML = `
      <div>Pagamento único: <span class="valor">${formatarMoeda(salarioLiquido)}</span> 
      <span class="data">(dia ${diaSalario})</span></div>
      ${valorInvestimento > 0 ? `<div>Investimento: <span class="valor">${formatarMoeda(valorInvestimento)}</span></div>` : ''}
    `;
  }

  // Atualiza o valor do investimento no rodapé
  document.getElementById("footer-investimento").textContent = formatarMoeda(valorInvestimento);
}

function atualizarHistorico() {
  const tbody = document.getElementById("historico-body");
  tbody.innerHTML = "";
  const fragment = document.createDocumentFragment();

  // Combinar receitas e despesas em uma única lista
  const todasTransacoes = [
    ...transacoes.receitas.map(r => ({...r, tipo: 'Receita', categoria: r.tipo === 'salario' ? 'Salário' : 'Outras Receitas'})),
    ...transacoes.despesas.map(d => ({...d, tipo: 'Despesa', categoria: d.fixa ? 'Despesa Fixa' : 'Despesa Diária'}))
  ];

  // Ordenar por data, mais recentes primeiro
  todasTransacoes.sort((a, b) => b.data - a.data);

  todasTransacoes.forEach((transacao, index) => {
    const tr = document.createElement("tr");
    
    // Data
    const tdData = document.createElement("td");
    tdData.textContent = transacao.data.toLocaleDateString("pt-BR");
    tr.appendChild(tdData);
    
    // Tipo
    const tdTipo = document.createElement("td");
    tdTipo.textContent = transacao.tipo;
    tdTipo.className = transacao.tipo === 'Receita' ? 'valor-positivo' : 'valor-negativo';
    tr.appendChild(tdTipo);
    
    // Valor
    const tdValor = document.createElement("td");
    tdValor.textContent = formatarMoeda(transacao.valor);
    tdValor.className = transacao.tipo === 'Receita' ? 'valor-positivo' : 'valor-negativo';
    tr.appendChild(tdValor);
    
    // Descrição
    const tdDesc = document.createElement("td");
    tdDesc.textContent = transacao.descricao || '-';
    tr.appendChild(tdDesc);
    
    // Categoria
    const tdCategoria = document.createElement("td");
    tdCategoria.textContent = transacao.categoria;
    tr.appendChild(tdCategoria);
    
    // Ações
    const tdAcoes = document.createElement("td");
    const btnExcluir = document.createElement("button");
    btnExcluir.className = "btn-excluir";
    btnExcluir.innerHTML = "🗑️";
    btnExcluir.title = "Excluir transação";
    btnExcluir.onclick = () => excluirTransacao(transacao, index);
    tdAcoes.appendChild(btnExcluir);
    tr.appendChild(tdAcoes);

    fragment.appendChild(tr);
  });

  tbody.appendChild(fragment);
}

function excluirTransacao(transacao, index) {
  if (confirm('Tem certeza que deseja excluir esta transação?')) {
    const array = transacao.tipo === 'Receita' ? transacoes.receitas : transacoes.despesas;
    const indexNoArray = array.findIndex(t => 
      t.data.getTime() === transacao.data.getTime() && 
      t.valor === transacao.valor && 
      t.descricao === transacao.descricao
    );
    
    if (indexNoArray !== -1) {
      array.splice(indexNoArray, 1);
      atualizarHistorico();
      // Atualiza também o relatório caso esteja visível
      if (!document.getElementById("relatorio-page").classList.contains("hidden")) {
        gerarLinhasTabela(parseInt(document.querySelector('.mes-card.active').dataset.mes));
      }
    }
  }
}
