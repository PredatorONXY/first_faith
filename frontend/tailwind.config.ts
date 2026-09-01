import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: 'var(--ff-cream)',
        blush: 'var(--ff-blush)',
        'blush-soft': 'var(--ff-blush-soft)',
        charcoal: 'var(--ff-charcoal)',
        'charcoal-soft': 'var(--ff-charcoal-soft)',
        burgundy: 'var(--ff-burgundy)',
        'burgundy-dark': 'var(--ff-burgundy-dark)',
        stone: 'var(--ff-stone)',
      },
      fontFamily: {
        display: ['var(--ff-font-display)'],
        body: ['var(--ff-font-body)'],
      },
      maxWidth: {
        site: 'var(--ff-max-width)',
      },
      borderRadius: {
        sm: 'var(--ff-radius-sm)',
        md: 'var(--ff-radius-md)',
        lg: 'var(--ff-radius-lg)',
      },
      boxShadow: {
        card: 'var(--ff-shadow-card)',
      },
    },
  },
  plugins: [],
};

export default config;
