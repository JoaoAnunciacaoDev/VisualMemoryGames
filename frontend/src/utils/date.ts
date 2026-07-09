/**
 * Utilitários para tratamento e formatação de datas no fuso horário do usuário
 */

export function parseUTCDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;

  let cleanStr = dateStr.trim();

  // Caso 1: Apenas data (formato YYYY-MM-DD, ex: "2026-07-09")
  // Para evitar que a data mude para o dia anterior devido ao fuso horário negativo,
  // criamos a data usando o construtor local do navegador (ano, mês base 0, dia).
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    const [year, month, day] = cleanStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  // Caso 2: Data e Hora
  // Se a string não contiver indicador de fuso (Z ou offset +/-), forçamos o sufixo 'Z' (UTC)
  // para que o navegador faça a conversão correta para o horário local do usuário.
  const hasTimezone = cleanStr.endsWith('Z') || /T.*[+-]\d{2}/.test(cleanStr);
  if (!hasTimezone) {
    if (cleanStr.includes(' ') && !cleanStr.includes('T')) {
      cleanStr = cleanStr.replace(' ', 'T');
    }
    cleanStr = `${cleanStr}Z`;
  }

  const date = new Date(cleanStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Formata uma data completa com hora no padrão brasileiro (DD/MM/AAAA, HH:MM:SS)
 */
export function formatDateTime(dateStr: string | null | undefined): string {
  const date = parseUTCDate(dateStr);
  if (!date) return '-';
  return date.toLocaleString('pt-BR');
}

/**
 * Formata apenas a data no padrão brasileiro (DD/MM/AAAA)
 */
export function formatDate(dateStr: string | null | undefined): string {
  const date = parseUTCDate(dateStr);
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR');
}
