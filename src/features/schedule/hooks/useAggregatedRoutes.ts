import { useMemo } from 'react';
import type { FlightSchedule } from '@/config/flight-schedules';
import { AIRPORTS } from '@/config/airports';

export interface RouteInfo {
  origin: string;
  destination: string;
  airlineCodes: string[];
  flightCount: number;
  isCargo: boolean;
  isPassenger: boolean;
  weeklyFlights: number;
}

/**
 * Aggregates flight schedules into per-destination route info,
 * filtering out suspended flights and unknown airports.
 */
export function useAggregatedRoutes(schedules: FlightSchedule[]): RouteInfo[] {
  return useMemo(() => {
    const map = new Map<string, RouteInfo>();

    const activeSchedules = schedules.filter(
      (s) => !s.remarks?.toLowerCase().includes('suspended'),
    );

    activeSchedules.forEach((s) => {
      const dest = s.destination;
      const origin = s.origin || 'ICN';
      if (!AIRPORTS[dest]) return;

      const routeKey = `${origin}-${dest}`;
      const weeklyCount = s.departureDays.length;
      const existing = map.get(routeKey);

      if (existing) {
        if (!existing.airlineCodes.includes(s.airlineCode)) {
          existing.airlineCodes.push(s.airlineCode);
        }
        existing.flightCount += 1;
        existing.weeklyFlights += weeklyCount;
        if (s.flightType === 'cargo') existing.isCargo = true;
        else existing.isPassenger = true;
      } else {
        map.set(routeKey, {
          origin,
          destination: dest,
          airlineCodes: [s.airlineCode],
          flightCount: 1,
          isCargo: s.flightType === 'cargo',
          isPassenger: s.flightType !== 'cargo',
          weeklyFlights: weeklyCount,
        });
      }
    });

    return Array.from(map.values());
  }, [schedules]);
}
