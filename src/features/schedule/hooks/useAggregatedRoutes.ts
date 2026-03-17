import { useMemo } from 'react';
import type { FlightSchedule } from '@/config/flight-schedules';
import { AIRPORTS } from '@/config/airports';

export interface RouteInfo {
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
      if (!AIRPORTS[dest]) return;

      const weeklyCount = s.departureDays.length;
      const existing = map.get(dest);

      if (existing) {
        if (!existing.airlineCodes.includes(s.airlineCode)) {
          existing.airlineCodes.push(s.airlineCode);
        }
        existing.flightCount += 1;
        existing.weeklyFlights += weeklyCount;
        if (s.flightType === 'cargo') existing.isCargo = true;
        else existing.isPassenger = true;
      } else {
        map.set(dest, {
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
