import 'i18next';

import type analysis from './namespaces/en-analysis.json';
import type library from './namespaces/en-library.json';
import type trainer from './namespaces/en-trainer.json';
import type translation from './namespaces/en-translation.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    fallbackNS: 'translation';
    resources: {
      translation: typeof translation;
      library: typeof library;
      analysis: typeof analysis;
      trainer: typeof trainer;
    };
  }
}
