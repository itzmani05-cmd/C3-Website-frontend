import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { ModalProvider } from './components/ui';
import App from './App';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <ModalProvider>
        <App />
        <ToastContainer position="top-right" autoClose={3500} newestOnTop closeOnClick pauseOnHover theme="light" />
      </ModalProvider>
    </BrowserRouter>
  </StrictMode>
);
