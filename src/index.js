import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { BACKEND_URL } from './config';
import App from './App';

// Configure axios base URL
axios.defaults.baseURL = BACKEND_URL;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
