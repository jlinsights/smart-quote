import { useState, useCallback, useMemo } from 'react';
import {
  FLIGHT_SCHEDULES,
  AIRLINE_INFO,
  type FlightSchedule,
  type AirlineInfo,
} from '@/config/flight-schedules';

const STORAGE_KEY = 'flight_schedules_custom';
const DELETED_KEY = 'flight_schedules_deleted';
const AIRLINES_KEY = 'flight_airlines_custom';

function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore parse errors
  }
  return fallback;
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export interface UseFlightSchedulesReturn {
  schedules: FlightSchedule[];
  airlines: AirlineInfo[];
  addSchedule: (schedule: Omit<FlightSchedule, 'id'>) => void;
  updateSchedule: (id: string, schedule: Partial<FlightSchedule>) => void;
  deleteSchedule: (id: string) => void;
  addAirline: (airline: AirlineInfo) => void;
  resetToDefaults: () => void;
  isCustomized: boolean;
}

export function useFlightSchedules(): UseFlightSchedulesReturn {
  const [customSchedules, setCustomSchedules] = useState<FlightSchedule[]>(
    () => loadFromStorage<FlightSchedule[]>(STORAGE_KEY, []),
  );
  const [deletedIds, setDeletedIds] = useState<string[]>(
    () => loadFromStorage<string[]>(DELETED_KEY, []),
  );
  const [customAirlines, setCustomAirlines] = useState<AirlineInfo[]>(
    () => loadFromStorage<AirlineInfo[]>(AIRLINES_KEY, []),
  );

  const schedules = useMemo(() => {
    const deletedSet = new Set(deletedIds);
    // Build a map of custom overrides by id
    const customMap = new Map(customSchedules.map((s) => [s.id, s]));

    // Start with defaults, applying overrides and filtering deleted
    const merged: FlightSchedule[] = [];
    for (const def of FLIGHT_SCHEDULES) {
      if (deletedSet.has(def.id)) continue;
      if (customMap.has(def.id)) {
        merged.push(customMap.get(def.id)!);
        customMap.delete(def.id);
      } else {
        merged.push(def);
      }
    }
    // Add purely new custom schedules (not overriding defaults)
    for (const s of customMap.values()) {
      if (!deletedSet.has(s.id)) {
        merged.push(s);
      }
    }
    return merged;
  }, [customSchedules, deletedIds]);

  const airlines = useMemo(() => {
    const defaultCodes = new Set(AIRLINE_INFO.map((a) => a.code));
    const extras = customAirlines.filter((a) => !defaultCodes.has(a.code));
    return [...AIRLINE_INFO, ...extras];
  }, [customAirlines]);

  const isCustomized = customSchedules.length > 0 || deletedIds.length > 0 || customAirlines.length > 0;

  const addSchedule = useCallback((schedule: Omit<FlightSchedule, 'id'>) => {
    const newSchedule: FlightSchedule = { ...schedule, id: generateId() };
    setCustomSchedules((prev) => {
      const next = [...prev, newSchedule];
      saveToStorage(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const updateSchedule = useCallback((id: string, updates: Partial<FlightSchedule>) => {
    setCustomSchedules((prev) => {
      // Check if it's already in custom list
      const idx = prev.findIndex((s) => s.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates, id };
        saveToStorage(STORAGE_KEY, next);
        return next;
      }
      // It's a default schedule being edited for the first time
      const defaultSchedule = FLIGHT_SCHEDULES.find((s) => s.id === id);
      if (defaultSchedule) {
        const next = [...prev, { ...defaultSchedule, ...updates, id }];
        saveToStorage(STORAGE_KEY, next);
        return next;
      }
      return prev;
    });
  }, []);

  const deleteSchedule = useCallback((id: string) => {
    // If it's a default schedule, track as deleted
    const isDefault = FLIGHT_SCHEDULES.some((s) => s.id === id);
    if (isDefault) {
      setDeletedIds((prev) => {
        const next = [...prev, id];
        saveToStorage(DELETED_KEY, next);
        return next;
      });
    }
    // Remove from custom schedules if present
    setCustomSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveToStorage(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const addAirline = useCallback((airline: AirlineInfo) => {
    setCustomAirlines((prev) => {
      const next = [...prev, airline];
      saveToStorage(AIRLINES_KEY, next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setCustomSchedules([]);
    setDeletedIds([]);
    setCustomAirlines([]);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DELETED_KEY);
    localStorage.removeItem(AIRLINES_KEY);
  }, []);

  return {
    schedules,
    airlines,
    addSchedule,
    updateSchedule,
    deleteSchedule,
    addAirline,
    resetToDefaults,
    isCustomized,
  };
}
