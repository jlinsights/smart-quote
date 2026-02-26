import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import { WelcomeBanner } from '@/features/dashboard/components/WelcomeBanner';
import { QuoteHistoryCompact } from '@/features/dashboard/components/QuoteHistoryCompact';
import { WeatherWidget } from '@/features/quote/components/widgets/WeatherWidget';
import { NoticeWidget } from '@/features/quote/components/widgets/NoticeWidget';

const CustomerDashboard: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-jways-950 transition-colors duration-200">
      {/* Unified App Header - consistent with /quote page */}
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

          {/* Right Column: Recent Quotes */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-jways-800 rounded-2xl shadow-sm border border-gray-100 dark:border-jways-700 overflow-hidden transition-colors duration-200">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
