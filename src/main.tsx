import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { pedirArmazenamentoPersistente } from './lib/storage';

// Pede ao navegador para não apagar os dados locais por falta de espaço.
void pedirArmazenamentoPersistente();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
