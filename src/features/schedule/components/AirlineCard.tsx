import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  GSSA_GROUP_LABELS,
  getAirlineColors,
  type AirlineInfo,
  type FlightSchedule,
} from '@/config/flight-schedules';

interface AirlineCardProps {
  airline: AirlineInfo;
  schedules: FlightSchedule[];
  isSelected: boolean;
  isExpanded: boolean;
  language: string;
  onCardClick: (code: string) => void;
  onToggleExpand: (code: string) => void;
}

export const AirlineCard: React.FC<AirlineCardProps> = ({
  airline,
  schedules,
  isSelected,
  isExpanded,
  language,
  onCardClick,
  onToggleExpand,
}) => {
  const colors = getAirlineColors(airline.code);
  const flightCount = schedules.filter(
    (s) => s.airlineCode === airline.code
  ).length;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? `${colors.border} ${colors.bg} ring-2 ring-jways-400 dark:ring-jways-600`
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md'
      }`}
    >
      <div
        className="p-3 flex items-center justify-between"
        onClick={() => onCardClick(airline.code)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{airline.logo}</span>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate ${isSelected ? colors.text : 'text-gray-900 dark:text-white'}`}>
              {airline.code}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {language === 'ko' ? airline.nameKo : airline.name}
            </p>
            <span className={`inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${GSSA_GROUP_LABELS[airline.gssaGroup].badge}`}>
              {GSSA_GROUP_LABELS[airline.gssaGroup][language === 'ko' ? 'ko' : 'en']}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
            {flightCount}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(airline.code);
            }}
            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 text-xs space-y-1 border-t border-gray-100 dark:border-gray-700/50 mt-0">
          <div className="pt-2 space-y-1">
            <p className="text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">{airline.country}</span> &middot; {airline.hubCity}
            </p>
            <p className="text-gray-500 dark:text-gray-400">{airline.contractType}</p>
          </div>
        </div>
      )}
    </div>
  );
};
