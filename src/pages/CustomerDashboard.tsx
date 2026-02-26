import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import { WelcomeBanner } from '@/features/dashboard/components/WelcomeBanner';
import { QuoteHistoryCompact } from '@/features/dashboard/components/QuoteHistoryCompact';
import { WeatherWidget } from '@/features/quote/components/widgets/WeatherWidget';
import { NoticeWidget } from '@/features/quote/components/widgets/NoticeWidget';
import { ExchangeRateWidget } from '@/features/quote/components/widgets/ExchangeRateWidget';
import { AccountManagerWidget } from '@/features/quote/components/widgets/AccountManagerWidget';

const CustomerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Welcome Banner */}
        <WelcomeBanner />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Weather + News */}
          <div className="lg:col-span-2 space-y-0">
            <WeatherWidget />
            <NoticeWidget />
          </div>

          {/* Right Column: Recent Quotes & New Widgets */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-200 flex-shrink-0">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                  <FileText className="w-4 h-4 mr-2 text-jways-500" />
                  {t('dashboard.recentQuotes')}
                </h3>
                <button
                  onClick={() => navigate('/admin')}
                  className="text-xs font-semibold text-jways-600 dark:text-jways-400 hover:text-jways-700 dark:hover:text-jways-300 transition-colors"
                >
                  {t('dashboard.viewAll')}
                </button>
              </div>
              <QuoteHistoryCompact />
            </div>

            {/* Added Widgets to fill vertical space */}
            <div className="flex-1 min-h-[300px]">
              <ExchangeRateWidget />
            </div>
            <div className="flex-shrink-0">
              <AccountManagerWidget />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            &copy; 2025 Goodman GLS & J-Ways. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerDashboard;
