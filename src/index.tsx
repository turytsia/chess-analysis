import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { initializeI18n } from './translations/i18n';
import { initializeTheme } from './utilities/theme';

const ROOT_ELEMENT_ID = 'root';

initializeI18n();
initializeTheme();
renderApp();

function renderApp(): void {
  const container = document.getElementById(ROOT_ELEMENT_ID);
  if (!container) {
    throw new Error('Root element is missing');
  }
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
