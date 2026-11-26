import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import './index.css';

// Minimal, dependency-free routing: the private dashboard lives at /admin.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isAdminRoute = path === '/admin' || path.startsWith('/admin/');

// Keep the focused form control visible above the on-screen keyboard.
//
// Mobile browsers shrink the *visual* viewport when the keyboard opens, which
// can hide the field the user is typing into (especially inside bottom-sheet
// modals). After the keyboard finishes animating, scroll the field into view
// when it is not fully visible.
if (typeof window !== 'undefined') {
  document.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || !/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

    window.setTimeout(() => {
      if (!target.isConnected) return;
      const rect = target.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      if (rect.top < 0 || rect.bottom > viewportHeight) {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
    }, 300);
  });
}

createRoot(document.getElementById('root')!).render(isAdminRoute ? <AdminApp /> : <App />);
