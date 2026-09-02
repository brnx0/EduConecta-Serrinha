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
