import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, AlertTriangle, Info } from 'lucide-react';

export const NoticeWidget: React.FC = () => {
  const { t } = useLanguage();

  const notices = [
    { type: 'alert', title: t('widget.notice.1.title'), date: '2025.02.26', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
    { type: 'info', title: t('widget.notice.2.title'), date: '2025.02.24', icon: <Info className="w-4 h-4 text-blue-500" /> },
    { type: 'promo', title: t('widget.notice.3.title'), date: '2025.02.20', icon: <Bell className="w-4 h-4 text-jways-500" /> },
  ];

  return (
    <div className="bg-white dark:bg-jways-800 rounded-2xl shadow-sm border border-gray-100 dark:border-jways-700 overflow-hidden transition-colors duration-200 mt-6">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                <Bell className="w-4 h-4 mr-2 text-jways-500" />
                {t('widget.notice')}
            </h3>
        </div>
        <div className="p-0">
            <ul className="divide-y divide-gray-100 dark:divide-jways-700">
                {notices.map((notice, idx) => (
                    <li key={idx} className="flex items-start px-5 py-4 hover:bg-gray-50 dark:hover:bg-jways-700/50 transition-colors cursor-pointer group">
                        <div className="mt-0.5 mr-3 flex-shrink-0">
                            {notice.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-jways-600 dark:group-hover:text-jways-400 transition-colors">
                                {notice.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {notice.date}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="px-5 py-3 border-t border-gray-100 dark:border-jways-700 bg-gray-50 dark:bg-gray-700/30">
                <button className="text-xs font-semibold text-jways-600 dark:text-jways-400 w-full text-center hover:text-jways-700 dark:hover:text-jways-300 transition-colors">
                    {t('widget.notice.more')}
                </button>
            </div>
        </div>
    </div>
  );
};
