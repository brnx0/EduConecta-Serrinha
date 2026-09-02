/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Tokens novos do Élo
        brand: {
          primary: '#FF6B35',
          'primary-dark': '#E0511C',
          'primary-light': '#FFE7D9',
          secondary: '#06B6D4',
          'secondary-dark': '#0E7490',
          'secondary-light': '#CFFAFE',
          accent: '#FCD34D',
          'accent-dark': '#D4A017',
        },
        ink: {
          DEFAULT: '#1F2937',
          soft: '#475569',
        },
        paper: {
          DEFAULT: '#FAF8F4',
          warm: '#F4EFE8',
        },
        hairline: '#E7E1D6',

        // Compat — telas existentes ainda usam classe `edu-*`
        edu: {
          primary: '#FF6B35',
          dark: '#E0511C',
          accent: '#06B6D4',
          background: '#FAF8F4',
          text: '#1F2937',
          input: '#FFFFFF',
          placeholder: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['Outfit-Bold', 'sans-serif'],
        sans: ['Outfit-Regular', 'sans-serif'],
        medium: ['Outfit-Medium', 'sans-serif'],
        semibold: ['Outfit-SemiBold', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '32px',
        '5xl': '40px',
      },
      boxShadow: {
        playful: '0 8px 24px rgba(255, 107, 53, 0.18)',
      },
    },
  },
  plugins: [],
};
