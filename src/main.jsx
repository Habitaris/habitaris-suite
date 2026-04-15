import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './global.css'

// Global: enable spellcheck + autocapitalize + uppercase values on all text inputs
document.addEventListener('input', (e) => {
  const el = e.target;
  if ((el.tagName === 'INPUT' && (!el.type || el.type === 'text')) || el.tagName === 'TEXTAREA') {
    // Skip if email-like content or number
    if (el.type === 'email' || el.type === 'password' || el.type === 'number' || el.type === 'date') return;
    // Skip if value looks like an email
    if (el.value.includes('@')) return;
    const pos = el.selectionStart;
    const upper = el.value.toUpperCase();
    if (el.value !== upper) {
      // Trigger React's synthetic change
      const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set || 
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (nativeSet) {
        nativeSet.call(el, upper);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.setSelectionRange(pos, pos);
      }
    }
  }
}, true);
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
