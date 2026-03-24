import React from 'react';

interface Props {
  variant?: 'admin' | 'default';
}

export const Footer: React.FC<Props> = ({ variant = 'default' }) => (
  <footer className="bg-white dark:bg-gray-950 py-10 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-400">
        &copy; 2026 Goodman GLS &amp; J-Ways. {variant === 'admin' ? 'Internal Use Only.' : 'All rights reserved.'}
      </p>
    </div>
  </footer>
);
