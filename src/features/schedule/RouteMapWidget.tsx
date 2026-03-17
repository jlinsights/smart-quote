import React, { useState, useCallback } from 'react';
import type { FlightSchedule, AirlineInfo } from '@/config/flight-schedules';
import { AIRLINE_COLORS, AIRLINE_HEX_COLORS, DEFAULT_HEX_COLOR } from '@/config/flight-schedules';
import { AIRPORTS } from '@/config/airports';
import { WORLD_MAP_PATHS } from './worldMapPaths';
import { useAggregatedRoutes } from './hooks/useAggregatedRoutes';
import { useAirlineLegend } from './hooks/useAirlineLegend';
import { useLanguage } from '@/contexts/LanguageContext';

/* ------------------------------------------------------------------ */
/*  Projection Helpers                                                 */
/* ------------------------------------------------------------------ */

// SVG uses original projection: viewBox 0 0 1000 500, lat [-70,80], lng offset 20deg E
// But we CROP the viewBox to show only the active route area
const LNG_OFFSET = 20;
const SVG_W = 1000;
const SVG_H = 500;

// Crop viewBox to focus on route network (lat -5 to 65, all longitudes)
const CROP_Y = 50; // top of crop (lat ~65)
const CROP_H = 233; // height of crop (lat -5 to 65)

function lngToX(lng: number): number {
  let shifted = lng - LNG_OFFSET;
  if (shifted < 0) shifted += 360;
  return (shifted / 360) * SVG_W;
}

function latToY(lat: number): number {
  const clamped = Math.max(-70, Math.min(80, lat));
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

  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  const offset = Math.min(dist * 0.25, 80);
  const px = -dy / dist;
  const py = dx / dist;
  const cx = mx + px * offset;
  const cy = my - Math.abs(py * offset) - offset * 0.3;

  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

/* ------------------------------------------------------------------ */
/*  WorldMap Component                                                 */
/* ------------------------------------------------------------------ */

const WorldMap: React.FC = () => (
  <g clipPath="url(#map-clip)">
    {WORLD_MAP_PATHS.map((d, i) => (
      <path
        key={i}
        d={d}
        fill="#1c3354"
        stroke="#2e5a8f"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    ))}
  </g>
);

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
  const { t } = useLanguage();

  // Shared hooks
  const routes = useAggregatedRoutes(schedules);
  const legendData = useAirlineLegend(airlines, schedules, isKo);

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
    <div className="rounded-2xl overflow-hidden w-full bg-[#070f1b] relative">
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
      <div className="relative w-full" style={{ aspectRatio: '2.2 / 1' }}>
        <svg
          viewBox={`0 ${CROP_Y} ${SVG_W} ${CROP_H}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <clipPath id="map-clip">
              <rect x="0" y={CROP_Y} width={SVG_W} height={CROP_H} />
            </clipPath>
            <filter id="route-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="route-soft-glow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="icn-pulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ocean background */}
          <rect x="0" y={CROP_Y} width={SVG_W} height={CROP_H} fill="#070f1b" />

          {/* World map (Natural Earth 110m) */}
          <WorldMap />

          {/* Route arcs */}
          {routes.map((route) => {
            const destPos = airportPos(route.destination);
            if (!destPos) return null;

            const primaryCode = route.airlineCodes[0];
            const color = AIRLINE_HEX_COLORS[primaryCode] ?? DEFAULT_HEX_COLOR;
            const isHighlighted =
              selectedAirline === 'all' || route.airlineCodes.includes(selectedAirline);
            const isHovered = hoveredRoute === route.destination;

            const pathD = arcPath(icnPos, destPos);
            const strokeW = route.isCargo && !route.isPassenger ? 2.5 : 2;

            return (
              <g key={route.destination}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? strokeW + 1.5 : strokeW}
                  strokeDasharray={
                    route.isPassenger && !route.isCargo ? '8 3' : 'none'
                  }
                  opacity={isHighlighted ? (isHovered ? 1 : 0.8) : 0.15}
                  strokeLinecap="round"
                  filter={isHovered ? 'url(#route-glow)' : isHighlighted ? 'url(#route-soft-glow)' : undefined}
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
          <circle cx={icnPos.x} cy={icnPos.y} r="22" fill="url(#icn-pulse)" className="animate-ping" style={{ animationDuration: '2s' }} />
          <circle cx={icnPos.x} cy={icnPos.y} r="14" fill="url(#icn-pulse)" className="animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          <circle cx={icnPos.x} cy={icnPos.y} r="7" fill="#3b82f6" stroke="white" strokeWidth="2" />
          <text x={icnPos.x} y={icnPos.y - 14} textAnchor="middle" fill="white" fontSize="11" fontWeight="800" className="select-none">
            ICN
          </text>
          <text x={icnPos.x} y={icnPos.y + 18} textAnchor="middle" fill="#94a3b8" fontSize="6" className="select-none">
            SEOUL
          </text>

          {/* Destination dots */}
          {routes.map((route) => {
            const destPos = airportPos(route.destination);
            if (!destPos) return null;

            const primaryCode = route.airlineCodes[0];
            const color = AIRLINE_HEX_COLORS[primaryCode] ?? DEFAULT_HEX_COLOR;
            const isHighlighted =
              selectedAirline === 'all' || route.airlineCodes.includes(selectedAirline);
            const isHovered = hoveredRoute === route.destination;

            return (
              <g
                key={`dot-${route.destination}`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handleRouteHover(route.destination, e)}
                onMouseMove={(e) => handleRouteHover(route.destination, e)}
                onMouseLeave={() => handleRouteHover(null)}
              >
                <circle
                  cx={destPos.x}
                  cy={destPos.y}
                  r={isHovered ? 6 : 4}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.5"
                  opacity={isHighlighted ? (isHovered ? 1 : 0.85) : 0.2}
                  className="transition-all duration-200"
                />
                <circle
                  cx={destPos.x}
                  cy={destPos.y}
                  r={isHovered ? 3 : 2}
                  fill="white"
                  opacity={isHighlighted ? (isHovered ? 1 : 0.9) : 0.25}
                  className="transition-all duration-200"
                />
                <text
                  x={destPos.x}
                  y={destPos.y - (isHovered ? 10 : 8)}
                  textAnchor="middle"
                  fill="white"
                  fontSize={isHovered ? '9' : '7'}
                  fontWeight={isHovered ? '700' : '500'}
                  opacity={isHighlighted ? (isHovered ? 1 : 0.75) : 0.2}
                  className="select-none transition-all duration-200"
                >
                  {route.destination}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredRoute && hoveredRouteInfo && tooltipPos && (
          <div
            className="absolute pointer-events-none z-10 bg-gray-900/95 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-white shadow-xl border border-white/10"
            style={{
              left: Math.min(tooltipPos.x + 12, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 300),
              top: tooltipPos.y - 10,
              transform: 'translateY(-100%)',
            }}
          >
            <div className="font-semibold text-sm">
              {isKo
                ? (AIRPORTS[hoveredRoute]?.cityKo ?? hoveredRoute)
                : (AIRPORTS[hoveredRoute]?.city ?? hoveredRoute)}
              <span className="ml-1.5 text-white/50 font-normal">({hoveredRoute})</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-white/70">
              {hoveredRouteInfo.airlineCodes.map((code) => {
                const airline = airlines.find((a) => a.code === code);
                const badgeColor = AIRLINE_HEX_COLORS[code] ?? DEFAULT_HEX_COLOR;
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
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
        {legendData.map((item) => {
          const color = AIRLINE_HEX_COLORS[item.code] ?? DEFAULT_HEX_COLOR;
          const isActive = selectedAirline === item.code;
          const tailwindColors = AIRLINE_COLORS[item.code];
          return (
            <button
              key={item.code}
              onClick={() => onAirlineSelect(item.code)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all border
                ${
                  isActive
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
