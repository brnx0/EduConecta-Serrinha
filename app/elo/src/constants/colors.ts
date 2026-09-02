/**
 * Paleta Élo — vibrante, lúdica, distintiva.
 *
 * Filosofia: contraste alto, cores sólidas (sem gradientes pasteis),
 * laranja queimado como hero, teal como par dialógico, amarelo
 * pra confirmações alegres. Off-white quente em vez de cinza azulado.
 *
 * Mantida a chave `edu` por compatibilidade com componentes legados —
 * mas valores são totalmente Élo.
 */
export const colors = {
  // Tokens primários do novo tema
  brand: {
    primary: '#FF6B35',      // Laranja queimado — hero
    primaryDark: '#E0511C',  // Pressed / borders
    primaryLight: '#FFE7D9', // Backgrounds tonais
    secondary: '#06B6D4',    // Teal — par dialógico
    secondaryDark: '#0E7490',
    secondaryLight: '#CFFAFE',
    accent: '#FCD34D',       // Amarelo — destaques alegres
    accentDark: '#D4A017',
  },

  // Neutros quentes (off-white em vez de cinza frio)
  ink: '#1F2937',          // Texto / contornos
  inkSoft: '#475569',      // Texto secundário
  paper: '#FAF8F4',        // Background base (off-white quente)
  paperWarm: '#F4EFE8',    // Cards alternativos
  hairline: '#E7E1D6',     // Bordas sutis

  // Compat: namespace `edu` mantém keys que screens consomem
  edu: {
    primary: '#FF6B35',
    dark: '#E0511C',
    accent: '#06B6D4',
    background: '#FAF8F4',
    text: '#1F2937',
    input: '#FFFFFF',
    placeholder: '#94A3B8',
  },

  white: '#FFFFFF',
  black: '#000000',

  // Cinzas — substituídos por neutros quentes (mantém keys p/ compat)
  gray50: '#FAF8F4',
  gray100: '#F4EFE8',
  gray200: '#E7E1D6',
  gray300: '#CFC8B8',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1F2937',
  gray900: '#0F172A',

  // Estados — alinhados a paleta vibrante
  success: '#16A34A',
  error: '#DC2626',
  warning: '#F59E0B',
  info: '#06B6D4',

  // Aliases
  primary: '#FF6B35',
  primaryMain: '#FF6B35',
  primaryDarker: '#E0511C',
  secondary: '#06B6D4',
  secondaryDarker: '#0E7490',

  shadowColor: '#1F2937',
};

export const componentColors = {
  switchTrackFalse: '#E7E1D6',
  switchTrackTrue: '#FF6B35',
  switchThumbFalse: '#94A3B8',
  switchThumbTrue: '#FFFFFF',

  buttonPrimary: '#FF6B35',
  buttonSecondary: '#06B6D4',
  buttonDisabled: '#CFC8B8',

  cardBackground: '#FFFFFF',
  cardBorder: '#E7E1D6',

  textPrimary: '#1F2937',
  textSecondary: '#475569',
  textDisabled: '#94A3B8',
  textWhite: '#FFFFFF',
};
