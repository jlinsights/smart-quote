import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GSSA_GROUP_LABELS, type AirlineInfo } from '@/config/flight-schedules';

export interface AirlineFormModalProps {
  onSave: (airline: AirlineInfo) => void;
  onCancel: () => void;
  t: (key: string) => string;
}

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

export const AirlineFormModal: React.FC<AirlineFormModalProps> = ({ onSave, onCancel, t }) => {
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.form.logo')}</label>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.form.country')}</label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.form.hubCity')}</label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.form.gssaGroup')}</label>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('schedule.form.contractType')}</label>
            <input
              type="text"
              value={form.contractType}
              onChange={(e) => setForm((p) => ({ ...p, contractType: e.target.value }))}
              placeholder="e.g. GSSA - Cargo Sales Agent"
              className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2"
            />
          </div>
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
