import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FlightSchedule, AirlineInfo } from '@/config/flight-schedules';
import { AIRLINE_COLORS, AIRLINE_HEX_COLORS, DEFAULT_HEX_COLOR } from '@/config/flight-schedules';
import { AIRPORTS } from '@/config/airports';
import { loadGoogleMaps3D, type Maps3DLib } from '@/lib/googleMapsLoader';
import { useAggregatedRoutes } from './hooks/useAggregatedRoutes';
import { useAirlineLegend } from './hooks/useAirlineLegend';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const mapRef = useRef<google.maps.maps3d.Map3DElement | null>(null);
  const libRef = useRef<Maps3DLib | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isKo = language === 'ko';
  const { t } = useLanguage();

  // Track previous selectedAirline to detect changes for camera animation
  const prevAirlineRef = useRef(selectedAirline);

  /* ---- Aggregate routes ---- */
  const routes = useAggregatedRoutes(schedules);

  /* ---- Legend data ---- */
  const legendData = useAirlineLegend(airlines, schedules, isKo);

  /* ---- Helper: add markers and polylines to map element ---- */
  const addMarkersAndRoutes = useCallback(
    (map3d: google.maps.maps3d.Map3DElement) => {
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
        const color = AIRLINE_HEX_COLORS[primaryCode] ?? DEFAULT_HEX_COLOR;

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
          });
          // Use 'path' instead of deprecated 'coordinates'
          polyline.path = arcPoints.map((p) => ({
            lat: p.lat,
            lng: p.lng,
            altitude: p.altitude,
          }));

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

    // Create Map3DElement — start camera at EWR (farthest airport)
    const ewr = AIRPORTS.EWR;
    const map3d = new Map3DElement({
      center: { lat: ewr.lat, lng: ewr.lng, altitude: 0 },
      range: 3000000,
      tilt: 55,
      heading: 30,
      mode: 'SATELLITE',
    });
    map3d.style.width = '100%';
    map3d.style.height = '100%';

    container.appendChild(map3d);
    mapRef.current = map3d;

    // Wait for map render, add markers, then fly from EWR → ICN
    let rafId: number;
    const waitForMap = () => {
      if (map3d.isConnected && map3d.offsetHeight > 0) {
        addMarkersAndRoutes(map3d);

        // Phase 1: Pause briefly at EWR to show the network
        setTimeout(() => {
          try {
            // Phase 2: Zoom out to show the full globe while flying
            map3d.flyCameraTo({
              endCamera: {
                center: { lat: 45, lng: -170, altitude: 0 },
                range: 18000000,
                tilt: 30,
                heading: -60,
              },
              durationMillis: 3000,
            });

            // Phase 3: Fly to ICN hub with zoom-in effect
            map3d.addEventListener('gmp-animationend', () => {
              try {
                map3d.flyCameraTo({
                  endCamera: {
                    center: { lat: AIRPORTS.ICN.lat, lng: AIRPORTS.ICN.lng, altitude: 0 },
                    range: 4500000,
                    tilt: 58,
                    heading: -20,
                  },
                  durationMillis: 5000,
                });
              } catch { /* ignore */ }
            }, { once: true });
          } catch { /* flyCameraTo may not be available */ }
        }, 1500);
      } else {
        rafId = requestAnimationFrame(waitForMap);
      }
    };
    rafId = requestAnimationFrame(waitForMap);

    return () => {
      cancelAnimationFrame(rafId);
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
      // Reset to ICN hub view (same as opening animation final position)
      try {
        map3d.flyCameraTo({
          endCamera: {
            center: { lat: AIRPORTS.ICN.lat, lng: AIRPORTS.ICN.lng, altitude: 0 },
            range: 4500000,
            tilt: 58,
            heading: -20,
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
