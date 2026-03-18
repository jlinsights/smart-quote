import React, { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import {
  Plane, MapPin,
  Filter, ChevronDown, ChevronUp, Plus,
  RotateCcw, Settings,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { FlightTable } from '@/features/schedule/components/FlightTable';
import {
  DAY_LABELS,
  DAY_LABELS_KO,
  GSSA_GROUP_LABELS,
  getAirlineColors,
  type FlightSchedule,
  type AirlineInfo,
  type GssaGroup,
} from '@/config/flight-schedules';
import { useFlightSchedules } from '@/features/schedule/useFlightSchedules';
import { CargoCapacityWidget } from '@/features/schedule/components/CargoCapacityWidget';
import { FlightFormModal } from '@/features/schedule/components/FlightFormModal';
import { AirlineFormModal } from '@/features/schedule/components/AirlineFormModal';

const RouteMap3D = React.lazy(() => import('@/features/schedule/RouteMap3D'));

type FlightTypeFilter = 'all' | 'cargo' | 'passenger';

const EMPTY_FORM: Omit<FlightSchedule, 'id'> = {
  airline: '',
  airlineCode: '',
  flightNo: '',
  aircraftType: '',
  flightType: 'cargo',
  origin: 'ICN',
  destination: '',
  departureDays: [],
  departureTime: '',
  arrivalTime: '',
  flightDuration: '',
  maxCargoKg: 0,
  remarks: '',
};

/* ------------------------------------------------------------------ */
/*  FlightSchedulePage                                                 */
/* ------------------------------------------------------------------ */
const FlightSchedulePage: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const {
    schedules, airlines,
    addSchedule, updateSchedule, deleteSchedule,
    addAirline, resetToDefaults, isCustomized,
  } = useFlightSchedules();

  const [selectedAirline, setSelectedAirline] = useState<string>('all');
  const [gssaFilter, setGssaFilter] = useState<GssaGroup | 'all'>('all');
  const [flightTypeFilter, setFlightTypeFilter] = useState<FlightTypeFilter>('all');
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [expandedAirlines, setExpandedAirlines] = useState<Set<string>>(new Set());
  const [isMobileView, setIsMobileView] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showAirlineModal, setShowAirlineModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<FlightSchedule | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const dayLabels = language === 'ko' ? DAY_LABELS_KO : DAY_LABELS;

  // Airlines filtered by GSSA group
  const filteredAirlines = useMemo(() => {
    if (gssaFilter === 'all') return airlines;
    return airlines.filter((a) => a.gssaGroup === gssaFilter);
  }, [airlines, gssaFilter]);

  const filteredSchedules = useMemo(() => {
    let filtered = [...schedules];

    if (gssaFilter !== 'all') {
      const airlineCodes = filteredAirlines.map((a) => a.code);
      filtered = filtered.filter((s) => airlineCodes.includes(s.airlineCode));
    }
    if (selectedAirline !== 'all') {
      filtered = filtered.filter((s) => s.airlineCode === selectedAirline);
    }
    if (flightTypeFilter !== 'all') {
      filtered = filtered.filter((s) => s.flightType === flightTypeFilter);
    }
    if (dayFilter !== null) {
      filtered = filtered.filter((s) => s.departureDays.includes(dayFilter));
    }

    filtered.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
    return filtered;
  }, [schedules, selectedAirline, gssaFilter, filteredAirlines, flightTypeFilter, dayFilter]);

  const toggleAirlineCard = useCallback((code: string) => {
    setExpandedAirlines((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }, []);

  const handleAirlineCardClick = useCallback((code: string) => {
    setSelectedAirline((prev) => (prev === code ? 'all' : code));
  }, []);

  const handleAddFlight = useCallback(() => {
    setEditingSchedule(null);
    setShowFlightModal(true);
  }, []);

  const handleEditFlight = useCallback((schedule: FlightSchedule) => {
    setEditingSchedule(schedule);
    setShowFlightModal(true);
  }, []);

  const handleSaveFlight = useCallback((data: Omit<FlightSchedule, 'id'>) => {
    if (editingSchedule) {
      updateSchedule(editingSchedule.id, data);
    } else {
      addSchedule(data);
    }
    setShowFlightModal(false);
    setEditingSchedule(null);
  }, [editingSchedule, updateSchedule, addSchedule]);

  const handleDeleteFlight = useCallback((id: string) => {
    deleteSchedule(id);
    setConfirmDeleteId(null);
  }, [deleteSchedule]);

  const handleReset = useCallback(() => {
    if (window.confirm(t('schedule.resetConfirm'))) {
      resetToDefaults();
    }
  }, [resetToDefaults, t]);

  const handleSaveAirline = useCallback((airline: AirlineInfo) => {
    addAirline(airline);
    setShowAirlineModal(false);
  }, [addAirline]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-6 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-jways-50 dark:bg-jways-900/30 rounded-lg">
                <Plane className="w-6 h-6 text-jways-600 dark:text-jways-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {t('schedule.title')}
                  </h1>
                  {isCustomized && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      {t('schedule.customized')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {t('schedule.subtitle')}
                </p>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {editMode && isCustomized && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('schedule.resetDefaults')}</span>
                  </button>
                )}
                <button
                  onClick={() => setEditMode((p) => !p)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    editMode
                      ? 'bg-jways-500 text-white hover:bg-jways-600 shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('schedule.manage')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Edit Mode Action Bar */}
        {editMode && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleAddFlight}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-jways-500 text-white hover:bg-jways-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {t('schedule.addFlight')}
            </button>
            <button
              onClick={() => setShowAirlineModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('schedule.addAirline')}
            </button>
          </div>
        )}

        {/* 3D Route Map */}
        <Suspense
          fallback={
            <div className="rounded-2xl bg-slate-900 flex items-center justify-center" style={{ height: '500px' }}>
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white" />
            </div>
          }
        >
          <RouteMap3D
            schedules={filteredSchedules}
            airlines={filteredAirlines}
            selectedAirline={selectedAirline}
            onAirlineSelect={(code) => setSelectedAirline(prev => prev === code ? 'all' : code)}
            language={language}
          />
        </Suspense>

        {/* GSSA Group Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">GSSA:</span>
          {(['all', 'goodman', 'gac'] as const).map((group) => {
            const isActive = gssaFilter === group;
            const label = group === 'all'
              ? t('schedule.filterAll')
              : GSSA_GROUP_LABELS[group][language === 'ko' ? 'ko' : 'en'];
            const badgeClass = group === 'all'
              ? (isActive ? 'bg-gray-700 text-white dark:bg-gray-200 dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400')
              : (isActive ? GSSA_GROUP_LABELS[group].badge + ' ring-2 ring-offset-1 ring-current' : 'border ' + GSSA_GROUP_LABELS[group].badge + ' opacity-60');
            return (
              <button
                key={group}
                onClick={() => { setGssaFilter(group); setSelectedAirline('all'); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${badgeClass}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Cargo Capacity Summary Widget */}
        <CargoCapacityWidget
          schedules={filteredSchedules}
          airlines={filteredAirlines}
          gssaFilter={gssaFilter}
          language={language}
        />

        {/* Airline Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {filteredAirlines.map((airline) => {
            const colors = getAirlineColors(airline.code);
            const isSelected = selectedAirline === airline.code;
            const isExpanded = expandedAirlines.has(airline.code);
            const flightCount = schedules.filter(
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
                      <span className={`inline-block mt-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${GSSA_GROUP_LABELS[airline.gssaGroup].badge}`}>
                        {airline.gssaGroup === 'goodman' ? 'GLS' : 'GAC'}
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
            {t('schedule.filters')}
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <select
                value={selectedAirline}
                onChange={(e) => setSelectedAirline(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:ring-jways-500 focus:border-jways-500 transition-colors"
              >
                <option value="all">{t('schedule.filterAll')}</option>
                {airlines.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {language === 'ko' ? a.nameKo : a.name}
                  </option>
                ))}
              </select>
            </div>
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
        <FlightTable
          schedules={filteredSchedules}
          isMobileView={isMobileView}
          editMode={editMode}
          dayLabels={dayLabels}
          t={t}
          onEditFlight={handleEditFlight}
          onRequestDelete={setConfirmDeleteId}
        />

        {/* Summary */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 transition-colors duration-200">
          <span className="font-medium">{filteredSchedules.length} {t('schedule.flightsShown')}</span>
          <span>&middot;</span>
          <span>{airlines.length} GSSA {t('schedule.airline').toLowerCase()}</span>
          <span>&middot;</span>
          <span>{t('schedule.timezoneNote')}</span>
        </div>
      </div>

      {/* Flight Form Modal */}
      {showFlightModal && (
        <FlightFormModal
          schedule={editingSchedule ? { ...editingSchedule } : { ...EMPTY_FORM }}
          airlines={airlines}
          title={editingSchedule ? t('schedule.editFlight') : t('schedule.addFlight')}
          onSave={handleSaveFlight}
          onCancel={() => { setShowFlightModal(false); setEditingSchedule(null); }}
          t={t}
          language={language}
        />
      )}

      {/* Airline Form Modal */}
      {showAirlineModal && (
        <AirlineFormModal
          onSave={handleSaveAirline}
          onCancel={() => setShowAirlineModal(false)}
          t={t}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              {t('schedule.confirmDelete')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t('schedule.cancel')}
              </button>
              <button
                onClick={() => handleDeleteFlight(confirmDeleteId)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
              >
                {t('schedule.deleteFlight')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightSchedulePage;
