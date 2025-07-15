// Arquivo: src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

// Adicionamos a linha abaixo para desativar a regra do linter para esta exportação.
// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext);

const defaultTheme = {
  '--bg-primary': '#1a1d24',
  '--bg-secondary': '#272b35',
  '--bg-tertiary': '#3a404e',
  '--text-primary': '#f0f0f0',
  '--text-secondary': '#a0a0a0',
  '--accent-primary': '#3b82f6',
  '--accent-primary-hover': '#2563eb',
  '--border-color': '#4b5563',
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(defaultTheme);

  useEffect(() => {
    // Aplica as cores do tema ao elemento root do documento
    const root = document.documentElement;
    for (const key in theme) {
      root.style.setProperty(key, theme[key]);
    }
  }, [theme]);

  const applyTheme = (newTheme) => {
    setTheme(newTheme);
  };

  const resetToDefault = () => {
    setTheme(defaultTheme);
  };

  const value = {
    theme,
    applyTheme,
    resetToDefault,
    defaultTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
