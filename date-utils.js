// Modifique para exportar FERIADOS_NACIONAIS
export const FERIADOS_NACIONAIS = [
  { dia: 1, mes: 1, descricao: "Ano Novo" },
  { dia: 21, mes: 4, descricao: "Tiradentes" },
  { dia: 1, mes: 5, descricao: "Dia do Trabalho" },
  { dia: 7, mes: 9, descricao: "Independência do Brasil" },
  { dia: 12, mes: 10, descricao: "Nossa Senhora Aparecida" },
  { dia: 2, mes: 11, descricao: "Finados" },
  { dia: 15, mes: 11, descricao: "Proclamação da República" },
  { dia: 25, mes: 12, descricao: "Natal" }
];

// Verifica se uma data é dia útil
export function isDiaUtil(data) {
  const diaSemana = data.getDay();
  const dia = data.getDate();
  const mes = data.getMonth() + 1;
  
  // Verifica se é fim de semana (0 = Domingo, 6 = Sábado)
  if (diaSemana === 0 || diaSemana === 6) return false;
  
  // Verifica se é feriado nacional
  if (FERIADOS_NACIONAIS.some(f => f.dia === dia && f.mes === mes)) return false;
  
  return true;
}

// Encontra o dia útil anterior mais próximo
export function encontrarDiaUtilAnterior(data) {
  const dataAnterior = new Date(data);
  do {
    dataAnterior.setDate(dataAnterior.getDate() - 1);
  } while (!isDiaUtil(dataAnterior));
  return dataAnterior;
}

// Ajusta o dia para o mês específico (considerando meses com diferentes números de dias)
export function ajustarDiaParaMes(dia, mes, ano) {
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  return Math.min(dia, ultimoDiaDoMes);
}

// Formata a data para exibição
export function formatarData(dia, mes, ano) {
  if (!dia) return '';
  
  // Cria uma nova data com o dia específico
  const data = new Date(ano, mes - 1, dia);
  
  // Ajusta para o último dia do mês se necessário
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();
  if (dia > ultimoDiaDoMes) {
    data.setDate(ultimoDiaDoMes);
  }
  
  return data.toLocaleDateString('pt-BR', { 
    day: '2-digit',
    month: 'short'
  });
}

export function isDiaNaoUtil(data) {
  const diaSemana = data.getDay();
  const dia = data.getDate();
  const mes = data.getMonth() + 1;

  // Verifica se é fim de semana (0 = Domingo, 6 = Sábado)
  if (diaSemana === 0 || diaSemana === 6) return true;

  // Verifica se é feriado
  return FERIADOS_NACIONAIS.some(f => f.dia === dia && f.mes === mes);
}

export function formatMoney(value) {
  return `R$ ${Number(value).toFixed(2)}`;
}

export function getDataTooltip(data) {
  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const diaSemana = diasSemana[data.getDay()];
  const feriado = FERIADOS_NACIONAIS.find(f => f.dia === data.getDate() && f.mes === data.getMonth() + 1);
  return `${diaSemana}${feriado ? `\n${feriado.descricao}` : ''}`;
}

export function formatTransacoesTooltip(transacoes) {
  return transacoes
    .map(t => {
      const valor = formatMoney(t.valor);
      const descricao = t.descricao || "Sem descrição";
      return `${valor} - ${descricao}`;
    })
    .join('\n');
}