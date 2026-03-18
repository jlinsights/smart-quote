import React from 'react';
import {
  Clock, MapPin, Calendar, Weight, AlertTriangle,
  Pencil, Trash2,
} from 'lucide-react';
import {
  DAY_LABELS,
  getAirlineColors,
  formatRoute,
  type FlightSchedule,
} from '@/config/flight-schedules';

export interface FlightTableProps {
  schedules: FlightSchedule[];
  isMobileView: boolean;
  editMode: boolean;
  dayLabels: readonly string[];
  t: (key: string) => string;
  onEditFlight: (schedule: FlightSchedule) => void;
  onRequestDelete: (id: string) => void;
}

const isSuspended = (schedule: FlightSchedule) =>
  schedule.remarks?.toLowerCase().includes('suspended');

const formatCargoWeight = (kg: number) => {
  if (kg >= 1000) return `${(kg / 1000).toFixed(0)}t`;
  return `${kg.toLocaleString()}kg`;
};

const RenderDayDots: React.FC<{ departureDays: number[]; dayLabels: readonly string[] }> = ({ departureDays, dayLabels }) => (
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

const FlightTypeBadge: React.FC<{ type: FlightSchedule['flightType']; t: (key: string) => string }> = ({ type, t }) => {
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

const StatusBadge: React.FC<{ schedule: FlightSchedule; t: (key: string) => string }> = ({ schedule, t }) => {
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
      {t('schedule.active')}
    </span>
  );
};

const ActionButtons: React.FC<{
  schedule: FlightSchedule;
  editMode: boolean;
  t: (key: string) => string;
  onEdit: (schedule: FlightSchedule) => void;
  onRequestDelete: (id: string) => void;
}> = ({ schedule, editMode, t, onEdit, onRequestDelete }) => {
  if (!editMode) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(schedule); }}
        className="p-1.5 text-gray-400 hover:text-jways-500 dark:hover:text-jways-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={t('schedule.editFlight')}
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onRequestDelete(schedule.id); }}
        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title={t('schedule.deleteFlight')}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Mobile Card View                                                   */
/* ------------------------------------------------------------------ */

const MobileCardView: React.FC<FlightTableProps> = ({
  schedules, editMode, dayLabels, t, onEditFlight, onRequestDelete,
}) => (
  <div className="space-y-3">
    {schedules.length === 0 && (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
        {t('schedule.noFlightsMatch')}
      </div>
    )}
    {schedules.map((schedule) => {
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
                <FlightTypeBadge type={schedule.flightType} t={t} />
                <StatusBadge schedule={schedule} t={t} />
                <ActionButtons schedule={schedule} editMode={editMode} t={t} onEdit={onEditFlight} onRequestDelete={onRequestDelete} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-semibold text-gray-900 dark:text-white">{formatRoute(schedule)}</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs ml-auto">{schedule.aircraftType}</span>
            </div>
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
            <div className="flex items-center justify-between">
              <RenderDayDots departureDays={schedule.departureDays} dayLabels={dayLabels} />
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Weight className="w-3 h-3" />
                <span className="font-semibold">{formatCargoWeight(schedule.maxCargoKg)}</span>
              </div>
            </div>
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
);

/* ------------------------------------------------------------------ */
/*  Desktop Table View                                                 */
/* ------------------------------------------------------------------ */

const DesktopTableView: React.FC<FlightTableProps> = ({
  schedules, editMode, dayLabels, t, onEditFlight, onRequestDelete,
}) => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors duration-200">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
            <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.airline')}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.flightNo')}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.route')}</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.aircraft')}</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.type')}</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />{t('schedule.days')}
            </th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.departure')}</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.arrival')}</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.duration')}</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.maxCargo')}</th>
            <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">{t('schedule.status')}</th>
            {editMode && (
              <th className="text-center px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider w-20">{t('admin.actions')}</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {schedules.length === 0 && (
            <tr>
              <td colSpan={editMode ? 12 : 11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {t('schedule.noFlightsMatch')}
              </td>
            </tr>
          )}
          {schedules.map((schedule) => {
            const colors = getAirlineColors(schedule.airlineCode);
            const suspended = isSuspended(schedule);
            return (
              <tr
                key={schedule.id}
                className={`transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                  suspended ? 'opacity-50' : ''
                } ${schedule.flightType === 'cargo' ? `${colors.bg}` : ''}`}
              >
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${colors.badge}`}>{schedule.airlineCode}</span>
                </td>
                <td className={`px-4 py-3 font-semibold ${suspended ? 'line-through text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {schedule.flightNo}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">{formatRoute(schedule)}</span>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{schedule.aircraftType}</td>
                <td className="px-4 py-3 text-center"><FlightTypeBadge type={schedule.flightType} t={t} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-center"><RenderDayDots departureDays={schedule.departureDays} dayLabels={dayLabels} /></div>
                </td>
                <td className="px-4 py-3 text-center font-mono font-semibold text-gray-900 dark:text-white">{schedule.departureTime}</td>
                <td className="px-4 py-3 text-center font-mono text-gray-600 dark:text-gray-300">{schedule.arrivalTime}</td>
                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                  <Clock className="w-3 h-3 inline mr-0.5" />{schedule.flightDuration}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">
                  <Weight className="w-3 h-3 inline mr-0.5 text-gray-400" />{schedule.maxCargoKg.toLocaleString()} kg
                </td>
                <td className="px-4 py-3 text-center"><StatusBadge schedule={schedule} t={t} /></td>
                {editMode && (
                  <td className="px-4 py-3 text-center">
                    <ActionButtons schedule={schedule} editMode={editMode} t={t} onEdit={onEditFlight} onRequestDelete={onRequestDelete} />
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {schedules.some((s) => s.remarks) && (
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">{t('schedule.remarksLabel')}</p>
        <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          {schedules
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
);

/* ------------------------------------------------------------------ */
/*  FlightTable — Public Component                                     */
/* ------------------------------------------------------------------ */

export const FlightTable: React.FC<FlightTableProps> = (props) => {
  return props.isMobileView
    ? <MobileCardView {...props} />
    : <DesktopTableView {...props} />;
};
