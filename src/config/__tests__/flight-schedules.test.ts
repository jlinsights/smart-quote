import { describe, it, expect } from 'vitest';
import { isActiveOn, todayYmdLocal, type FlightSchedule } from '../flight-schedules';

const base: FlightSchedule = {
  id: 'test',
  airline: 'Test Air',
  airlineCode: 'TA',
  flightNo: 'TA 1',
  aircraftType: 'B777F',
  flightType: 'cargo',
  origin: 'ICN',
  destination: 'LAX',
  departureDays: [1],
  departureTime: '10:00',
  arrivalTime: '06:00',
  flightDuration: '12h 00m',
  maxCargoKg: 100000,
};

describe('isActiveOn', () => {
  it('returns true when both effective bounds are missing', () => {
    expect(isActiveOn(base, '2026-04-11')).toBe(true);
    expect(isActiveOn(base, '1999-01-01')).toBe(true);
    expect(isActiveOn(base, '9999-12-31')).toBe(true);
  });

  it('respects effectiveFrom lower bound (inclusive)', () => {
    const s = { ...base, effectiveFrom: '2026-04-15' };
    expect(isActiveOn(s, '2026-04-14')).toBe(false);
    expect(isActiveOn(s, '2026-04-15')).toBe(true);
    expect(isActiveOn(s, '2026-04-16')).toBe(true);
  });

  it('respects effectiveTo upper bound (inclusive)', () => {
    const s = { ...base, effectiveTo: '2026-04-25' };
    expect(isActiveOn(s, '2026-04-24')).toBe(true);
    expect(isActiveOn(s, '2026-04-25')).toBe(true);
    expect(isActiveOn(s, '2026-04-26')).toBe(false);
  });

  it('returns false outside a bounded window and true inside', () => {
    const s = {
      ...base,
      effectiveFrom: '2026-04-10',
      effectiveTo: '2026-04-14',
    };
    expect(isActiveOn(s, '2026-04-09')).toBe(false);
    expect(isActiveOn(s, '2026-04-10')).toBe(true);
    expect(isActiveOn(s, '2026-04-12')).toBe(true);
    expect(isActiveOn(s, '2026-04-14')).toBe(true);
    expect(isActiveOn(s, '2026-04-15')).toBe(false);
  });

  it('handles open-ended windows (only from or only to)', () => {
    const fromOnly = { ...base, effectiveFrom: '2026-04-10' };
    expect(isActiveOn(fromOnly, '2026-04-09')).toBe(false);
    expect(isActiveOn(fromOnly, '9999-12-31')).toBe(true);

    const toOnly = { ...base, effectiveTo: '2026-04-25' };
    expect(isActiveOn(toOnly, '1999-01-01')).toBe(true);
    expect(isActiveOn(toOnly, '2026-04-26')).toBe(false);
  });
});

describe('todayYmdLocal', () => {
  it('formats local date as YYYY-MM-DD', () => {
    // new Date(year, monthIndex, day, hour, minute) uses local time
    expect(todayYmdLocal(new Date(2026, 3, 11, 23, 59))).toBe('2026-04-11');
    expect(todayYmdLocal(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
    expect(todayYmdLocal(new Date(2026, 11, 31, 12, 0))).toBe('2026-12-31');
  });

  it('pads single-digit month and day with zero', () => {
    expect(todayYmdLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayYmdLocal(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  it('uses current time when no argument is given', () => {
    const result = todayYmdLocal();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
