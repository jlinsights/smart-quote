import React, { useState, useMemo, useCallback } from 'react';
import {
  Plane, Clock, MapPin, Calendar, Weight, AlertTriangle,
  Filter, ChevronDown, ChevronUp, Pencil, Trash2, Plus,
  RotateCcw, Settings, X,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import {
  AIRLINE_COLORS,
  DAY_LABELS,
  DAY_LABELS_KO,
  GSSA_GROUP_LABELS,
  type FlightSchedule,
  type AirlineInfo,
  type GssaGroup,
} from '@/config/flight-schedules';
import { useFlightSchedules } from '@/features/schedule/useFlightSchedules';

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

const EMPTY_AIRLINE: AirlineInfo = {
  code: '',
  name: '',
  nameKo: '',
  logo: '',
  country: '',
  hubCity: '',
  contractType: '',
  gssaGroup: 'goodman',
};

/* ------------------------------------------------------------------ */
/*  FlightFormModal                                                    */
/* ------------------------------------------------------------------ */
interface FlightFormModalProps {
  schedule: Omit<FlightSchedule, 'id'>;
  airlines: AirlineInfo[];
  title: string;
  onSave: (data: Omit<FlightSchedule, 'id'>) => void;
  onCancel: () => void;
  t: (key: string) => string;
  language: string;
}

const FlightFormModal: React.FC<FlightFormModalProps> = ({
  schedule, airlines, title, onSave, onCancel, t, language,
}) => {
  const [form, setForm] = useState<Omit<FlightSchedule, 'id'>>(schedule);

  const handleDayToggle = (day: number) => {
    setForm((prev) => ({
      ...prev,
      departureDays: prev.departureDays.includes(day)
        ? prev.departureDays.filter((d) => d !== day)
        : [...prev.departureDays, day].sort((a, b) => a - b),
    }));
  };

  const handleAirlineChange = (code: string) => {
    const info = airlines.find((a) => a.code === code);
    setForm((prev) => ({
      ...prev,
      airlineCode: code,
      airline: info ? info.name : prev.airline,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const dayLabels = language === 'ko' ? DAY_LABELS_KO : DAY_LABELS;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Airline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.airlineCode')}
            </label>
            <select
              value={form.airlineCode}
              onChange={(e) => handleAirlineChange(e.target.value)}
              required
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            >
              <option value="">--</option>
              {airlines.map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} — {language === 'ko' ? a.nameKo : a.name}
                </option>
              ))}
            </select>
          </div>
          {/* Flight No */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.flightNo')}
            </label>
            <input
              type="text"
              value={form.flightNo}
              onChange={(e) => setForm((p) => ({ ...p, flightNo: e.target.value }))}
              required
              placeholder="e.g. WS 7701"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          {/* Aircraft Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.aircraftType')}
            </label>
            <input
              type="text"
              value={form.aircraftType}
              onChange={(e) => setForm((p) => ({ ...p, aircraftType: e.target.value }))}
              required
              placeholder="e.g. B737-800BCF"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          {/* Flight Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.flightType')}
            </label>
            <div className="flex gap-3">
              {(['cargo', 'passenger', 'combi'] as const).map((ft) => (
                <label key={ft} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="flightType"
                    value={ft}
                    checked={form.flightType === ft}
                    onChange={() => setForm((p) => ({ ...p, flightType: ft }))}
                    className="accent-jways-500"
                  />
                  {ft === 'cargo' ? t('schedule.cargo') : ft === 'passenger' ? t('schedule.passenger') : t('schedule.combi')}
                </label>
              ))}
            </div>
          </div>
          {/* Origin / Destination */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.origin')}
              </label>
              <input
                type="text"
                value={form.origin}
                onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value.toUpperCase() }))}
                required
                maxLength={3}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.destination')}
              </label>
              <input
                type="text"
                value={form.destination}
                onChange={(e) => setForm((p) => ({ ...p, destination: e.target.value.toUpperCase() }))}
                required
                maxLength={3}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
          </div>
          {/* Departure Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.departureDays')}
            </label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleDayToggle(i)}
                  className={`w-9 h-9 text-xs font-semibold rounded-full transition-colors ${
                    form.departureDays.includes(i)
                      ? 'bg-jways-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {dayLabels[i]}
                </button>
              ))}
            </div>
          </div>
          {/* Times */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.departureTime')}
              </label>
              <input
                type="time"
                value={form.departureTime}
                onChange={(e) => setForm((p) => ({ ...p, departureTime: e.target.value }))}
                required
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.arrivalTime')}
              </label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={(e) => setForm((p) => ({ ...p, arrivalTime: e.target.value }))}
                required
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.flightDuration')}
              </label>
              <input
                type="text"
                value={form.flightDuration}
                onChange={(e) => setForm((p) => ({ ...p, flightDuration: e.target.value }))}
                required
                placeholder="e.g. 10h 30m"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
          </div>
          {/* Max Cargo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.maxCargoKg')}
            </label>
            <input
              type="number"
              value={form.maxCargoKg || ''}
              onChange={(e) => setForm((p) => ({ ...p, maxCargoKg: parseInt(e.target.value) || 0 }))}
              required
              min={0}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.remarks')}
            </label>
            <input
              type="text"
              value={form.remarks || ''}
              onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('schedule.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-jways-500 text-white hover:bg-jways-600 transition-colors shadow-sm"
            >
              {t('schedule.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  AirlineFormModal                                                   */
/* ------------------------------------------------------------------ */
interface AirlineFormModalProps {
  onSave: (airline: AirlineInfo) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

const AirlineFormModal: React.FC<AirlineFormModalProps> = ({ onSave, onCancel, t }) => {
  const [form, setForm] = useState<AirlineInfo>(EMPTY_AIRLINE);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('schedule.addAirline')}</h2>
          <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('schedule.airlineCode')}
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                required
                maxLength={3}
                placeholder="e.g. WS"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo (emoji)</label>
              <input
                type="text"
                value={form.logo}
                onChange={(e) => setForm((p) => ({ ...p, logo: e.target.value }))}
                placeholder="e.g. flag emoji"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.airlineName')} (EN)
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('schedule.airlineName')} (KO)
            </label>
            <input
              type="text"
              value={form.nameKo}
              onChange={(e) => setForm((p) => ({ ...p, nameKo: e.target.value }))}
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hub City</label>
              <input
                type="text"
                value={form.hubCity}
                onChange={(e) => setForm((p) => ({ ...p, hubCity: e.target.value }))}
                placeholder="e.g. Seoul (ICN)"
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GSSA Group</label>
            <div className="flex gap-2">
              {(['goodman', 'gac'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, gssaGroup: g }))}
                  className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    form.gssaGroup === g
                      ? GSSA_GROUP_LABELS[g].badge + ' ring-2 ring-offset-1 ring-current'
                      : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {GSSA_GROUP_LABELS[g].en}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contract Type</label>
            <input
              type="text"
              value={form.contractType}
              onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value }))}
              placeholder="e.g. GSSA - Cargo Sales Agent"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {t('schedule.cancel')}
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-jways-500 text-white hover:bg-jways-600 transition-colors shadow-sm">
              {t('schedule.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
  const [isMobileView] = useState(() => window.innerWidth < 768);

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

    // GSSA group filter
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

  const isSuspended = (schedule: FlightSchedule) =>
    schedule.remarks?.toLowerCase().includes('suspended');

  const formatCargoWeight = (kg: number) => {
    if (kg >= 1000) return `${(kg / 1000).toFixed(0)}t`;
    return `${kg.toLocaleString()}kg`;
  };

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

  const getAirlineColors = (code: string) =>
    AIRLINE_COLORS[code] || {
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-200 dark:border-gray-800',
      badge: 'bg-gray-100 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300',
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

  const renderActionButtons = (schedule: FlightSchedule) => {
    if (!editMode) return null;
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); handleEditFlight(schedule); }}
          className="p-1.5 text-gray-400 hover:text-jways-500 dark:hover:text-jways-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('schedule.editFlight')}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(schedule.id); }}
          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={t('schedule.deleteFlight')}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

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
            {/* Admin: Manage button */}
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

        {/* GSSA Group Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mr-1">GSSA:</span>
          {(['all', 'goodman', 'gac'] as const).map((group) => {
            const isActive = gssaFilter === group;
            const label = group === 'all'
              ? (language === 'ko' ? '전체' : 'All')
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
                {airlines.map((a) => (
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
              const colors = getAirlineColors(schedule.airlineCode);
              const suspended = isSuspended(schedule);
              return (
                <div
                  key={schedule.id}
                  className={`bg-white dark:bg-gray-900 rounded-xl border shadow-sm transition-colors duration-200 ${
                    suspended ? 'border-red-200 dark:border-red-800 opacity-60' : `${colors.border}`
                  }`}
                >
                  <div className="p-4 space-y-3">
                    {/* Top row: airline + flight type + actions */}
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
                        {renderActionButtons(schedule)}
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
                    {editMode && (
                      <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-20">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSchedules.length === 0 && (
                    <tr>
                      <td colSpan={editMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No flights match the current filters.
                      </td>
                    </tr>
                  )}
                  {filteredSchedules.map((schedule) => {
                    const colors = getAirlineColors(schedule.airlineCode);
                    const suspended = isSuspended(schedule);
                    return (
                      <tr
                        key={schedule.id}
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
                        {/* Actions (edit mode only) */}
                        {editMode && (
                          <td className="px-4 py-3 text-center">
                            {renderActionButtons(schedule)}
                          </td>
                        )}
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
                      <li key={s.id} className={isSuspended(s) ? 'text-red-500 dark:text-red-400' : ''}>
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
            {airlines.length} GSSA airlines
          </span>
          <span>&middot;</span>
          <span>
            All times local (DEP: KST, ARR: destination timezone)
          </span>
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
