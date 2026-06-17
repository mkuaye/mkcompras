module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        accent2: 'var(--accent2)',
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        success: 'var(--success)',
        error: 'var(--error)',
        text: 'var(--text)',
        muted: 'var(--muted)',
        shopee: 'var(--shopee)',
        ml: 'var(--ml)',
        amazon: 'var(--amazon)',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
