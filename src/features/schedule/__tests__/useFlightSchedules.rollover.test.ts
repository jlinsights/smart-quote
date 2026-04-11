import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFlightSchedules } from '../useFlightSchedules';

/**
 * LJ001 Apr 10-14 vs Apr 15-25 rollover scenario.
 * The two entries share flightNo 'LJ 001' but differ in departureDays/departureTime,
 * and are expected to swap automatically based on today's date.
 */
describe('useFlightSchedules — LJ001 effective-window rollover', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  const getLj001 = (schedules: ReturnType<typeof useFlightSchedules>['schedules']) =>
    schedules.filter((s) => s.flightNo === 'LJ 001');

  it('shows the Apr 10-14 DAILY 17:10 entry on 2026-04-11', () => {
    vi.setSystemTime(new Date(2026, 3, 11, 12, 0, 0)); // 2026-04-11 12:00 local
    const { result } = renderHook(() => useFlightSchedules());
    const lj = getLj001(result.current.schedules);

    expect(lj).toHaveLength(1);
    expect(lj[0].id).toBe('default-lj-001-apr10');
    expect(lj[0].departureTime).toBe('17:10');
    expect(lj[0].arrivalTime).toBe('21:10');
    expect(lj[0].departureDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('shows the Apr 15-25 D1,3,4,5,6 19:55 entry on 2026-04-20', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0)); // 2026-04-20
    const { result } = renderHook(() => useFlightSchedules());
    const lj = getLj001(result.current.schedules);

    expect(lj).toHaveLength(1);
    expect(lj[0].id).toBe('default-lj-001-apr15');
    expect(lj[0].departureTime).toBe('19:55');
    expect(lj[0].arrivalTime).toBe('23:55');
    expect(lj[0].departureDays).toEqual([1, 3, 4, 5, 6]);
  });

  it('shows zero LJ001 entries after the Apr 25 window expires', () => {
    vi.setSystemTime(new Date(2026, 3, 27, 12, 0, 0)); // 2026-04-27
    const { result } = renderHook(() => useFlightSchedules());
    const lj = getLj001(result.current.schedules);

    expect(lj).toHaveLength(0);
  });

  it('migrates legacy default-lj-001 custom override to default-lj-001-apr15', () => {
    // Simulate a user who previously customized the now-removed legacy id
    const legacy = [
      {
        id: 'default-lj-001',
        airline: 'Jin Air (feeder for SU)',
        airlineCode: 'LJ',
        flightNo: 'LJ 001',
        aircraftType: 'B737-800',
        flightType: 'passenger' as const,
        origin: 'ICN',
        destination: 'BKK',
        departureDays: [1, 3, 4, 5, 6],
        departureTime: '19:55',
        arrivalTime: '23:55',
        flightDuration: '6h 00m',
        maxCargoKg: 3000,
        remarks: 'user-customized',
      },
    ];
    localStorage.setItem('flight_schedules_custom', JSON.stringify(legacy));

    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0)); // within Apr 15-25 window
    const { result } = renderHook(() => useFlightSchedules());
    const lj = getLj001(result.current.schedules);

    expect(lj).toHaveLength(1);
    expect(lj[0].id).toBe('default-lj-001-apr15');
    expect(lj[0].remarks).toBe('user-customized');

    // Persisted migration: storage should now contain the new id
    const persisted = JSON.parse(localStorage.getItem('flight_schedules_custom') || '[]') as Array<{
      id: string;
    }>;
    expect(persisted[0].id).toBe('default-lj-001-apr15');
  });
});
