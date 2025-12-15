module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f8fb',
          100: '#e6f0fa',
          200: '#bfe0f4',
          300: '#8fc9ea',
          400: '#57abe0',
          500: '#2389cf',
          600: '#1d6fb0',
          700: '#14507e',
          800: '#0f3553',
          900: '#081829'
        },
        accent: {
          50: '#f0fbf9',
          100: '#def6f2',
          200: '#bff0e6',
          300: '#8fe5d0',
          400: '#4fd1b5',
          500: '#14b8a6',
          600: '#0f9b8f',
          700: '#0a7a6b',
          800: '#07584a',
          900: '#042d26'
        }
        ,
        brand: {
          50: '#fbf7ff',
          100: '#f3e9ff',
          200: '#e7d0ff',
          300: '#d0a8ff',
          400: '#b776ff',
          500: '#9a4df0',
          600: '#7a2fd0',
          700: '#5b1f9a',
          800: '#3b144f',
          900: '#1b0826'
        },
        neon: {
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9'
        }
      }
    },
  },
  plugins: [],
}
