export interface Theme {
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
  secondaryColor: string;
  inputBackground: string;
  placeholderColor: string;
  buttonBackground: string;
  buttonStopBackground: string;
  modalOverlay: string;
  modalBackground: string;
  languageButtonBackground: string;
  selectedLanguageBackground: string;
  statusBarStyle: 'light-content' | 'dark-content';
}

export const darkTheme: Theme = {
  backgroundColor: '#000',
  textColor: '#fff',
  primaryColor: '#ff4444',
  secondaryColor: '#999',
  inputBackground: '#333',
  placeholderColor: '#666',
  buttonBackground: '#ff4444',
  buttonStopBackground: '#666',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',
  modalBackground: '#222',
  languageButtonBackground: '#333',
  selectedLanguageBackground: '#ff4444',
  statusBarStyle: 'light-content',
};

export const lightTheme: Theme = {
  backgroundColor: '#f8f9fa',
  textColor: '#212529',
  primaryColor: '#dc3545',
  secondaryColor: '#6c757d',
  inputBackground: '#fff',
  placeholderColor: '#adb5bd',
  buttonBackground: '#dc3545',
  buttonStopBackground: '#6c757d',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  modalBackground: '#fff',
  languageButtonBackground: '#e9ecef',
  selectedLanguageBackground: '#dc3545',
  statusBarStyle: 'dark-content',
};