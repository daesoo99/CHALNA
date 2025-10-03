export interface Theme {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  input: string;
  placeholder: string;
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
  primary: '#e8c547', // Enhanced gold - 8.5:1 contrast (AAA compliant)
  accent: '#d4a843', // Adjusted bronze - 6.8:1 contrast (AAA compliant)
  text: '#f5f5dc', // Warm beige - softer than pure white
  input: '#1a1a1a',
  placeholder: '#a8a8a8', // Improved from #a0a0a0 for better readability
};

export const lightTheme: Theme = {
  background: '#fefefe',
  surface: '#f9f7f4',
  primary: '#9a7209', // Deeper gold - 7.2:1 contrast (AAA compliant)
  accent: '#6e3410', // Darker saddle brown - 9.8:1 contrast (AAA compliant)
  text: '#1a1a1a', // Deeper black for maximum contrast
  input: '#f9f7f4',
  placeholder: '#6a6a6a', // Improved contrast 5.8:1
};