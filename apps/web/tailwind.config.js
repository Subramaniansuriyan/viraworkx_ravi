export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9D4EDD',
          50: '#f5eeff',
          100: '#ead9ff',
          200: '#d5b3ff',
          300: '#bf8dff',
          400: '#aa66ff',
          500: '#9D4EDD',
          600: '#8040c0',
          700: '#6633a3',
          800: '#4d2687',
          900: '#33196a',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        paragraph: ['Inter', 'sans-serif'],
        signature: ['Dancing Script', 'cursive'],
      },
      borderRadius: {
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
