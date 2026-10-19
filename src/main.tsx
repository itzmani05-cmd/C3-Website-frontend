import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LazyMotion } from 'framer-motion';
import { ToastContainer } from 'react-toastify';
import { ModalProvider } from './components/ui';
import App from './App';
import '@fontsource-variable/inter/wght.css';
import '@fontsource-variable/plus-jakarta-sans/wght.css';
import './index.css';
import 'react-toastify/dist/ReactToastify.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <LazyMotion features={() => import('./lib/motionFeatures').then((mod) => mod.default)}>
        <ModalProvider>
          <App />
          <ToastContainer position="top-right" autoClose={3500} newestOnTop closeOnClick pauseOnHover theme="light" />
        </ModalProvider>
      </LazyMotion>
    </BrowserRouter>
  </StrictMode>
);
