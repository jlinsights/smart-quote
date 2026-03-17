import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import type { FlightSchedule, AirlineInfo } from '@/config/flight-schedules';
import { AIRLINE_COLORS } from '@/config/flight-schedules';
import { loadGoogleMaps3D } from '@/lib/googleMapsLoader';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

export interface RouteMap3DProps {
  schedules: FlightSchedule[];
  airlines: AirlineInfo[];
  selectedAirline: string;
  onAirlineSelect: (code: string) => void;
  language: string;
}

interface AirportData {
  lat: number;
  lng: number;
  city: string;
  cityKo: string;
}

const AIRPORTS: Record<string, AirportData> = {
  ICN: { lat: 37.46, lng: 126.44, city: 'Seoul/Incheon', cityKo: '인천' },
  // North America
  LAX: { lat: 33.94, lng: -118.41, city: 'Los Angeles', cityKo: '로스앤젤레스' },
  YYC: { lat: 51.13, lng: -114.02, city: 'Calgary', cityKo: '캘거리' },
  YVR: { lat: 49.19, lng: -123.18, city: 'Vancouver', cityKo: '밴쿠버' },
  EWR: { lat: 40.69, lng: -74.17, city: 'Newark', cityKo: '뉴어크' },
  SFO: { lat: 37.62, lng: -122.38, city: 'San Francisco', cityKo: '샌프란시스코' },
  HNL: { lat: 21.32, lng: -157.92, city: 'Honolulu', cityKo: '호놀룰루' },
  MEX: { lat: 19.44, lng: -99.07, city: 'Mexico City', cityKo: '멕시코시티' },
  // Asia
  NRT: { lat: 35.76, lng: 140.39, city: 'Tokyo/Narita', cityKo: '도쿄/나리타' },
  FUK: { lat: 33.59, lng: 130.45, city: 'Fukuoka', cityKo: '후쿠오카' },
  KIX: { lat: 34.43, lng: 135.24, city: 'Osaka/Kansai', cityKo: '오사카/간사이' },
  PVG: { lat: 31.14, lng: 121.81, city: 'Shanghai', cityKo: '상하이' },
  SZX: { lat: 22.64, lng: 113.81, city: 'Shenzhen', cityKo: '선전' },
  HAN: { lat: 21.22, lng: 105.81, city: 'Hanoi', cityKo: '하노이' },
  BKK: { lat: 13.68, lng: 100.75, city: 'Bangkok', cityKo: '방콕' },
  DAD: { lat: 16.04, lng: 108.2, city: 'Da Nang', cityKo: '다낭' },
  CEB: { lat: 10.31, lng: 123.98, city: 'Cebu', cityKo: '세부' },
  HKG: { lat: 22.31, lng: 113.91, city: 'Hong Kong', cityKo: '홍콩' },
  UBN: { lat: 47.85, lng: 106.77, city: 'Ulaanbaatar', cityKo: '울란바토르' },
  // Europe
  SVO: { lat: 55.97, lng: 37.41, city: 'Moscow', cityKo: '모스크바' },
  FRA: { lat: 50.03, lng: 8.57, city: 'Frankfurt', cityKo: '프랑크푸르트' },
};

/** Hex colors per airline code — matches SVG widget palette */
const AIRLINE_HEX_COLORS: Record<string, string> = {
  WS: '#2dd4bf',
  O3: '#fb923c',
  BX: '#60a5fa',
  M0: '#38bdf8',
  SU: '#f87171',
  '2C': '#fb7185',
  AM: '#34d399',
  YP: '#a78bfa',
  DE: '#facc15',
};

const DEFAULT_COLOR = '#94a3b8';

/* ------------------------------------------------------------------ */
/*  Route aggregation                                                  */
/* ------------------------------------------------------------------ */

interface RouteInfo {
  destination: string;
  airlineCodes: string[];
  flightCount: number;
  isCargo: boolean;
  isPassenger: boolean;
  weeklyFlights: number;
}

/* ------------------------------------------------------------------ */
/*  Great circle arc helper                                            */
/* ------------------------------------------------------------------ */

function generateArcPoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  numPoints = 50,
  maxAltitude = 300000,
): { lat: number; lng: number; altitude: number }[] {
  const points: { lat: number; lng: number; altitude: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;

    // Handle dateline crossing
    let dlng = end.lng - start.lng;
    if (Math.abs(dlng) > 180) {
      dlng = dlng > 0 ? dlng - 360 : dlng + 360;
    }

    const lat = start.lat + (end.lat - start.lat) * t;
    let lng = start.lng + dlng * t;
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;

    // Sine-curve altitude peaking at midpoint
    const altFraction = Math.sin(t * Math.PI);
    const dist = Math.sqrt(
      Math.pow(end.lat - start.lat, 2) + Math.pow(dlng, 2),
    );
    const altitude = altFraction * Math.min(maxAltitude, dist * 5000);

    points.push({ lat, lng, altitude });
  }

  return points;
}

/* ------------------------------------------------------------------ */
/*  Translation helper                                                 */
/* ------------------------------------------------------------------ */

function useTranslations(language: string) {
  return useCallback(
    (key: string): string => {
      const translations: Record<string, Record<string, string>> = {
        'schedule.routeMap.title': {
          en: 'Route Network',
          ko: '노선 네트워크',
          cn: '航线网络',
          ja: '路線ネットワーク',
        },
        'schedule.routeMap.flights': {
          en: 'flights/wk',
          ko: '편/주',
          cn: '航班/周',
          ja: '便/週',
        },
        'schedule.routeMap.cargo': {
          en: 'Cargo',
          ko: '화물',
          cn: '貨物',
          ja: '貨物',
        },
        'schedule.routeMap.pax': {
          en: 'Passenger',
          ko: '여객',
          cn: '旅客',
          ja: '旅客',
        },
        'schedule.routeMap.loading': {
          en: 'Loading 3D Map...',
          ko: '3D 지도 로딩 중...',
          cn: '加载3D地图...',
          ja: '3Dマップを読み込み中...',
        },
        'schedule.routeMap.error': {
          en: 'Failed to load 3D map',
          ko: '3D 지도 로딩 실패',
          cn: '无法加载3D地图',
          ja: '3Dマップの読み込みに失敗',
        },
      };
      return translations[key]?.[language] ?? translations[key]?.en ?? key;
    },
    [language],
  );
}

/* ------------------------------------------------------------------ */
/*  RouteMap3D Component                                               */
/* ------------------------------------------------------------------ */

const RouteMap3D: React.FC<RouteMap3DProps> = ({
  schedules,
  airlines,
  selectedAirline,
  onAirlineSelect,
  language,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const libRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isKo = language === 'ko';
  const t = useTranslations(language);

  // Track previous selectedAirline to detect changes for camera animation
  const prevAirlineRef = useRef(selectedAirline);

  /* ---- Aggregate routes ---- */
  const routes = useMemo<RouteInfo[]>(() => {
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

  /* ---- Legend data ---- */
  const legendData = useMemo(() => {
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
      .filter(
        (item): item is { code: string; name: string; count: number } =>
          item !== null,
      );
  }, [airlines, schedules, isKo]);

  /* ---- Helper: add markers and polylines to map element ---- */
  const addMarkersAndRoutes = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (map3d: any) => {
      if (!libRef.current) return;
      const { Marker3DElement, Polyline3DElement } = libRef.current;
      const icn = AIRPORTS.ICN;

      // ICN hub marker
      const icnMarker = new Marker3DElement({
        position: { lat: icn.lat, lng: icn.lng, altitude: 0 },
        label: 'ICN — Seoul/Incheon',
        altitudeMode: 'CLAMP_TO_GROUND',
        extruded: true,
      });
      map3d.append(icnMarker);

      // Route polylines + destination markers
      routes.forEach((route) => {
        const airport = AIRPORTS[route.destination];
        if (!airport) return;

        const isHighlighted =
          selectedAirline === 'all' ||
          route.airlineCodes.includes(selectedAirline);
        const primaryCode = route.airlineCodes[0];
        const color = AIRLINE_HEX_COLORS[primaryCode] ?? DEFAULT_COLOR;

        // Generate arc points
        const arcPoints = generateArcPoints(
          { lat: icn.lat, lng: icn.lng },
          { lat: airport.lat, lng: airport.lng },
          50,
          300000,
        );

        // Create polyline using constructor
        try {
          const polyline = new Polyline3DElement({
            altitudeMode: 'ABSOLUTE',
            strokeColor: isHighlighted ? color : '#4b5563',
            strokeWidth: route.isCargo && !route.isPassenger ? 4 : 2,
            drawsOccludedSegments: true,
            coordinates: arcPoints.map((p) => ({
              lat: p.lat,
              lng: p.lng,
              altitude: p.altitude,
            })),
          });

          if (!isHighlighted) {
            polyline.style.opacity = '0.15';
          }

          map3d.append(polyline);
        } catch {
          // Polyline3DElement may not be available in all alpha builds
        }

        // Destination marker
        const marker = new Marker3DElement({
          position: { lat: airport.lat, lng: airport.lng, altitude: 0 },
          label: route.destination,
          altitudeMode: 'CLAMP_TO_GROUND',
        });

        if (!isHighlighted) {
          marker.style.opacity = '0.3';
        }

        map3d.append(marker);
      });
    },
    [routes, selectedAirline],
  );

  /* ---- Load Google Maps 3D API ---- */
  useEffect(() => {
    let cancelled = false;

    loadGoogleMaps3D()
      .then((lib) => {
        if (!cancelled) {
          libRef.current = lib;
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Unknown error loading map',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- Create map element imperatively (once, when API is loaded) ---- */
  useEffect(() => {
    if (!loaded || !containerRef.current || !libRef.current) return;

    const container = containerRef.current;
    const { Map3DElement } = libRef.current;

    // Clear any previous content
    container.innerHTML = '';

    // Create Map3DElement using the constructor from importLibrary
    const map3d = new Map3DElement({
      center: { lat: 37.46, lng: 126.44, altitude: 0 },
      range: 12000000,
      tilt: 45,
      heading: -30,
      defaultLabelsDisabled: false,
    });
    map3d.style.width = '100%';
    map3d.style.height = '100%';

    container.appendChild(map3d);
    mapRef.current = map3d;

    // Wait for the custom element to render, then add overlays
    const timer = setTimeout(() => {
      addMarkersAndRoutes(map3d);
    }, 1500);

    return () => {
      clearTimeout(timer);
      // Clean up: wipe all children from container (including the map)
      container.innerHTML = '';
      mapRef.current = null;
    };
    // Re-create map only when loaded status changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  /* ---- Update markers/routes when routes or selectedAirline change ---- */
  useEffect(() => {
    const map3d = mapRef.current;
    if (!map3d || !loaded) return;

    // Remove existing markers and polylines, but keep the map element itself
    // Use a safe approach: collect children first, then remove them
    const children = Array.from(map3d.children) as HTMLElement[];
    children.forEach((child: HTMLElement) => {
      const tag = child.tagName?.toUpperCase();
      if (tag === 'GMP-MARKER-3D' || tag === 'GMP-POLYLINE-3D') {
        try {
          map3d.removeChild(child);
        } catch {
          // Silently skip if the node was already removed by the web component
        }
      }
    });

    addMarkersAndRoutes(map3d);
  }, [loaded, routes, selectedAirline, addMarkersAndRoutes]);

  /* ---- Camera animation on airline filter change ---- */
  useEffect(() => {
    const map3d = mapRef.current;
    if (!map3d || !loaded) return;

    // Only animate when the airline filter actually changes
    if (prevAirlineRef.current === selectedAirline) return;
    prevAirlineRef.current = selectedAirline;

    if (selectedAirline === 'all') {
      // Reset to overview
      try {
        map3d.flyCameraTo({
          endCamera: {
            center: { lat: 37.46, lng: 126.44, altitude: 0 },
            range: 12000000,
            tilt: 45,
            heading: -30,
          },
          durationMillis: 1500,
        });
      } catch {
        // flyCameraTo may not be available yet
      }
      return;
    }

    // Find all destinations for selected airline
    const airlineRoutes = routes.filter((r) =>
      r.airlineCodes.includes(selectedAirline),
    );
    if (airlineRoutes.length === 0) return;

    // Calculate centroid of destinations + ICN
    const allLats = [
      AIRPORTS.ICN.lat,
      ...airlineRoutes.map((r) => AIRPORTS[r.destination]?.lat ?? 0),
    ];
    const allLngs = [
      AIRPORTS.ICN.lng,
      ...airlineRoutes.map((r) => AIRPORTS[r.destination]?.lng ?? 0),
    ];

    const centerLat =
      allLats.reduce((a, b) => a + b, 0) / allLats.length;
    const centerLng =
      allLngs.reduce((a, b) => a + b, 0) / allLngs.length;

    // Adjust range based on spread
    const latSpread = Math.max(...allLats) - Math.min(...allLats);
    const lngSpread = Math.max(...allLngs) - Math.min(...allLngs);
    const maxSpread = Math.max(latSpread, lngSpread);
    const range = Math.max(2000000, maxSpread * 80000);

    try {
      map3d.flyCameraTo({
        endCamera: {
          center: { lat: centerLat, lng: centerLng, altitude: 0 },
          range: Math.min(range, 15000000),
          tilt: 50,
          heading: -20,
        },
        durationMillis: 1200,
      });
    } catch {
      // flyCameraTo may not be available yet
    }
  }, [loaded, selectedAirline, routes]);

  /* ---- Loading / Error states ---- */
  if (loadError) {
    return (
      <div className="rounded-2xl overflow-hidden w-full bg-[#070f1b] relative flex items-center justify-center h-[350px] md:h-[500px]">
        <div className="text-center text-white/60">
          <p className="text-sm">{t('schedule.routeMap.error')}</p>
          <p className="text-xs mt-1 text-white/40">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden w-full bg-[#070f1b] relative">
      {/* Map container — managed entirely via imperative DOM APIs */}
      <div
        ref={containerRef}
        className="w-full h-[350px] md:h-[500px] relative"
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#070f1b]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-white/60 text-sm">
                {t('schedule.routeMap.loading')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Header overlay */}
      {loaded && (
        <div className="absolute top-3 left-4 z-10">
          <h3 className="text-sm font-semibold text-white/90 tracking-wide drop-shadow-lg bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
            {t('schedule.routeMap.title')}
          </h3>
        </div>
      )}

      {/* Type legend overlay */}
      {loaded && (
        <div className="absolute top-3 right-4 z-10 flex items-center gap-3 text-[10px] text-white/70 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-[2px] bg-white/60 rounded" />
            {t('schedule.routeMap.cargo')}
          </span>
          <span className="flex items-center gap-1">
            <svg width="20" height="2" className="inline">
              <line
                x1="0"
                y1="1"
                x2="20"
                y2="1"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="3 2"
                opacity="0.6"
              />
            </svg>
            {t('schedule.routeMap.pax')}
          </span>
        </div>
      )}

      {/* Airline legend */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {legendData.map((item) => {
          const color = AIRLINE_HEX_COLORS[item.code] ?? DEFAULT_COLOR;
          const isActive = selectedAirline === item.code;
          const tailwindColors = AIRLINE_COLORS[item.code];
          return (
            <button
              key={item.code}
              onClick={() => onAirlineSelect(item.code)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border
                ${
                  isActive
                    ? (tailwindColors?.badge ??
                        'bg-white/20 text-white') +
                      ' ring-1 ring-white/30'
                    : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {item.name}
              <span className="text-white/40">({item.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RouteMap3D;
