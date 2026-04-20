export type Language = 'en' | 'ko' | 'cn' | 'ja';

import ko from './locales/ko.json';
import en from './locales/en.json';
import cn from './locales/cn.json';
import ja from './locales/ja.json';

export const translations: Record<Language, Record<string, string>> = {
  en,
  ko,
  cn,
  ja,
};
