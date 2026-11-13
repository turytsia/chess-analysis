import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import analysis from './namespaces/en-analysis.json';
import library from './namespaces/en-library.json';
import trainer from './namespaces/en-trainer.json';
import translation from './namespaces/en-translation.json';

const MAIN_NAMESPACE = 'translation';

export function initializeI18n(): void {
  i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: MAIN_NAMESPACE,
    fallbackNS: MAIN_NAMESPACE,
    resources: { en: { translation, library, analysis, trainer } },
    interpolation: { escapeValue: false },
  });
}
