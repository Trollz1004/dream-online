import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { DesignSystemSheet, ShellDemo } from './shell/index.ts';
import './index.css';

function Root() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/+$/, '') : '';
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  if (path === '/shell/design-system' || params.get('shell') === 'design-system') {
    return <DesignSystemSheet />;
  }
  if (path === '/shell' || path === '/shell-demo' || params.get('shell') === '1') {
    return <ShellDemo />;
  }
  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
