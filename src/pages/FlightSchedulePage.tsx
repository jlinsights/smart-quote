import React, { useState, useMemo } from 'react';
import { Plane, Clock, MapPin, Calendar, Weight, AlertTriangle, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Header } from '@/components/layout/Header';
import {
  FLIGHT_SCHEDULES,
  AIRLINE_INFO,
  AIRLINE_COLORS,
  DAY_LABELS,
  DAY_LABELS_KO,
  type FlightSchedule,
} from '@/config/flight-schedules';

type FlightTypeFilter = 'all' | 'cargo' | 'passenger';

const FlightSchedulePage: React.FC = () => {
  const { t, language } = useLanguage();
  const [selectedAirline, setSelectedAirline] = useState<string>('all');
  const [flightTypeFilter, setFlightTypeFilter] = useState<FlightTypeFilter>('all');
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [expandedAirlines, setExpandedAirlines] = useState<Set<string>>(new Set());
  const [isMobileView] = useState(() => window.innerWidth < 768);

  const dayLabels = language === 'ko' ? DAY_LABELS_KO : DAY_LABELS;

  const filteredSchedules = useMemo(() => {
    let schedules = [...FLIGHT_SCHEDULES];

    if (selectedAirline !== 'all') {
      schedules = schedules.filter((s) => s.airlineCode === selectedAirline);
    }
    if (flightTypeFilter !== 'all') {
      schedules = schedules.filter((s) => s.flightType === flightTypeFilter);
    }
    if (dayFilter !== null) {
      schedules = schedules.filter((s) => s.departureDays.includes(dayFilter));
    }

    // Sort by departure time
    schedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    return schedules;
  }, [selectedAirline, flightTypeFilter, dayFilter]);

  const toggleAirlineCard = (code: string) => {
    setExpandedAirlines((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleAirlineCardClick = (code: string) => {
    setSelectedAirline((prev) => (prev === code ? 'all' : code));
  };

  const isSuspended = (schedule: FlightSchedule) =>
    schedule.remarks?.toLowerCase().includes('suspended');

  const formatCargoWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(0)}t`;
    return `${kg.toLocaleString()}kg`;
  };

  const renderDayDots = (departureDays: number[]) => (
    <div className="flex gap-0.5">
      {DAY_LABELS.map((label, i) => {
        const active = departureDays.includes(i);
        return (
          <span
            key={label}
            className={`w-5 h-5 text-[10px] font-semibold rounded-full flex items-center justify-center ${
              active
                ? 'bg-jways-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
            }`}
          >
            {dayLabels[i].charAt(0)}
          </span>
        );
      })}
    </div>
  );

  const renderFlightTypeBadge = (type: FlightSchedule['flightType']) => {
    if (type === 'cargo') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-jways-100 dark:bg-jways-900/40 text-jways-700 dark:text-jways-300">
          {t('schedule.cargo')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        {t('schedule.passenger')}
      </span>
    );
  };

  const renderStatusBadge = (schedule: FlightSchedule) => {
    if (isSuspended(schedule)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
          <AlertTriangle className="w-3 h-3" />
          {t('schedule.suspended')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
        Active
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-6 transition-colors duration-200">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-jways-50 dark:bg-jways-900/30 rounded-lg">
              <Plane className="w-6 h-6 text-jways-600 dark:text-jways-400" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {t('schedule.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                {t('schedule.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Airline Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {AIRLINE_INFO.map((airline) => {
            const colors = AIRLINE_COLORS[airline.code];
            const isSelected = selectedAirline === airline.code;
            const isExpanded = expandedAirlines.has(airline.code);
            const flightCount = FLIGHT_SCHEDULES.filter(
              (s) => s.airlineCode === airline.code
            ).length;

            return (
              <div
                key={airline.code}
                className={`rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? `${colors.border} ${colors.bg} ring-2 ring-jways-400 dark:ring-jways-600`
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md'
                }`}
              >
                <div
                  className="p-3 flex items-center justify-between"
                  onClick={() => handleAirlineCardClick(airline.code)}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${colors.badge}`}>
                      {flightCount}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAirlineCard(airline.code);
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
          })}
        </div>

        {/* Filter Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 transition-colors duration-200">
          <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            Filters
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Airline Filter */}
            <div>
              <select
                value={selectedAirline}
                onChange={(e) => setSelectedAirline(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:ring-jways-500 focus:border-jways-500 transition-colors"
              >
                <option value="all">{t('schedule.filterAll')}</option>
                {AIRLINE_INFO.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {language === 'ko' ? a.nameKo : a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Flight Type Filter */}
            <div className="flex gap-1">
              {(['all', 'cargo', 'passenger'] as FlightTypeFilter[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFlightTypeFilter(type)}
                  className={`px-3 py-2 text-sm rounded-lg font-medium transition-colors ${
                    flightTypeFilter === type
                      ? 'bg-jways-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type === 'all'
                    ? t('schedule.filterAll')
                    : type === 'cargo'
                      ? t('schedule.cargo')
                      : t('schedule.passenger')}
                </button>
              ))}
            </div>

            {/* Day Filter */}
            <div className="flex gap-1">
              <button
                onClick={() => setDayFilter(null)}
                className={`px-2.5 py-2 text-xs rounded-lg font-medium transition-colors ${
                  dayFilter === null
                    ? 'bg-jways-500 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                All
              </button>
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  onClick={() => setDayFilter((prev) => (prev === i ? null : i))}
                  className={`w-9 py-2 text-xs rounded-lg font-medium transition-colors ${
                    dayFilter === i
                      ? 'bg-jways-500 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {dayLabels[i]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Schedule Table / Cards */}
        {isMobileView ? (
          /* Mobile Card Layout */
          <div className="space-y-3">
            {filteredSchedules.length === 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
                No flights match the current filters.
              </div>
            )}
            {filteredSchedules.map((schedule) => {
              const colors = AIRLINE_COLORS[schedule.airlineCode];
              const suspended = isSuspended(schedule);
              return (
                <div
                  key={schedule.flightNo}
                  className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm transition-colors duration-200 ${
                    suspended ? 'border-red-200 dark:border-red-800 opacity-60' : `${colors.border}`
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Top row: airline + flight type */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${colors.badge}`}>
                          {schedule.airlineCode}
                        </span>
                        <span className={`text-base font-bold ${suspended ? 'line-through text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {schedule.flightNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderFlightTypeBadge(schedule.flightType)}
                        {renderStatusBadge(schedule)}
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {schedule.origin}
                      </span>
                      <Plane className="w-4 h-4 text-jways-500 rotate-45" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {schedule.destination}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">
                        {schedule.aircraftType}
                      </span>
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{t('schedule.departure')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{schedule.departureTime}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{t('schedule.duration')}</p>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-300 flex items-center justify-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {schedule.flightDuration}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">{t('schedule.arrival')}</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{schedule.arrivalTime}</p>
                      </div>
                    </div>

                    {/* Days + Cargo */}
                    <div className="flex items-center justify-between">
                      {renderDayDots(schedule.departureDays)}
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Weight className="w-3 h-3" />
                        <span className="font-semibold">{formatCargoWeight(schedule.maxCargoKg)}</span>
                      </div>
                    </div>

                    {/* Remarks */}
                    {schedule.remarks && (
                      <p className={`text-xs italic ${suspended ? 'text-red-500 dark:text-red-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {schedule.remarks}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Desktop Table */
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Airline
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.flightNo')}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.route')}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.aircraft')}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      {t('schedule.days')}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.departure')}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.arrival')}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.duration')}
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      {t('schedule.maxCargo')}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSchedules.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No flights match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredSchedules.map((schedule) => {
                    const colors = AIRLINE_COLORS[schedule.airlineCode];
                    const suspended = isSuspended(schedule);
                    return (
                      <tr
                        key={schedule.flightNo}
                        className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                          suspended ? 'opacity-50' : ''
                        } ${schedule.flightType === 'cargo' ? `${colors.bg}` : ''}`}
                      >
                        {/* Airline */}
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${colors.badge}`}>
                            {schedule.airlineCode}
                          </span>
                        </td>
                        {/* Flight No */}
                        <td className={`px-4 py-3 font-semibold ${suspended ? 'line-through text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {schedule.flightNo}
                        </td>
                        {/* Route */}
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900 dark:text-white">{schedule.origin}</span>
                          <Plane className="w-3.5 h-3.5 inline mx-1 text-jways-500 -rotate-0" />
                          <span className="font-semibold text-gray-900 dark:text-white">{schedule.destination}</span>
                        </td>
                        {/* Aircraft */}
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                          {schedule.aircraftType}
                        </td>
                        {/* Type */}
                        <td className="px-4 py-3 text-center">
                          {renderFlightTypeBadge(schedule.flightType)}
                        </td>
                        {/* Days */}
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            {renderDayDots(schedule.departureDays)}
                          </div>
                        </td>
                        {/* DEP */}
                        <td className="px-4 py-3 text-center font-mono font-semibold text-gray-900 dark:text-white">
                          {schedule.departureTime}
                        </td>
                        {/* ARR */}
                        <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-gray-300">
                          {schedule.arrivalTime}
                        </td>
                        {/* Duration */}
                        <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          {schedule.flightDuration}
                        </td>
                        {/* Max Cargo */}
                        <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                          <Weight className="w-3 h-3 inline mr-0.5 text-gray-400" />
                          {schedule.maxCargoKg.toLocaleString()} kg
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 text-center">
                          {renderStatusBadge(schedule)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Remarks Footer */}
            {filteredSchedules.some((s) => s.remarks) && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Remarks:</p>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  {filteredSchedules
                    .filter((s) => s.remarks)
                    .map((s) => (
                      <li key={s.flightNo} className={isSuspended(s) ? 'text-red-500 dark:text-red-400' : ''}>
                        <span className="font-medium">{s.flightNo}:</span> {s.remarks}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
          <span className="font-medium">
            {filteredSchedules.length} flights shown
          </span>
          <span>&middot;</span>
          <span>
            {AIRLINE_INFO.length} GSSA airlines
          </span>
          <span>&middot;</span>
          <span>
            All times local (DEP: KST, ARR: destination timezone)
          </span>
        </div>
      </div>
    </div>
  );
};

export default FlightSchedulePage;
