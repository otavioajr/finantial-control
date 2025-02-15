// Objeto para armazenar as transações
let transacoes = {
    receitas: [],
    despesas: []
};

// Adicione no início do arquivo, junto com as outras variáveis
let configSalarial = {
    salarioBase: 0,
    temAdiantamento: false,
    porcentagemAdiantamento: 40,
    diaAdiantamento: 15,
    diaPagamento: 30,
    diaSalario: 5  // Novo campo
};

// Variáveis globais para data de início dos cálculos
let inicioMes = new Date().getMonth() + 1;
let inicioAno = new Date().getFullYear();

// Função para formatar valores em reais
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para adicionar receita
function adicionarReceita(valor, data, descricao) {
    // Ajusta a data para considerar o fuso horário local
    const [ano, mes, dia] = data.split('-');
    const dataAjustada = new Date(ano, mes - 1, dia);
    // Se a descrição for "salário" (case-insensitive), marque a receita
    const receita = {
        valor: parseFloat(valor),
        data: dataAjustada,
        descricao: descricao
    };
    if (descricao.trim().toLowerCase() === "salário") {
        receita.tipo = "salario";
    }
    
    transacoes.receitas.push(receita);
    atualizarTabela();
}

// Função para adicionar despesa
function adicionarDespesa(valor, data, descricao) {
    // Ajusta a data para considerar o fuso horário local
    const [ano, mes, dia] = data.split('-');
    const dataAjustada = new Date(ano, mes - 1, dia);
    
    transacoes.despesas.push({
        valor: parseFloat(valor),
        data: dataAjustada,
        descricao: descricao
    });
    atualizarTabela();
}

// Função para calcular totais do dia
function calcularTotaisDia(dia, mes, ano) {
    const receitas = transacoes.receitas.filter(t => {
        return t.data.getDate() === dia && 
               t.data.getMonth() === mes - 1 && 
               t.data.getFullYear() === ano;
    });

    const despesas = transacoes.despesas.filter(t => {
        return t.data.getDate() === dia && 
               t.data.getMonth() === mes - 1 && 
               t.data.getFullYear() === ano;
    });

    const totalReceitas = receitas.reduce((sum, t) => sum + t.valor, 0);
    const totalDespesas = despesas.reduce((sum, t) => sum + t.valor, 0);
    const saldoDiario = totalReceitas - totalDespesas;

    return {
        entrada: totalReceitas,
        saida: totalDespesas,
        diario: saldoDiario
    };
}

// Função para calcular saldo acumulado
function calcularSaldoAcumulado(dia, mes, ano) {
    let saldo = 0;
    for (let i = 1; i <= dia; i++) {
        const totais = calcularTotaisDia(i, mes, ano);
        const existeSalarioManual = transacoes.receitas.some(t =>
            t.data.getDate() === i &&
            t.data.getMonth() === mes - 1 &&
            t.data.getFullYear() === ano &&
            t.tipo === "salario"
        );
        const computedSalary = existeSalarioManual ? 0 : getSalaryValue(i, mes, ano);
        saldo += totais.diario + computedSalary;
    }
    return saldo;
}

// Nova função para verificar se um dia é útil (segunda a sexta)
function isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
}

// Nova função para calcular o valor do salário para o dia
function getSalaryValue(dia, mes, ano) {
    let valor = 0;
    const dataAtual = new Date(ano, mes - 1, dia);
    // Se dia atual não for útil ou for feriado, não preenche salário
    if (!isBusinessDay(dataAtual) || isHoliday(dataAtual, ano)) return 0;

    if (configSalarial.temAdiantamento) {
        const diaEfetivoAdiantamento = effectiveDay(configSalarial.diaAdiantamento, mes, ano);
        const diaEfetivoPagamento = effectiveDay(configSalarial.diaPagamento, mes, ano);
        if (dia === diaEfetivoAdiantamento) {
            valor = configSalarial.salarioBase * (configSalarial.porcentagemAdiantamento / 100);
        } else if (dia === diaEfetivoPagamento) {
            valor = configSalarial.salarioBase - (configSalarial.salarioBase * (configSalarial.porcentagemAdiantamento / 100));
        }
    } else {
        const diaEfetivoRecebimento = effectiveDay(configSalarial.diaSalario, mes, ano);
        if (dia === diaEfetivoRecebimento) {
            valor = configSalarial.salarioBase;
        }
    }
    return valor;
}

// Função para gerar as linhas da tabela
// Nova função para calcular a data da Páscoa (algoritmo de Anonymous Gregorian)
function getEasterDate(year) {
    let a = year % 19;
    let b = Math.floor(year / 100);
    let c = year % 100;
    let d = Math.floor(b / 4);
    let e = b % 4;
    let f = Math.floor((b + 8) / 25);
    let g = Math.floor((b - f + 1) / 3);
    let h = (19 * a + b - d - g + 15) % 30;
    let i = Math.floor(c / 4);
    let k = c % 4;
    let l = (32 + 2 * e + 2 * i - h - k) % 7;
    let m = Math.floor((a + 11 * h + 22 * l) / 451);
    let month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
    let day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Função auxiliar para formatar chave no formato "MM-DD"
function formatKey(date) {
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    return `${mm}-${dd}`;
}

// Nova função que calcula os feriados de Carnaval com base na Páscoa
function getCarnavalDates(year) {
    const easter = getEasterDate(year);
    // Carnaval: terça-feira de Carnaval = Páscoa - 47 dias
    let carnavalTuesday = new Date(easter);
    carnavalTuesday.setDate(easter.getDate() - 47);
    // Opcionalmente, incluir segunda-feira de Carnaval = Páscoa - 48 dias
    let carnavalMonday = new Date(easter);
    carnavalMonday.setDate(easter.getDate() - 48);
    
    return {
        [formatKey(carnavalMonday)]: "Carnaval (Segunda)",
        [formatKey(carnavalTuesday)]: "Carnaval (Terça)"
    };
}

// Nova função para obter todos os feriados do ano
function getTodosFeriados(ano) {
    const feriadosFixos = {
        "01-01": "Confraternização Universal",
        "04-21": "Tiradentes",
        "05-01": "Dia do Trabalho",
        "09-07": "Independência do Brasil",
        "10-12": "Nossa Senhora Aparecida",
        "11-02": "Finados",
        "11-15": "Proclamação da República",
        "12-25": "Natal"
    };
    const feriadosMovel = getCarnavalDates(ano);
    return { ...feriadosFixos, ...feriadosMovel };
}

// Função para verificar se uma data é feriado
function isHoliday(date, ano) {
    const todosFeriados = getTodosFeriados(ano);
    const key = formatKey(date);
    return todosFeriados.hasOwnProperty(key);
}

// Função para retornar o primeiro dia útil anterior ao dia agendado
function effectiveDay(scheduledDay, mes, ano) {
    let effective = scheduledDay;
    while (effective > 0) {
        const data = new Date(ano, mes - 1, effective);
        if (isBusinessDay(data) && !isHoliday(data, ano)) {
            return effective;
        }
        effective--;
    }
    return scheduledDay;
}

// Modifica a função gerarLinhasTabela para iniciar a partir da data de início definida
function gerarLinhasTabela(mes) {
    const tbody = document.getElementById('tabela-body');
    tbody.innerHTML = '';

    // Obtém o ano selecionado no relatório
    const anoSelect = document.getElementById('ano-select');
    const anoSelecionado = anoSelect && anoSelect.value ? parseInt(anoSelect.value) : new Date().getFullYear();

    // Define a data final: último dia do mês/ano selecionado
    const dataFinal = new Date(anoSelecionado, mes, 0);

    // Data base: definida pelo início escolhido pelo usuário
    let dataAtual = new Date(inicioAno, inicioMes - 1, 1);
    let saldoAcumulado = 0;

    // Mapeamento de dias da semana e feriados fixos
    const dayOfWeekMapping = {
        0: "Domingo", 1: "Segunda-feira", 2: "Terça-feira",
        3: "Quarta-feira", 4: "Quinta-feira", 5: "Sexta-feira", 6: "Sábado"
    };
    const feriadosFixos = {
        "01-01": "Confraternização Universal",
        "04-21": "Tiradentes",
        "05-01": "Dia do Trabalho",
        "09-07": "Independência do Brasil",
        "10-12": "Nossa Senhora Aparecida",
        "11-02": "Finados",
        "11-15": "Proclamação da República",
        "12-25": "Natal"
    };
    let todosFeriados = { ...feriadosFixos, ...getCarnavalDates(dataAtual.getFullYear()) };

    while (dataAtual <= dataFinal) {
        const dia = dataAtual.getDate();
        const mesAtual = dataAtual.getMonth() + 1;
        const anoAtual = dataAtual.getFullYear();

        // Atualiza feriados se o ano mudar
        if (mesAtual === 1 && dia === 1) {
            todosFeriados = { ...feriadosFixos, ...getCarnavalDates(anoAtual) };
        }

        // Filtrar receitas e despesas para dataAtual
        const receitasDia = transacoes.receitas.filter(t =>
            t.data.getDate() === dia &&
            t.data.getMonth() === mesAtual - 1 &&
            t.data.getFullYear() === anoAtual
        );
        const despesasDia = transacoes.despesas.filter(t =>
            t.data.getDate() === dia &&
            t.data.getMonth() === mesAtual - 1 &&
            t.data.getFullYear() === anoAtual
        );
        const totalReceitasManual = receitasDia.reduce((sum, t) => sum + t.valor, 0);
        const totalDespesas = despesasDia.reduce((sum, t) => sum + t.valor, 0);
        const possuiSalarioManual = receitasDia.some(t => t.tipo === "salario");
        const computedSalary = possuiSalarioManual ? 0 : getSalaryValue(dia, mesAtual, anoAtual);
        const entrada = totalReceitasManual + computedSalary;
        saldoAcumulado += (entrada - totalDespesas);

        // Cria lista de tooltip para cada inserção individual (receitas)
        let tooltipEntradaItems = receitasDia.map(r => 
            `${formatarMoeda(r.valor)} - ${r.descricao && r.descricao.trim() !== "" ? r.descricao : "sem descrição"}`
        );
        if (!possuiSalarioManual && computedSalary > 0) {
            tooltipEntradaItems.push(`${formatarMoeda(computedSalary)} - salário`);
        }
        const tooltipEntrada = tooltipEntradaItems.join("\n");

        // Cria lista de tooltip para cada inserção individual (despesas)
        let tooltipSaidaItems = despesasDia.map(r =>
            `${formatarMoeda(r.valor)} - ${r.descricao && r.descricao.trim() !== "" ? r.descricao : "sem descrição"}`
        );
        const tooltipSaida = tooltipSaidaItems.join("\n");

        // Exibe linha somente se dataAtual pertence ao mês/ano selecionado
        if (mesAtual === mes && anoAtual === anoSelecionado) {
            const dataFormata = dataAtual.toLocaleDateString('pt-BR');
            const diaSemana = dayOfWeekMapping[dataAtual.getDay()];
            const chaveDia = `${mesAtual.toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;
            const nomeFeriado = todosFeriados[chaveDia];
            const tooltipData = nomeFeriado ? `${diaSemana} - ${nomeFeriado}` : diaSemana;
            
            // Formata os valores e cria os titles conforme o padrão "Valor - descrição"
            const formattedEntrada = entrada > 0 ? formatarMoeda(entrada) : '';
            const formattedSaida = totalDespesas > 0 ? formatarMoeda(totalDespesas) : '';
            const titleEntrada = formattedEntrada ? (tooltipEntrada ? formattedEntrada + " - " + tooltipEntrada : formattedEntrada) : '';
            const titleSaida = formattedSaida ? (tooltipSaida ? formattedSaida + " - " + tooltipSaida : formattedSaida) : '';

            const tr = document.createElement('tr');
            if (!isBusinessDay(dataAtual) || nomeFeriado) {
                tr.classList.add('non-business');
            }
            tr.innerHTML = `
                <td title="${tooltipData}">${dataFormata}</td>
                <td title="${tooltipEntrada}">${formattedEntrada}</td>
                <td title="${tooltipSaida}">${formattedSaida}</td>
                <td>${formatarMoeda(0)}</td>
                <td>${formatarMoeda(saldoAcumulado)}</td>
            `;
            tbody.appendChild(tr);
        }
        dataAtual.setDate(dataAtual.getDate() + 1);
    }
}

// Validação na atualização do relatório para respeitar a data de início
function atualizarTabela() {
    const mesReport = parseInt(document.getElementById('mes-select').value);
    const anoReport = parseInt(document.getElementById('ano-select').value);
    if (anoReport < inicioAno || (anoReport === inicioAno && mesReport < inicioMes)) {
        alert("A seleção de mês/ano do relatório deve ser igual ou posterior à data de início dos cálculos.");
        document.getElementById('mes-select').value = inicioMes;
        document.getElementById('ano-select').value = inicioAno;
    }
    const mesAtual = parseInt(document.getElementById('mes-select').value);
    gerarLinhasTabela(mesAtual);
}

// Event listener para o formulário de início
document.getElementById('form-inicio').addEventListener('submit', (e) => {
    e.preventDefault();
    inicioMes = parseInt(document.getElementById('inicio-mes').value);
    inicioAno = parseInt(document.getElementById('inicio-ano').value);
    alert("Data de início atualizada!");
    populateAnoSelect();
    atualizarTabela();
});

// Função para atualizar a tabela
function atualizarTabela() {
    const mesAtual = parseInt(document.getElementById('mes-select').value);
    gerarLinhasTabela(mesAtual);
}

// Event Listeners
document.getElementById('mes-select').addEventListener('change', (e) => {
    gerarLinhasTabela(parseInt(e.target.value));
});

// Adicione esta função no início do arquivo
function setDataAtual() {
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    // Define a data atual nos campos de data
    document.getElementById('data-receita').value = dataFormatada;
    document.getElementById('data-despesa').value = dataFormatada;
}

// Nova função para popular o select de ano
function populateAnoSelect() {
    const select = document.getElementById('ano-select');
    select.innerHTML = "";
    const maxYear = 2100;
    for (let i = inicioAno; i <= maxYear; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        // Seleciona o ano de início por padrão
        if (i === inicioAno) option.selected = true;
        select.appendChild(option);
    }
}

// Modifique o event listener DOMContentLoaded para incluir a chamada da função
document.addEventListener('DOMContentLoaded', () => {
    // Define a data atual nos campos
    setDataAtual();
    populateAnoSelect();

    // Gera a tabela para o mês atual
    const mesAtual = new Date().getMonth() + 1;
    document.getElementById('mes-select').value = mesAtual;
    gerarLinhasTabela(mesAtual);

    // Adiciona event listeners para os formulários
    document.getElementById('form-receita').addEventListener('submit', (e) => {
        e.preventDefault();
        const valor = document.getElementById('valor-receita').value;
        const data = document.getElementById('data-receita').value;
        const descricao = document.getElementById('desc-receita').value;
        
        adicionarReceita(valor, data, descricao);
        e.target.reset();
        alert('Receita adicionada com sucesso!');
    });

    document.getElementById('form-despesa').addEventListener('submit', (e) => {
        e.preventDefault();
        const valor = document.getElementById('valor-despesa').value;
        const data = document.getElementById('data-despesa').value;
        const descricao = document.getElementById('desc-despesa').value;
        
        adicionarDespesa(valor, data, descricao);
        e.target.reset();
        alert('Despesa adicionada com sucesso!');
    });

    // Adicione dentro do event listener DOMContentLoaded
    document.getElementById('tem-adiantamento').addEventListener('change', function(e) {
        const configAdiantamento = document.getElementById('config-adiantamento');
        const diaSalarioUnico = document.querySelector('.dia-salario-único');
        
        configAdiantamento.classList.toggle('hidden', !this.checked);
        diaSalarioUnico.classList.toggle('hidden', this.checked);
    });

    document.getElementById('form-salario').addEventListener('submit', function(e) {
        e.preventDefault();
        
        configSalarial = {
            salarioBase: parseFloat(document.getElementById('valor-salario').value),
            temAdiantamento: document.getElementById('tem-adiantamento').checked,
            porcentagemAdiantamento: parseInt(document.getElementById('porcentagem-adiantamento').value),
            diaAdiantamento: parseInt(document.getElementById('dia-adiantamento').value),
            diaPagamento: parseInt(document.getElementById('dia-pagamento').value),
            diaSalario: parseInt(document.getElementById('dia-salario').value)
        };
        
        alert('Configuração salarial salva com sucesso!');
    });

    // Função para carregar configuração salarial (adicione junto com as outras funções)
    function carregarConfigSalarial() {
        document.getElementById('valor-salario').value = configSalarial.salarioBase;
        document.getElementById('tem-adiantamento').checked = configSalarial.temAdiantamento;
        document.getElementById('porcentagem-adiantamento').value = configSalarial.porcentagemAdiantamento;
        document.getElementById('dia-adiantamento').value = configSalarial.diaAdiantamento;
        document.getElementById('dia-pagamento').value = configSalarial.diaPagamento;
        document.getElementById('dia-salario').value = configSalarial.diaSalario;
        
        // Mostra/esconde campos de adiantamento
        const configAdiantamento = document.getElementById('config-adiantamento');
        configAdiantamento.classList.toggle('hidden', !configSalarial.temAdiantamento);
    }

    // Adicione a chamada da função carregarConfigSalarial no DOMContentLoaded
    carregarConfigSalarial();

    // Configuração do painel flutuante
    const configButton = document.getElementById('config-button');
    const configPanel = document.getElementById('config-panel');
    
    // Criar backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    document.body.appendChild(backdrop);

    // Toggle do painel
    configButton.addEventListener('click', () => {
        configPanel.classList.toggle('active');
        backdrop.classList.toggle('active');
    });

    // Fechar ao clicar fora
    backdrop.addEventListener('click', () => {
        configPanel.classList.remove('active');
        backdrop.classList.remove('active');
    });

    // Adicione os event listeners para os botões de navegação
    const btnMain = document.getElementById('btn-main');
    const btnRelatorio = document.getElementById('btn-relatorio');

    btnMain.addEventListener('click', () => {
        showPage('main');
    });

    btnRelatorio.addEventListener('click', () => {
        showPage('relatorio');
        atualizarTabela(); // Atualiza a tabela ao entrar no relatório
    });

    // Adicione o event listener para o select de ano:
    document.getElementById('ano-select').addEventListener('change', () => {
        atualizarTabela();
    });
});

// Função para alternar entre as páginas
function showPage(pageId) {
    const mainPage = document.getElementById('main-page');
    const relatorioPage = document.getElementById('relatorio-page');
    const buttons = document.querySelectorAll('.nav-btn');

    if (pageId === 'main') {
        mainPage.classList.remove('hidden');
        relatorioPage.classList.add('hidden');
    } else {
        mainPage.classList.add('hidden');
        relatorioPage.classList.remove('hidden');
    }

    // Atualiza os botões ativos
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(pageId)) {
            btn.classList.add('active');
        }
    });
}