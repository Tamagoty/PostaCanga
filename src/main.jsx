// Arquivo: src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext';
import AuthProvider from './context/AuthContext';
import './theme.css';

// Lógica para definir o favicon dinamicamente a partir das variáveis de ambiente
const faviconUrl = import.meta.env.VITE_FAVICON_URL;
if (faviconUrl) {
  const link = document.getElementById('favicon');
  if (link) {
    link.href = faviconUrl;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
