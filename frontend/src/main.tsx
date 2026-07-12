import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useConfigStore } from '@/store/configStore';

// Load config before rendering the app
useConfigStore.getState().load().catch((err) => {
  console.warn('Config load failed, using defaults:', err);
}).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
