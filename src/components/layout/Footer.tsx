import React from 'react';

export const Footer: React.FC = () => (
  <footer className="bg-gray-100 dark:bg-gray-900 py-8 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200">
    <div className="max-w-7xl mx-auto px-4 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} BridgeLogis by Goodman GLS. Bridging Your Cargo to the World. All rights reserved.
      </p>
    </div>
  </footer>
);
