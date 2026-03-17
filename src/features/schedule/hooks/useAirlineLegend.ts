import { useMemo } from 'react';
import type { FlightSchedule, AirlineInfo } from '@/config/flight-schedules';

export interface AirlineLegendItem {
  code: string;
  name: string;
  count: number;
}

/**
 * Produces legend data for route map airline badges,
 * filtering out airlines with no active (non-suspended) flights.
 */
export function useAirlineLegend(
  airlines: AirlineInfo[],
  schedules: FlightSchedule[],
  isKo: boolean,
): AirlineLegendItem[] {
  return useMemo(() => {
    return airlines
      .map((a) => {
        const activeFlights = schedules.filter(
          (s) =>
            s.airlineCode === a.code &&
            !s.remarks?.toLowerCase().includes('suspended'),
        );
        if (activeFlights.length === 0) return null;
        return {
          code: a.code,
          name: isKo ? a.nameKo : a.name,
          count: activeFlights.length,
        };
      })
      .filter((item): item is AirlineLegendItem => item !== null);
  }, [airlines, schedules, isKo]);
}
