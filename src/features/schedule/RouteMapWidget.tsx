import React, { useMemo, useState, useCallback } from 'react';
import type { FlightSchedule, AirlineInfo } from '@/config/flight-schedules';
import { AIRLINE_COLORS } from '@/config/flight-schedules';
import { WORLD_MAP_PATHS } from './worldMapPaths';

/* ------------------------------------------------------------------ */
/*  Types & Constants                                                  */
/* ------------------------------------------------------------------ */

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
  DAD: { lat: 16.04, lng: 108.20, city: 'Da Nang', cityKo: '다낭' },
  CEB: { lat: 10.31, lng: 123.98, city: 'Cebu', cityKo: '세부' },
  HKG: { lat: 22.31, lng: 113.91, city: 'Hong Kong', cityKo: '홍콩' },
  UBN: { lat: 47.85, lng: 106.77, city: 'Ulaanbaatar', cityKo: '울란바토르' },
  // Europe
  SVO: { lat: 55.97, lng: 37.41, city: 'Moscow', cityKo: '모스크바' },
  FRA: { lat: 50.03, lng: 8.57, city: 'Frankfurt', cityKo: '프랑크푸르트' },
};

/** SVG hex colors per airline code for the dark-background map */
const AIRLINE_SVG_COLORS: Record<string, string> = {
  WS: '#2dd4bf', // teal-400
  O3: '#fb923c', // orange-400
  BX: '#60a5fa', // blue-400
  M0: '#38bdf8', // sky-400
  SU: '#f87171', // red-400
  '2C': '#fb7185', // rose-400
  AM: '#34d399', // emerald-400
  YP: '#a78bfa', // violet-400
  DE: '#facc15', // yellow-400
};

const DEFAULT_COLOR = '#94a3b8'; // slate-400

/* ------------------------------------------------------------------ */
/*  Projection Helpers                                                 */
/* ------------------------------------------------------------------ */

// SVG viewBox: 0 0 1000 500
// Equirectangular centered so ICN (~lng 126) sits at x ≈ 320
// Longitude range mapped: 0 → 360 (wrapping) offset so 20°E → left edge
const LNG_OFFSET = 20; // left edge of map is 20°E
const SVG_W = 1000;
const SVG_H = 500;

function lngToX(lng: number): number {
  // Shift longitude so 20°E = 0, then wrap
  let shifted = lng - LNG_OFFSET;
  if (shifted < 0) shifted += 360;
  return (shifted / 360) * SVG_W;
}

function latToY(lat: number): number {
  // Simple Mercator-like: clamp lat to [-70, 80]
  const clamped = Math.max(-70, Math.min(80, lat));
  // Map 80 → top(0), -70 → bottom(500)
  return ((80 - clamped) / 150) * SVG_H;
}

function airportPos(code: string): { x: number; y: number } | null {
  const a = AIRPORTS[code];
  if (!a) return null;
  return { x: lngToX(a.lng), y: latToY(a.lat) };
}

/** Build a quadratic bezier arc path from ICN to destination */
function arcPath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Control point: midpoint offset perpendicular (arc upward)
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  // Offset magnitude scales with distance
  const offset = Math.min(dist * 0.25, 80);
  // Perpendicular direction (rotate 90° CCW from dx,dy)
  const px = -dy / dist;
  const py = dx / dist;
  // Arc curves upward (negative y direction in SVG)
  const cx = mx + px * offset;
  const cy = my - Math.abs(py * offset) - offset * 0.3;

  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

/* ------------------------------------------------------------------ */
/*  Grid Lines Component                                               */
/* ------------------------------------------------------------------ */

const GridLines: React.FC = () => {
  const latLines = [-60, -30, 0, 30, 60];
  const lngLines = [0, 30, 60, 90, 120, 150, 180, -150, -120, -90, -60, -30];

  return (
    <g opacity="0.06" stroke="#94a3b8" strokeWidth="0.5" fill="none">
      {latLines.map((lat) => {
        const y = latToY(lat);
        return <line key={`lat-${lat}`} x1="0" y1={y} x2={SVG_W} y2={y} />;
      })}
      {lngLines.map((lng) => {
        const x = lngToX(lng);
        return <line key={`lng-${lng}`} x1={x} y1="0" x2={x} y2={SVG_H} />;
      })}
    </g>
  );
};

const WorldMap: React.FC = () => (
  <g>
    {WORLD_MAP_PATHS.map((d, i) => (
      <path
        key={i}
        d={d}
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="0.5"
      />
    ))}
  </g>
);

/* ------------------------------------------------------------------ */
/*  Types for route data                                               */
/* ------------------------------------------------------------------ */

interface RouteInfo {
  destination: string;
  airlineCodes: string[];
  flightCount: number;
  isCargo: boolean;
  isPassenger: boolean;
  isSuspended: boolean;
  weeklyFlights: number;
}

/* ------------------------------------------------------------------ */
/*  RouteMapWidget                                                     */
/* ------------------------------------------------------------------ */

export interface RouteMapWidgetProps {
  schedules: FlightSchedule[];
  airlines: AirlineInfo[];
  selectedAirline: string;
  onAirlineSelect: (code: string) => void;
  language: string;
}

const RouteMapWidget: React.FC<RouteMapWidgetProps> = ({
  schedules,
  airlines,
  selectedAirline,
  onAirlineSelect,
  language,
}) => {
  const [hoveredRoute, setHoveredRoute] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const isKo = language === 'ko';

  const t = useCallback(
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
      };
      return translations[key]?.[language] ?? translations[key]?.en ?? key;
    },
    [language],
  );

  // Aggregate routes by destination
  const routes = useMemo<RouteInfo[]>(() => {
    const map = new Map<string, RouteInfo>();

    schedules.forEach((s) => {
      const dest = s.destination;
      if (!AIRPORTS[dest]) return;

      const existing = map.get(dest);
      const suspended = !!s.remarks?.toLowerCase().includes('suspended');
      const weeklyCount = s.departureDays.length;

      if (existing) {
        if (!existing.airlineCodes.includes(s.airlineCode)) {
          existing.airlineCodes.push(s.airlineCode);
        }
        existing.flightCount += 1;
        existing.weeklyFlights += suspended ? 0 : weeklyCount;
        if (s.flightType === 'cargo') existing.isCargo = true;
        else existing.isPassenger = true;
        if (suspended) existing.isSuspended = true;
      } else {
        map.set(dest, {
          destination: dest,
          airlineCodes: [s.airlineCode],
          flightCount: 1,
          isCargo: s.flightType === 'cargo',
          isPassenger: s.flightType !== 'cargo',
          isSuspended: suspended,
          weeklyFlights: suspended ? 0 : weeklyCount,
        });
      }
    });

    return Array.from(map.values());
  }, [schedules]);

  // Airline legend data
  const legendData = useMemo(() => {
    return airlines
      .map((a) => {
        const count = schedules.filter((s) => s.airlineCode === a.code).length;
        if (count === 0) return null;
        return { code: a.code, name: isKo ? a.nameKo : a.name, count };
      })
      .filter(Boolean) as { code: string; name: string; count: number }[];
  }, [airlines, schedules, isKo]);

  const icnPos = airportPos('ICN')!;

  const handleRouteHover = useCallback(
    (dest: string | null, event?: React.MouseEvent) => {
      setHoveredRoute(dest);
      if (dest && event) {
        const svg = (event.target as Element).closest('svg');
        if (svg) {
          const rect = svg.getBoundingClientRect();
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      } else {
        setTooltipPos(null);
      }
    },
    [],
  );

  const hoveredRouteInfo = hoveredRoute ? routes.find((r) => r.destination === hoveredRoute) : null;

  return (
    <div className="rounded-2xl overflow-hidden w-full bg-gradient-to-br from-slate-900 to-blue-950 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <h3 className="text-sm font-semibold text-white/80 tracking-wide">
          {t('schedule.routeMap.title')}
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-white/50">
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-[2px] bg-white/60 rounded" />
            {t('schedule.routeMap.cargo')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-5 h-[2px] bg-white/60 rounded" style={{ strokeDasharray: '3 2' }}>
              <svg width="20" height="2" className="inline">
                <line x1="0" y1="1" x2="20" y2="1" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
              </svg>
            </span>
            {t('schedule.routeMap.pax')}
          </span>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative w-full" style={{ aspectRatio: '2 / 1', maxHeight: '300px' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow filter for hovered routes */}
            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Pulse animation for ICN */}
            <radialGradient id="icn-pulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grid lines */}
          <GridLines />

          {/* World map (Natural Earth 110m) */}
          <WorldMap />

          {/* Route arcs */}
          {routes.map((route) => {
            const destPos = airportPos(route.destination);
            if (!destPos) return null;

            const primaryCode = route.airlineCodes[0];
            const color = AIRLINE_SVG_COLORS[primaryCode] ?? DEFAULT_COLOR;
            const isSusp = route.isSuspended && route.weeklyFlights === 0;
            const isHighlighted =
              selectedAirline === 'all' || route.airlineCodes.includes(selectedAirline);
            const isHovered = hoveredRoute === route.destination;

            const pathD = arcPath(icnPos, destPos);
            const strokeW = route.isCargo && !route.isPassenger ? 2 : 1.5;

            return (
              <g key={route.destination}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={isSusp ? '#ef4444' : color}
                  strokeWidth={isHovered ? strokeW + 1 : strokeW}
                  strokeDasharray={
                    isSusp
                      ? '6 4'
                      : route.isPassenger && !route.isCargo
                        ? '8 3'
                        : 'none'
                  }
                  opacity={isSusp ? 0.3 : isHighlighted ? (isHovered ? 0.95 : 0.7) : 0.15}
                  strokeLinecap="round"
                  filter={isHovered ? 'url(#route-glow)' : undefined}
                  className="transition-opacity duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleRouteHover(route.destination, e)}
                  onMouseMove={(e) => handleRouteHover(route.destination, e)}
                  onMouseLeave={() => handleRouteHover(null)}
                />
              </g>
            );
          })}

          {/* ICN hub — pulsing rings */}
          <circle cx={icnPos.x} cy={icnPos.y} r="18" fill="url(#icn-pulse)" className="animate-ping" style={{ animationDuration: '2s' }} />
          <circle cx={icnPos.x} cy={icnPos.y} r="10" fill="url(#icn-pulse)" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          <circle cx={icnPos.x} cy={icnPos.y} r="5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          <text
            x={icnPos.x}
            y={icnPos.y - 10}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="700"
            className="select-none"
          >
            ICN
          </text>

          {/* Destination dots */}
          {routes.map((route) => {
            const destPos = airportPos(route.destination);
            if (!destPos) return null;

            const primaryCode = route.airlineCodes[0];
            const color = AIRLINE_SVG_COLORS[primaryCode] ?? DEFAULT_COLOR;
            const isSusp = route.isSuspended && route.weeklyFlights === 0;
            const isHighlighted =
              selectedAirline === 'all' || route.airlineCodes.includes(selectedAirline);
            const isHovered = hoveredRoute === route.destination;
            const showLabel = isHovered || selectedAirline !== 'all';

            return (
              <g
                key={`dot-${route.destination}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleRouteHover(route.destination, e)}
                onMouseMove={(e) => handleRouteHover(route.destination, e)}
                onMouseLeave={() => handleRouteHover(null)}
              >
                {/* Outer ring */}
                <circle
                  cx={destPos.x}
                  cy={destPos.y}
                  r={isHovered ? 5 : 3.5}
                  fill="none"
                  stroke={isSusp ? '#ef4444' : color}
                  strokeWidth="1.5"
                  opacity={isHighlighted ? (isHovered ? 1 : 0.8) : 0.2}
                  className="transition-all duration-200"
                />
                {/* Inner dot */}
                <circle
                  cx={destPos.x}
                  cy={destPos.y}
                  r={isHovered ? 2.5 : 1.5}
                  fill="white"
                  opacity={isHighlighted ? (isHovered ? 1 : 0.9) : 0.2}
                  className="transition-all duration-200"
                />
                {/* Label */}
                {showLabel && (
                  <text
                    x={destPos.x}
                    y={destPos.y - 8}
                    textAnchor="middle"
                    fill="white"
                    fontSize="7"
                    fontWeight="600"
                    opacity={isHighlighted ? 0.9 : 0.3}
                    className="select-none"
                  >
                    {route.destination}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredRoute && hoveredRouteInfo && tooltipPos && (
          <div
            className="absolute pointer-events-none z-10 bg-gray-900/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white shadow-xl border border-white/10"
            style={{
              left: Math.min(tooltipPos.x + 12, (typeof window !== 'undefined' ? window.innerWidth * 0.8 : 300)),
              top: tooltipPos.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="font-semibold text-sm">
              {isKo
                ? (AIRPORTS[hoveredRoute]?.cityKo ?? hoveredRoute)
                : (AIRPORTS[hoveredRoute]?.city ?? hoveredRoute)
              }
              <span className="ml-1.5 text-white/50 font-normal">({hoveredRoute})</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-white/70">
              {hoveredRouteInfo.airlineCodes.map((code) => {
                const airline = airlines.find((a) => a.code === code);
                const badgeColor = AIRLINE_SVG_COLORS[code] ?? DEFAULT_COLOR;
                return (
                  <span key={code} className="flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: badgeColor }}
                    />
                    <span>{airline ? (isKo ? airline.nameKo : airline.name) : code}</span>
                  </span>
                );
              })}
            </div>
            <div className="mt-1 text-white/50">
              {hoveredRouteInfo.weeklyFlights} {t('schedule.routeMap.flights')}
              {hoveredRouteInfo.isSuspended && hoveredRouteInfo.weeklyFlights === 0 && (
                <span className="ml-1 text-red-400">(Suspended)</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {legendData.map((item) => {
          const color = AIRLINE_SVG_COLORS[item.code] ?? DEFAULT_COLOR;
          const isActive = selectedAirline === item.code;
          const tailwindColors = AIRLINE_COLORS[item.code];
          return (
            <button
              key={item.code}
              onClick={() => onAirlineSelect(item.code)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border
                ${isActive
                  ? (tailwindColors?.badge ?? 'bg-white/20 text-white') + ' ring-1 ring-white/30'
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

export default RouteMapWidget;
