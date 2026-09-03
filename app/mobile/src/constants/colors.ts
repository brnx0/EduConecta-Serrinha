/**
 * Paleta institucional — Prefeitura Municipal de Serrinha/BA.
 *
 * Hex extraídos do site oficial (serrinha.ba.gov.br): azul dominante das
 * seções, azul do rodapé e dourado dos destaques.
 *
 * Contraste (WCAG 2.1, texto branco por cima):
 *   primary #0083DB → 3.98:1  — só título/ícone grande (AA large)
 *   deep    #005FCC → 5.99:1  — seguro pra texto normal (AA)
 *   gold    #EDAE44 → usar SEMPRE com texto escuro (10.7:1 com ink)
 *
 * Regra: superfície grande usa `primary`; qualquer elemento pequeno com
 * texto branco (botão, chip, badge) usa `deep`.
 */
export const colors = {
  edu: {
    primary: '#0083DB',     // Azul institucional — headers, faixas, superfícies
    dark: '#005FCC',        // Azul do rodapé oficial — botões, foco, bordas
    darker: '#00479B',      // Pressionado / gradiente
    accent: '#EDAE44',      // Dourado — destaques (texto escuro por cima)
    background: '#F3F4F6',  // Fundo geral (mesmo do site oficial)
    surface: '#FFFFFF',     // Cards
    text: '#394053',        // Azul-ardósia — texto principal
    input: '#FFFFFF',       // Fundo de inputs
    placeholder: '#9CA3AF', // Placeholder / texto auxiliar
    border: '#E5E7EB',      // Bordas neutras
  },

  // Neutros
  white: '#FFFFFF',
  black: '#000000',

  // Cinzas
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#394053',
  gray900: '#1F2430',

  // Estados — verde e vermelho vindos da paleta do site oficial
  success: '#5F8F2E',
  error: '#B02B2C',
  warning: '#EDAE44',
  info: '#0083DB',

  // Aliases (evitam refactor massivo)
  primary: '#0083DB',
  primaryMain: '#0083DB',
  primaryDarker: '#005FCC',
  secondary: '#EDAE44',
  secondaryDarker: '#C98F2E',

  // Sombras
  shadowColor: '#00479B',
};

export const componentColors = {
  // Switch
  switchTrackFalse: '#E5E7EB',
  switchTrackTrue: '#0083DB',
  switchThumbFalse: '#9CA3AF',
  switchThumbTrue: '#FFFFFF',

  // Botões — `deep` porque carregam texto branco em tamanho normal
  buttonPrimary: '#005FCC',
  buttonSecondary: '#394053',
  buttonDisabled: '#D1D5DB',

  // Cards
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',

  // Textos
  textPrimary: '#394053',
  textSecondary: '#4B5563',
  textDisabled: '#9CA3AF',
  textWhite: '#FFFFFF',
};
