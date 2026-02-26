import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export const WelcomeBanner: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-jways-600 to-jways-500 dark:from-jways-800 dark:to-jways-700 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold">
          {t('dashboard.welcome')}, {user?.email?.split('@')[0] || 'Guest'}
        </h1>
        <p className="text-sm text-jways-100 dark:text-jways-300 mt-1">
          {user?.email}
        </p>
      </div>
      <button
        onClick={() => navigate('/quote')}
        className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-jways-800 font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <PlusCircle className="w-5 h-5" />
        {t('dashboard.newQuote')}
      </button>
    </div>
  );
};
