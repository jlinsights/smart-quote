export type Language = 'en' | 'ko' | 'cn' | 'ja';

import { ko } from './locales/ko';
import { en } from './locales/en';
import { cn } from './locales/cn';
import { ja } from './locales/ja';

export const translations: Record<Language, Record<string, string>> = {
  en,
  ko,
  cn,
  ja,
};
