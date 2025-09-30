export interface Theme {
  background: string;
  surface: string;
  primary: string;
  accent: string;
  text: string;
  input: string;
  placeholder: string;
}

export const darkTheme: Theme = {
  background: '#0f0f0f',
  surface: '#1a1a1a',
  primary: '#d4af37', // Warm gold - representing precious time
  accent: '#cd853f', // Soft bronze - meditative and warm
  text: '#f5f5dc', // Warm beige - softer than pure white
  input: '#1a1a1a',
  placeholder: '#a0a0a0',
};

export const lightTheme: Theme = {
  background: '#fefefe',
  surface: '#f9f7f4',
  primary: '#b8860b', // Darker gold for light theme
  accent: '#8b4513', // Saddle brown - earthy and grounding
  text: '#2c2c2c', // Soft dark gray
  input: '#f9f7f4',
  placeholder: '#7a7a7a',
};