import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  DAY_LABELS,
  DAY_LABELS_KO,
  type FlightSchedule,
  type AirlineInfo,
} from '@/config/flight-schedules';

export interface FlightFormModalProps {
  schedule: Omit<FlightSchedule, 'id'>;
  airlines: AirlineInfo[];
  title: string;
  onSave: (data: Omit<FlightSchedule, 'id'>) => void;
  onCancel: () => void;
  t: (key: string) => string;
  language: string;
}

export const FlightFormModal: React.FC<FlightFormModalProps> = ({
  schedule,
  airlines,
  title,
  onSave,
  onCancel,
  t,
  language,
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
