import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useConfigStore } from '@/store/configStore';

// Load config before rendering the app with timeout and error handling
const loadWithTimeout = async () => {
  try {
    await Promise.race([
      useConfigStore.getState().load(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Config load timeout')), 5000)
      )
    ]);
  } catch (err) {
    console.warn('Config load failed, using defaults:', err);
    // Don't throw - render with defaults
  }
};

loadWithTimeout().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
