/**
 * Helper to generate competencies/months starting from June 2026 to December 2030
 */
export const COMPETENCIAS_LIST = (() => {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const list: string[] = [];
  
  // Starting from June (index 5) in 2026 to December (index 11) in 2030
  for (let ano = 2026; ano <= 2030; ano++) {
    const mesInicio = (ano === 2026) ? 5 : 0;
    for (let m = mesInicio; m < 12; m++) {
      list.push(`${meses[m]}/${ano}`);
    }
  }
  return list;
})();

export const getTodayFormatted = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const adjustLimitDateForCompetence = (originalDateStr: string, targetCompetencia: string): string => {
  // originalDateStr is 'YYYY-MM-DD'
  // targetCompetencia is 'Mês/Ano' (e.g., 'Julho/2026')
  const dateParts = originalDateStr.split('-');
  if (dateParts.length !== 3) return originalDateStr;
  
  const originalDay = parseInt(dateParts[2], 10);
  
  const compParts = targetCompetencia.split('/');
  if (compParts.length !== 2) return originalDateStr;
  
  const monthName = compParts[0];
  const yearNum = parseInt(compParts[1], 10);
  
  const mesesMap: { [key: string]: number } = {
    'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
    'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
  };
  
  const monthIndex = mesesMap[monthName];
  if (monthIndex === undefined) return originalDateStr;
  
  // safely fetch last day of the target month & year
  const lastDayOfMonth = new Date(yearNum, monthIndex + 1, 0).getDate();
  const targetDay = Math.min(originalDay, lastDayOfMonth);
  
  const formattedYear = yearNum.toString();
  const formattedMonth = String(monthIndex + 1).padStart(2, '0');
  const formattedDay = String(targetDay).padStart(2, '0');
  
  return `${formattedYear}-${formattedMonth}-${formattedDay}`;
};


