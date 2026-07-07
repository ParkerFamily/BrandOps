const lime = '#C6FF00';

export default {
  // Mobile companion is designed for dark-first premium UI.
  light: {
    text: '#0A0A0A',
    background: '#FFFFFF',
    tint: lime,
    tabIconDefault: '#8A8A8A',
    tabIconSelected: lime,
  },
  dark: {
    text: '#FAFAFA',
    background: '#0A0A0A',
    tint: lime,
    tabIconDefault: '#7A7A7A',
    tabIconSelected: lime,
  },
} as const;
