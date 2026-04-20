export interface GuideItem {
  title: string;
  description: string;
  adminOnly?: boolean;
}

export interface GuideSection {
  title: string;
  items: GuideItem[];
}

export interface GuideTranslation {
  pageTitle: string;
  tocTitle: string;
  adminBadge: string;
  memberBadge: string;
  tipLabel: string;
  noteLabel: string;
  shortcutLabel: string;
  screenshotPlaceholder: string;
  sections: {
    gettingStarted: GuideSection;
    dashboard: GuideSection;
    quoteCalculator: GuideSection;
    savingQuotes: GuideSection;
    pdfExport: GuideSection;
    quoteHistory: GuideSection;
    accountSettings: GuideSection;
    adminOverview: GuideSection;
    marginRules: GuideSection;
    fscManagement: GuideSection;
    surchargeManagement: GuideSection;
    customerManagement: GuideSection;
    userManagement: GuideSection;
    rateTableViewer: GuideSection;
    auditLog: GuideSection;
  };
}

import type { Language } from '@/i18n/translations';
import { ko } from './locales/ko';
import { en } from './locales/en';
import { cn } from './locales/cn';
import { ja } from './locales/ja';

export const guideTranslations: Record<Language, GuideTranslation> = {
  en,
  ko,
  cn,
  ja,
};
