import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useLanguage } from '../contexts/LanguageContext';

export const LandingPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-white dark:bg-jways-900 transition-colors duration-200">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <div className="relative bg-gray-50 dark:bg-jways-800 overflow-hidden transition-colors duration-200">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-gray-50 dark:bg-jways-800 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-10 sm:pt-16 lg:pt-20 transition-colors duration-200">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">{t('landing.title.main')}</span>{' '}
                  <span className="block text-jways-600 dark:text-jways-400 xl:inline">{t('landing.title.sub')}</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 dark:text-gray-400 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  {t('landing.subtitle')}
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  <div className="rounded-md shadow">
                    <Link to="/signup" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-jways-600 hover:bg-jways-700 dark:hover:bg-jways-500 md:py-4 md:text-lg md:px-10 transition-colors">
                      {t('landing.getStarted')}
                    </Link>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-3">
                    <Link to="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-jways-700 dark:text-gray-200 bg-jways-100 dark:bg-jways-700 hover:bg-jways-200 dark:hover:bg-gray-700 md:py-4 md:text-lg md:px-10 transition-colors">
                      {t('nav.login')}
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2 transition-colors duration-200">
          <img
            className="h-56 w-full object-cover sm:h-72 md:h-96 lg:w-full lg:h-full"
            src="https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=2000&q=80"
            alt="Air freight logistics and cargo plane"
          />
          <div className="absolute inset-0 bg-jways-900/10 dark:bg-jways-900/40 mix-blend-multiply transition-colors duration-200"></div>
          <div className="hidden lg:block absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-gray-50 dark:from-jways-800 to-transparent transition-colors duration-200"></div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="py-16 bg-white dark:bg-jways-900 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 dark:bg-jways-600 text-white">
                    <Zap className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">{t('landing.instantQuotes')}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                  {t('landing.instantQuotes.desc')}
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 dark:bg-jways-600 text-white">
                    <TrendingUp className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">{t('landing.accurateBreakdown')}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                  {t('landing.accurateBreakdown.desc')}
                </dd>
              </div>

              <div className="relative">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-jways-500 dark:bg-jways-600 text-white">
                    <ShieldCheck className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-medium text-gray-900 dark:text-white">{t('landing.verifiedCarriers')}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-500 dark:text-gray-400">
                  {t('landing.verifiedCarriers.desc')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      
      <footer className="bg-gray-50 dark:bg-jways-900/50 py-12 border-t border-gray-200 dark:border-jways-800 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">© 2025 Goodman GLS & J-Ways. All rights reserved.</p>
          </div>
      </footer>
    </div>
  );
};
