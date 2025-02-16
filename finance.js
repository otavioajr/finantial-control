// finance.js
import { effectivePaymentDay, nthBusinessDay, isBusinessDay } from './utils.js';

export const transacoes = {
  receitas: [],
  despesas: [],
};

export let configSalarial = {
  salarioBase: 0,
  temAdiantamento: false,
  porcentagemAdiantamento: 40,
  diaAdiantamento: 15,
  diaPagamento: 30,
  diaSalario: 5,
  investir: false,
};

export const historicoSalarial = [{
  data: new Date(),
  config: { ...configSalarial }
}];

export let inicioMes = new Date().getMonth() + 1;
export let inicioAno = new Date().getFullYear();

export function adicionarReceita(valor, data, descricao) {
  const [ano, mes, dia] = data.split("-");
  const dataAjustada = new Date(ano, mes - 1, dia);
  const receita = {
    valor: parseFloat(valor),
    data: dataAjustada,
    descricao: descricao,
  };
  if (descricao.trim().toLowerCase() === "salário") {
    receita.tipo = "salario";
  }
  transacoes.receitas.push(receita);
}

export function adicionarDespesa(valor, data, descricao, isFixa, isDiaria, numParcelas = 1) {
  const [ano, mes, dia] = data.split("-");
  const dataAjustada = new Date(ano, mes - 1, dia);
  
  // Se for despesa parcelada, cria múltiplas entradas
  if (isFixa && numParcelas > 1) {
    const valorParcela = parseFloat(valor) / numParcelas;
    
    for (let i = 0; i < numParcelas; i++) {
      const dataParcela = new Date(dataAjustada);
      dataParcela.setMonth(dataAjustada.getMonth() + i);
      
      transacoes.despesas.push({
        valor: valorParcela,
        data: dataParcela,
        descricao: `${descricao} (${i + 1}/${numParcelas})`,
        fixa: true,
        diaria: false,
        parcelado: true,
        parcela: i + 1,
        totalParcelas: numParcelas
      });
    }
  } else {
    transacoes.despesas.push({
      valor: parseFloat(valor),
      data: dataAjustada,
      descricao: descricao,
      fixa: isFixa,
      diaria: isDiaria,
      parcelado: false,
      parcela: 1,
      totalParcelas: 1
    });
  }
}

export function getSalaryValue(dia, mes, ano) {
  // Aqui você pode utilizar a lógica de validação da configuração
  const baseSalary = configSalarial.salarioBase;
  if (baseSalary === 0) return 0;

  if (configSalarial.temAdiantamento) {
    const adiantamentoDay = effectivePaymentDay(configSalarial.diaAdiantamento, mes, ano);
    const pagamentoDay = effectivePaymentDay(configSalarial.diaPagamento, mes, ano);
    if (dia === adiantamentoDay) {
      return baseSalary * (configSalarial.porcentagemAdiantamento / 100);
    } else if (dia === pagamentoDay) {
      return baseSalary - baseSalary * (configSalarial.porcentagemAdiantamento / 100);
    }
    return 0;
  } else {
    const salaryDay = nthBusinessDay(configSalarial.diaSalario, mes, ano);
    return dia === salaryDay ? baseSalary : 0;
  }
}

export function calcularValorDiarioDisponivel(totalEntradas, totalSaidasFixas, totalSaidasDiarias, diasNoMes) {
  const hoje = new Date();
  const diaAtual = hoje.getDate();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  // Se estiver consultando um mês futuro, considera o mês inteiro
  const mes = parseInt(document.getElementById("mes-select").value);
  const ano = parseInt(document.getElementById("ano-select").value);
  
  let diasRestantes;
  
  if (ano > anoAtual || (ano === anoAtual && mes > mesAtual)) {
    // Mês futuro: considera o mês inteiro
    diasRestantes = diasNoMes;
  } else if (ano === anoAtual && mes === mesAtual) {
    // Mês atual: considera apenas os dias restantes
    diasRestantes = diasNoMes - diaAtual + 1; // +1 para incluir o dia atual
  } else {
    // Mês passado: retorna 0
    return 0;
  }

  const saldoDisponivel = totalEntradas - totalSaidasFixas - totalSaidasDiarias;
  if (saldoDisponivel <= 0 || diasRestantes <= 0) return 0;
  
  return saldoDisponivel / diasRestantes;
}

export function salvarConfigSalarial(novaConfig) {
  // Salva a configuração atual no histórico
  historicoSalarial.push({
    data: new Date(),
    config: { ...configSalarial }
  });
  
  // Atualiza a configuração atual
  configSalarial = {
    ...configSalarial,  // mantém configurações existentes
    ...novaConfig,      // sobrescreve com as novas configurações
  };
}

// Nova função para calcular o saldo acumulado antes do mês/ano selecionado
export function calcularSaldoAcumuladoAntes(targetMes, targetAno) {
  let saldo = 0;
  // Data de início definida na configuração
  const startDate = new Date(inicioAno, inicioMes - 1, 1);
  const endDate = new Date(targetAno, targetMes - 1, 1); // primeiro dia do mês selecionado
  // Itera dia a dia
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dia = d.getDate();
    const mes = d.getMonth() + 1;
    const ano = d.getFullYear();
    
    const receitasDoDia = transacoes.receitas.filter(r =>
      r.data.getDate() === dia &&
      r.data.getMonth() === (mes - 1) &&
      r.data.getFullYear() === ano
    ).reduce((acc, r) => acc + r.valor, 0);
    
    const salarioDoDia = getSalaryValue(dia, mes, ano);
    const entrada = receitasDoDia + salarioDoDia;
    
    const saidasDoDia = transacoes.despesas.filter(desp =>
      desp.data.getDate() === dia &&
      desp.data.getMonth() === (mes - 1) &&
      desp.data.getFullYear() === ano
    ).reduce((acc, d) => acc + d.valor, 0);
    
    saldo += (entrada - saidasDoDia);
  }
  return saldo;
}
