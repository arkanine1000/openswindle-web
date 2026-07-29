import 'i18next';
import type { en } from './locales/en';

// `en` is the source-of-truth shape; `t()` keys are checked against it.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
