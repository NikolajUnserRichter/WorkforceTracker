import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Note: StrictMode disabled to prevent AbortError with Supabase
// due to double-mounting causing request cancellation
ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
