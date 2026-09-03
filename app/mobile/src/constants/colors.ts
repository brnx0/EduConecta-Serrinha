/**
 * Paleta institucional — Prefeitura Municipal de Serrinha/BA.
 *
 * Hex extraídos do site oficial (serrinha.ba.gov.br). O dourado da cidade
 * é a cor primária; o azul institucional entra como complementar.
 *
 * Harmonia: dourado ~38° e azul ~218° no círculo cromático — complementares
 * quase exatos. O laranja queimado é o mesmo matiz do dourado, só mais
 * escuro, então a escala quente é monocromática e o azul é o contraponto.
 *
 * Contraste (WCAG 2.1):
 *   primary #EDAE44 + onPrimary #3D2C10 → 6.86:1  (texto escuro, AA)
 *   primary #EDAE44 + branco            → 1.96:1  NUNCA usar branco no dourado
 *   dark    #A05A12 + branco            → 5.30:1  (botões, AA)
 *   accent  #005FCC + branco            → 5.99:1  (AA)
 *
 * Regra: dourado sempre com tinta escura. Qualquer elemento que precise de
 * texto branco usa `dark` (quente) ou `accent` (frio).
 */
export const colors = {
  edu: {
    primary: '#EDAE44',     // Dourado da cidade — headers, faixas, superfícies
    onPrimary: '#3D2C10',   // Tinta escura obrigatória sobre o dourado
    light: '#F7D48E',       // Dourado claro — fundos de chip, estados hover
    dark: '#A05A12',        // Laranja queimado — botões, foco (texto branco)
    darker: '#7A4109',      // Pressionado
    accent: '#005FCC',      // Azul institucional — complementar, links, ativo
    accentLight: '#E6F0FC', // Azul lavado — fundo de destaque frio
    background: '#F7F5F0',  // Fundo neutro quente (acompanha o dourado)
    surface: '#FFFFFF',     // Cards
    text: '#394053',        // Azul-ardósia — texto principal
    input: '#FFFFFF',       // Fundo de inputs
    placeholder: '#9A948A', // Placeholder / texto auxiliar (neutro quente)
    border: '#E7E3DA',      // Bordas neutras quentes
  },

  // Neutros
  white: '#FFFFFF',
  black: '#000000',

  // Cinzas — levemente aquecidos pra não brigar com o dourado
  gray50: '#FAF9F6',
  gray100: '#F7F5F0',
  gray200: '#E7E3DA',
  gray300: '#D3CEC3',
  gray400: '#9A948A',
  gray500: '#6E6961',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#394053',
  gray900: '#1F2430',

  // Estados — verde e vermelho da própria paleta do site oficial
  success: '#5F8F2E',
  error: '#B02B2C',
  warning: '#A05A12',
  info: '#005FCC',

  // Aliases (evitam refactor massivo)
  primary: '#EDAE44',
  primaryMain: '#EDAE44',
  primaryDarker: '#A05A12',
  secondary: '#005FCC',
  secondaryDarker: '#00479B',

  // Sombras — marrom quente, não preto puro
  shadowColor: '#4A3208',
};

export const componentColors = {
  // Switch — trilho ligado no laranja queimado pra ler sobre fundo claro
  switchTrackFalse: '#E7E3DA',
  switchTrackTrue: '#A05A12',
  switchThumbFalse: '#9A948A',
  switchThumbTrue: '#FFFFFF',

  // Botões — carregam texto branco, então nunca o dourado puro
  buttonPrimary: '#A05A12',
  buttonSecondary: '#005FCC',
  buttonDisabled: '#D3CEC3',

  // Cards
  cardBackground: '#FFFFFF',
  cardBorder: '#E7E3DA',

  // Textos
  textPrimary: '#394053',
  textSecondary: '#6E6961',
  textDisabled: '#9A948A',
  textWhite: '#FFFFFF',
  textOnPrimary: '#3D2C10',
};
