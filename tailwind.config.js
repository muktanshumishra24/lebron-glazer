/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // The King's Court Palette
        'lakers-gold': '#FDB927',
        'lakers-purple': '#552583',
        'enemy-red': '#8B2635',
      },
      fontFamily: {
        'monument': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(253, 185, 39, 0.5), 0 0 10px rgba(253, 185, 39, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(253, 185, 39, 0.8), 0 0 30px rgba(253, 185, 39, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
