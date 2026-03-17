import React, { useMemo } from 'react';
import { BarChart3, Package, Plane } from 'lucide-react';
import {
  AIRLINE_COLORS,
  GSSA_GROUP_LABELS,
  type FlightSchedule,
  type AirlineInfo,
  type GssaGroup,
} from '@/config/flight-schedules';

export interface CargoCapacityWidgetProps {
  schedules: FlightSchedule[];
  airlines: AirlineInfo[];
  gssaFilter: GssaGroup | 'all';
  language: string;
}

export const CargoCapacityWidget: React.FC<CargoCapacityWidgetProps> = ({
  schedules,
  airlines,
  gssaFilter,
  language,
}) => {
  const isKo = language === 'ko';

  const airlineStats = useMemo(() => {
    const stats: {
      code: string;
      name: string;
      nameKo: string;
      logo: string;
      gssaGroup: GssaGroup;
      weeklyFlights: number;
      weeklyCapacityKg: number;
      monthlyCapacityKg: number;
      cargoFlights: number;
      paxFlights: number;
      suspended: boolean;
    }[] = [];

    airlines.forEach((airline) => {
      const airlineSchedules = schedules.filter((s) => s.airlineCode === airline.code);
      if (airlineSchedules.length === 0) return;

      let weeklyFlights = 0;
      let weeklyCapacityKg = 0;
      let cargoFlights = 0;
      let paxFlights = 0;
      let hasSuspended = false;

      airlineSchedules.forEach((s) => {
        const isSusp = s.remarks?.toLowerCase().includes('suspended');
        if (isSusp) {
          hasSuspended = true;
          return;
        }
        const flightsPerWeek = s.departureDays.length;
        weeklyFlights += flightsPerWeek;
        weeklyCapacityKg += flightsPerWeek * s.maxCargoKg;
        if (s.flightType === 'cargo') cargoFlights += flightsPerWeek;
        else paxFlights += flightsPerWeek;
      });

      stats.push({
        code: airline.code,
        name: airline.name,
        nameKo: airline.nameKo,
        logo: airline.logo,
        gssaGroup: airline.gssaGroup,
        weeklyFlights,
        weeklyCapacityKg,
        monthlyCapacityKg: weeklyCapacityKg * 4,
        cargoFlights,
        paxFlights,
        suspended: hasSuspended && weeklyFlights === 0,
      });
    });

    return stats.sort((a, b) => b.weeklyCapacityKg - a.weeklyCapacityKg);
  }, [schedules, airlines]);

  const totalWeeklyFlights = airlineStats.reduce((s, a) => s + a.weeklyFlights, 0);
  const totalWeeklyKg = airlineStats.reduce((s, a) => s + a.weeklyCapacityKg, 0);
  const totalMonthlyKg = totalWeeklyKg * 4;
  const maxCapacity = Math.max(...airlineStats.map((a) => a.weeklyCapacityKg), 1);

  const formatTons = (kg: number) => {
    if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)}K t`;
    if (kg >= 1000) return `${(kg / 1000).toFixed(0)} t`;
    return `${kg.toLocaleString()} kg`;
  };

  const gssaLabel =
    gssaFilter === 'all'
      ? isKo
        ? '전체 GSSA'
        : 'All GSSA'
      : GSSA_GROUP_LABELS[gssaFilter][isKo ? 'ko' : 'en'];

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 bg-gradient-to-r from-jways-50 to-blue-50 dark:from-jways-900/20 dark:to-blue-900/20 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4.5 h-4.5 text-jways-600 dark:text-jways-400" />
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {isKo ? '항공사별 화물량 현황' : 'Cargo Capacity by Airline'}
            </h3>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">({gssaLabel})</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {isKo ? '주간 운항' : 'Weekly Flights'}
          </p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{totalWeeklyFlights}</p>
          <p className="text-[10px] text-gray-400">{isKo ? '편/주' : 'flights/wk'}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {isKo ? '주간 화물량' : 'Weekly Capacity'}
          </p>
          <p className="text-xl font-bold text-jways-600 dark:text-jways-400 mt-0.5">{formatTons(totalWeeklyKg)}</p>
          <p className="text-[10px] text-gray-400">{isKo ? '최대 적재량' : 'max payload'}</p>
        </div>
        <div className="px-4 py-3 text-center">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {isKo ? '월간 화물량' : 'Monthly Capacity'}
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatTons(totalMonthlyKg)}</p>
          <p className="text-[10px] text-gray-400">{isKo ? '예상 (×4주)' : 'est. (×4wk)'}</p>
        </div>
      </div>

      {/* Per-Airline Bars */}
      <div className="px-5 py-3 space-y-2">
        {airlineStats.map((stat) => {
          const colors = AIRLINE_COLORS[stat.code] || {
            badge: 'bg-gray-100 text-gray-600',
            text: 'text-gray-700 dark:text-gray-300',
          };
          const pct = stat.weeklyCapacityKg > 0 ? (stat.weeklyCapacityKg / maxCapacity) * 100 : 0;
          const gssaBadge = GSSA_GROUP_LABELS[stat.gssaGroup].badge;

          return (
            <div key={stat.code} className={`${stat.suspended ? 'opacity-40' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm">{stat.logo}</span>
                  <span className={`text-xs font-bold ${colors.text}`}>{stat.code}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {isKo ? stat.nameKo : stat.name}
                  </span>
                  <span className={`text-[7px] font-bold px-1 py-0.5 rounded border ${gssaBadge}`}>
                    {stat.gssaGroup === 'goodman' ? 'GLS' : 'GAC'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-[10px]">
                  <span className="text-gray-500 dark:text-gray-400">
                    {stat.weeklyFlights}
                    {isKo ? '편' : 'flt'}/wk
                  </span>
                  {stat.cargoFlights > 0 && (
                    <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400">
                      <Package className="w-2.5 h-2.5" />
                      {stat.cargoFlights}
                    </span>
                  )}
                  {stat.paxFlights > 0 && (
                    <span className="flex items-center gap-0.5 text-gray-400">
                      <Plane className="w-2.5 h-2.5" />
                      {stat.paxFlights}
                    </span>
                  )}
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-[50px] text-right">
                    {formatTons(stat.weeklyCapacityKg)}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stat.suspended
                      ? 'bg-red-300 dark:bg-red-700'
                      : stat.cargoFlights > 0
                        ? 'bg-jways-500 dark:bg-jways-400'
                        : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
        {airlineStats.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">{isKo ? '해당 항공편 없음' : 'No flights'}</p>
        )}
      </div>
    </div>
  );
};
