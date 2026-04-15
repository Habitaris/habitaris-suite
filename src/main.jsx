import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './global.css'

// Global: enable spellcheck + autocapitalize on all text inputs
const observer = new MutationObserver(() => {
  document.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(el => {
    if (!el.dataset.habGlobal) {
      el.spellcheck = true;
      el.autocapitalize = 'characters';
      el.autocorrect = 'on';
      el.dataset.habGlobal = '1';
    }
  });
});
observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
