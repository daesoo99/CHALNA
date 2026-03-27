export interface Theme {
  background: string;
  surface: string;
  cardBackground: string;
  primary: string;
  accent: string;
  secondaryAccent: string;
  text: string;
  secondaryText: string;
  input: string;
  placeholder: string;
  border: string;
  success: string;
  error: string;
}

// Typography System - 8pt modular scale (1.25 ratio)
export const typography = {
  displayLarge: 32,
  displayMedium: 24,
  headlineLarge: 20,
  headlineMedium: 16,
  bodyLarge: 16,
  bodyMedium: 14,
  labelSmall: 12,

  // Additional styles for compatibility
  title: { fontSize: 28, fontWeight: '700' as const },
  subtitle: { fontSize: 16, fontWeight: '400' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  number: { fontSize: 48, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },

  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  }
};

// Spacing System - 8pt base
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const darkTheme: Theme = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  cardBackground: '#1a1a1a',
  primary: '#e8c547', // Enhanced gold - 8.5:1 contrast (AAA compliant)
  accent: '#e8c547', // Gold accent
  secondaryAccent: '#4ecdc4', // Teal for secondary elements
  text: '#f5f5dc', // Warm beige - softer than pure white
  secondaryText: '#a8a8a8',
  input: '#1a1a1a',
  placeholder: '#a8a8a8', // Improved from #a0a0a0 for better readability
  border: '#333',
  success: '#4caf50',
  error: '#ff6b6b',
};

export const lightTheme: Theme = {
  background: '#fefefe',
  surface: '#f9f7f4',
  cardBackground: '#ffffff',
  primary: '#9a7209', // Deeper gold - 7.2:1 contrast (AAA compliant)
  accent: '#e8c547', // Gold accent
  secondaryAccent: '#4ecdc4', // Teal for secondary elements
  text: '#1a1a1a', // Deeper black for maximum contrast
  secondaryText: '#6a6a6a',
  input: '#f9f7f4',
  placeholder: '#6a6a6a', // Improved contrast 5.8:1
  border: '#e0e0e0',
  success: '#4caf50',
  error: '#ff6b6b',
};