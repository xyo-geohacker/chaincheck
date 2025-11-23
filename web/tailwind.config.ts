import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0f172a',
          accent: '#2563eb'
        }
      },
      fontFamily: {
        sans: ['Lexend Deca', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;

