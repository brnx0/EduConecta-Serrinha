/**
 * Formata data como `HH:mm` em pt-BR. Default tz America/Sao_Paulo.
 */
export function formatHora(date: Date, timeZone = 'America/Sao_Paulo'): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);
}

/**
 * Capitaliza primeira letra (resto preservado). String vazia retorna vazia.
 */
export function capitalize(s: string): string {
  if (!s) return '';
  return s[0].toUpperCase() + s.slice(1);
}

/**
 * Data ISO `YYYY-MM-DD` que existe no calendário, é de 1900 em diante e não
 * é futura. `new Date('2020-02-31')` vira 02/03 sem erro, então confere se
 * dia/mês/ano voltam iguais.
 */
export function isDataPassadaValida(iso: string, agora: Date = new Date()): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(ano, mes - 1, dia));
  const existe =
    dt.getUTCFullYear() === ano && dt.getUTCMonth() === mes - 1 && dt.getUTCDate() === dia;
  return existe && ano >= 1900 && dt.getTime() <= agora.getTime();
}
