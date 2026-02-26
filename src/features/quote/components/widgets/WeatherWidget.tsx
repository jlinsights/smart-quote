import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CloudRain, Sun, Wind, CloudLightning } from 'lucide-react';

export const WeatherWidget: React.FC = () => {
  const { t } = useLanguage();

  const mockWeather = [
    { port: 'US LAX', temp: '18°C', condition: 'Sunny', icon: <Sun className="w-5 h-5 text-amber-500" />, status: 'Normal' },
    { port: 'US JFK', temp: '5°C', condition: 'Rain', icon: <CloudRain className="w-5 h-5 text-blue-500" />, status: 'Delay' },
    { port: 'GER FRA', temp: '2°C', condition: 'Windy', icon: <Wind className="w-5 h-5 text-gray-400" />, status: 'Normal' },
    { port: 'KR ICN', temp: '-2°C', condition: 'Storm', icon: <CloudLightning className="w-5 h-5 text-purple-500" />, status: 'Warning' },
  ];

  return (
    <div className="bg-white dark:bg-jways-800 rounded-2xl shadow-sm border border-gray-100 dark:border-jways-700 overflow-hidden transition-colors duration-200">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30 flex justify-between items-center">
            <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center text-sm">
                <Sun className="w-4 h-4 mr-2 text-jways-500" />
                {t('widget.weather')}
            </h3>
        </div>
        <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
                {mockWeather.map((weather, idx) => (
                    <div key={idx} className="flex flex-col bg-gray-50 dark:bg-jways-900/40 p-3 rounded-xl border border-gray-100 dark:border-jways-700/50">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{weather.port}</span>
                            {weather.icon}
                        </div>
                        <div className="flex justify-between items-end mt-1">
                            <span className="text-lg font-extrabold text-gray-900 dark:text-white">{weather.temp}</span>
                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${weather.status === 'Normal' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : weather.status === 'Delay' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                {weather.status}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 text-center border-t border-gray-100 dark:border-jways-700 pt-3">
                * {t('widget.weather.desc')}
            </p>
        </div>
    </div>
  );
};
