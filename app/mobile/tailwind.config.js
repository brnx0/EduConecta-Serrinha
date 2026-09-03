/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // Paleta institucional da Prefeitura de Serrinha/BA.
      // Ver app/mobile/src/constants/colors.ts para as notas de contraste.
      colors: {
        edu: {
          primary: '#0083DB',    // Azul institucional (superfícies grandes)
          dark: '#005FCC',       // Azul do rodapé oficial (botões/foco)
          darker: '#00479B',     // Pressionado
          accent: '#EDAE44',     // Dourado (sempre com texto escuro)
          background: '#F3F4F6', // Fundo leve
          surface: '#FFFFFF',    // Cards
          text: '#394053',       // Azul-ardósia
          input: '#FFFFFF',      // Fundo input
          placeholder: '#9CA3AF',// Texto ajuda
          border: '#E5E7EB'      // Bordas neutras
        }
      },
      fontFamily: {
      }
    },
  },
  plugins: [],
}