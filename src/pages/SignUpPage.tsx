import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Header } from '../components/layout/Header';
import { ShieldCheck } from 'lucide-react';

export const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const { signup } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
        setError(t('auth.passwordsNotMatch'));
        return;
    }

    if (email.trim() && password.trim()) {
      const success = signup(email.trim(), password.trim());
      if (success) {
         // Normal users always go to dashboard
         navigate('/dashboard', { replace: true });
      } else {
        setError(t('auth.emailExists'));
      }
    } else {
      setError(t('auth.fillAll'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-jways-900 transition-colors duration-200">
      <Header />
      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Link to="/" className="flex justify-center mb-6 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            {t('auth.backHome')}
          </Link>
          <div className="flex justify-center">
              <div className="w-16 h-16 bg-jways-600 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-white" />
              </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.signupTitle')}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-jways-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-jways-700 transition-colors duration-200">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                      {error}
                  </div>
              )}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.email')}
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-jways-600 rounded-md shadow-sm placeholder-gray-400 dark:bg-jways-700 dark:text-white focus:outline-none focus:ring-jways-500 focus:border-jways-500 sm:text-sm transition-colors"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.password')}
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-jways-600 rounded-md shadow-sm placeholder-gray-400 dark:bg-jways-700 dark:text-white focus:outline-none focus:ring-jways-500 focus:border-jways-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.confirmPassword')}
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-jways-600 rounded-md shadow-sm placeholder-gray-400 dark:bg-jways-700 dark:text-white focus:outline-none focus:ring-jways-500 focus:border-jways-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-jways-600 hover:bg-jways-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-jways-500 transition-colors"
                >
                  {t('auth.signup')}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('auth.haveAccount')}{' '}
                <Link to="/login" className="font-medium text-jways-600 hover:text-jways-500 dark:text-jways-400 dark:hover:text-jways-300 transition-colors">
                  {t('nav.login')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
