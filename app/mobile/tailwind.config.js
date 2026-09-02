/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        edu: {
          primary: '#2A93E2',    // Azul Principal
          dark: '#216FAA',       // Azul Escuro (Bordas/Foco)
          accent: '#7F35B2',     // Roxo (Detalhes/Links)
          background: '#F3F4F6', // Fundo leve
          text: '#1F2937',       // Texto escuro
          input: '#FFFFFF',      // Fundo input
          placeholder: '#9CA3AF' // Texto ajuda
        }
      },
      fontFamily: {
      }
    },
  },
  plugins: [],
}