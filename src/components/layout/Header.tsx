import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Globe, Moon, Sun, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'ko' : 'en');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white dark:bg-jways-900 border-b border-gray-100 dark:border-jways-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/goodman-gls-logo.png" alt="Goodman GLS" className="h-8 w-auto bg-white rounded-sm" />
              <span className="ml-3 text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                 {t('nav.smartQuote')}
              </span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Toggle */}
            <button
              onClick={handleLanguageToggle}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-jways-600 dark:hover:text-jways-400 hover:bg-gray-50 dark:hover:bg-jways-800 rounded-lg flex items-center space-x-1 transition-all"
              title={language === 'en' ? 'Switch to Korean' : 'Switch to English'}
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium uppercase">{language}</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-jways-600 dark:hover:text-jways-400 hover:bg-gray-50 dark:hover:bg-jways-800 rounded-lg transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="w-px h-6 bg-gray-200 dark:bg-jways-700 mx-2"></div>

            {/* Auth Buttons */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                 <div className="hidden sm:flex flex-col items-end mr-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-jways-600 dark:text-jways-400 font-semibold uppercase tracking-wider">
                        {user?.role}
                    </span>
                 </div>
                 {user?.role === 'admin' && (
                    <Link to="/admin" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-jways-600 dark:hover:text-white bg-jways-50 dark:bg-jways-800 px-3 py-1.5 rounded-md transition-colors hidden sm:block">
                      {t('nav.admin')}
                    </Link>
                 )}
                 <Link to="/dashboard" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-jways-600 dark:hover:text-white transition-colors hidden sm:block">
                   {t('nav.dashboard')}
                 </Link>
                 <button
                    onClick={handleLogout}
                    className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center transition-all"
                    title={t('nav.logout')}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors hidden sm:block">
                  {t('nav.login')}
                </Link>
                <Link to="/signup" className="bg-jways-600 text-white hover:bg-jways-700 px-3 py-2 sm:px-4 rounded-md text-sm font-medium shadow-sm transition-colors">
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
