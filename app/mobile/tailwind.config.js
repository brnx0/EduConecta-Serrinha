/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Paleta institucional da Prefeitura de Serrinha/BA.
      // Ver app/mobile/src/constants/colors.ts para as notas de contraste.
      colors: {
        edu: {
          primary: '#EDAE44',     // Dourado da cidade (só com texto escuro)
          onPrimary: '#3D2C10',   // Tinta escura sobre o dourado
          light: '#F7D48E',       // Dourado claro (chips, hover)
          dark: '#A05A12',        // Laranja queimado (botões/foco)
          darker: '#7A4109',      // Pressionado
          accent: '#005FCC',      // Azul institucional (complementar)
          accentLight: '#E6F0FC', // Azul lavado
          background: '#F7F5F0',  // Fundo neutro quente
          surface: '#FFFFFF',     // Cards
          text: '#394053',        // Azul-ardósia
          input: '#FFFFFF',       // Fundo input
          placeholder: '#9A948A', // Texto ajuda
          border: '#E7E3DA'       // Bordas neutras quentes
        }
      },
      fontFamily: {
      }
    },
  },
  plugins: [],
}