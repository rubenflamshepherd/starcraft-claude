import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { SelectionProvider } from './contexts/SelectionContext';
import { NotificationProvider } from './contexts/NotificationContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NotificationProvider>
      <SelectionProvider>
        <App />
      </SelectionProvider>
    </NotificationProvider>
  </StrictMode>
);
