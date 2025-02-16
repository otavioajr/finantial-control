// utils.js
export function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function isBusinessDay(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

export function getEasterDate(year) {
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
  let month = Math.floor((h + l - 7 * m + 114) / 31);
  let day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export function formatKey(date) {
  const mm = (date.getMonth() + 1).toString().padStart(2, "0");
  const dd = date.getDate().toString().padStart(2, "0");
  return `${mm}-${dd}`;
}

export function getCarnavalDates(year) {
  const easter = getEasterDate(year);
  const carnavalTuesday = new Date(easter);
  carnavalTuesday.setDate(easter.getDate() - 47);
  const carnavalMonday = new Date(easter);
  carnavalMonday.setDate(easter.getDate() - 48);
  return {
    [formatKey(carnavalMonday)]: "Carnaval (Segunda)",
    [formatKey(carnavalTuesday)]: "Carnaval (Terça)",
  };
}

export function effectivePaymentDay(diaDesejado, mes, ano) {
  let diaAtual = diaDesejado;
  while (diaAtual > 0) {
    const dataAtual = new Date(ano, mes - 1, diaAtual);
    if (isBusinessDay(dataAtual) && !isHoliday(dataAtual, ano)) {
      return diaAtual;
    }
    diaAtual--;
  }
  return null;
}

export function nthBusinessDay(n, mes, ano) {
  let count = 0;
  const maxDays = new Date(ano, mes, 0).getDate();
  for (let day = 1; day <= maxDays; day++) {
    const currentDate = new Date(ano, mes - 1, day);
    if (isBusinessDay(currentDate) && !isHoliday(currentDate, ano)) {
      count++;
      if (count === n) return day;
    }
  }
  return null;
}

function getTodosFeriadosInterno(ano) {
  const feriadosFixos = {
    "01-01": "Confraternização Universal",
    "04-21": "Tiradentes",
    "05-01": "Dia do Trabalho",
    "09-07": "Independência do Brasil",
    "10-12": "Nossa Senhora Aparecida",
    "11-02": "Finados",
    "11-15": "Proclamação da República",
    "12-25": "Natal",
  };
  return { ...feriadosFixos, ...getCarnavalDates(ano) };
}

export function isHoliday(date, ano) {
  const todosFeriados = getTodosFeriadosInterno(ano);
  return todosFeriados.hasOwnProperty(formatKey(date));
}

export function getHolidayName(date) {
  const todosFeriados = getTodosFeriadosInterno(date.getFullYear());
  const key = formatKey(date);
  return todosFeriados[key] || null;
}

export function getDayOfWeekName(date) {
  const diasSemana = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 
    'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  return diasSemana[date.getDay()];
}
