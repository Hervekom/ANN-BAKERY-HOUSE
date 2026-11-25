import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AdminApp from './admin/AdminApp.tsx';
import './index.css';

// Minimal, dependency-free routing: the private dashboard lives at /admin.
const path = window.location.pathname.replace(/\/+$/, '') || '/';
const isAdminRoute = path === '/admin' || path.startsWith('/admin/');

createRoot(document.getElementById('root')!).render(isAdminRoute ? <AdminApp /> : <App />);
