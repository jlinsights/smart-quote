import React, { createContext, useContext, useState } from 'react';
import { Language, translations } from '../i18n/translations';

// Default language: Korean only for Korea timezone/browser, English for everywhere else
function detectLanguage(): Language {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Seoul') return 'ko';
  } catch { /* ignore */ }

  const browserLang = navigator.language?.split('-')[0]?.toLowerCase();
  if (browserLang === 'ko') return 'ko';

  return 'en';
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  // A simple translation function
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('smartQuoteLanguage') as Language | null;
    if (saved) return saved;
    return detectLanguage();
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('smartQuoteLanguage', lang);
  };

  const t = (key: keyof typeof translations['en']): string => {
    const val = translations[language][key];
    if (val != null) return val;
    const fallback = translations['en'][key];
    if (fallback != null) return fallback;
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
