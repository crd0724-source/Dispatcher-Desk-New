import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapLoadRoute, MapStopPoint } from '../mapTypes.ts';
import { LoadWithRelations } from '../../loads/loadTypes.ts';
import { createStopMarkerIconHtml, createStopPopupHtml } from './MapStopMarker.tsx';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Info,
  ChevronDown,
  ChevronUp,
  Radio,
  Navigation,
  Compass,
} from 'lucide-react';

interface MapCanvasProps {
  routes: MapLoadRoute[];
  selectedLoadId: string | null;
  onSelectLoad: (loadId: string) => void;
  onOpenLoadDetail: (load: LoadWithRelations) => void;
}

export const MapCanvas: React.FC<MapCanvasProps> = ({
  routes,
  selectedLoadId,
  onSelectLoad,
  onOpenLoadDetail,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);

  const [isLegendOpen, setIsLegendOpen] = useState(true);
  const [activeTileTheme, setActiveTileTheme] = useState<'dark' | 'voyager'>('dark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // US Geographic center
    const defaultCenter: [number, number] = [38.8, -96.5];
    const defaultZoom = 4;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false, // We render custom themed controls
      attributionControl: false,
    });

    // Dark Matter tile layer for dark theme UI
    const darkTileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const tileLayer = L.tileLayer(darkTileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const polyGroup = L.layerGroup().addTo(map);
    const markerGroup = L.layerGroup().addTo(map);

    polylineGroupRef.current = polyGroup;
    layerGroupRef.current = markerGroup;
    mapInstanceRef.current = map;

    // Delegate click events inside popups to React handler
    const container = mapContainerRef.current;
    const handlePopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.map-view-load-btn');
      if (btn) {
        const loadId = btn.getAttribute('data-load-id');
        if (loadId) {
          const matchedRoute = routes.find((r) => r.load.id === loadId);
          if (matchedRoute) {
            onOpenLoadDetail(matchedRoute.load);
          }
        }
      }
    };
    container.addEventListener('click', handlePopupClick);

    // Resize observer to ensure Leaflet renders correctly across layout shifts
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('click', handlePopupClick);
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Theme when toggled
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const map = mapInstanceRef.current;
    tileLayerRef.current.remove();

    const tileUrl =
      activeTileTheme === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Keep tiles beneath markers
    newTileLayer.bringToBack();
    tileLayerRef.current = newTileLayer;
  }, [activeTileTheme]);

  // Fit bounds helper
  const fitAllVisibleBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || routes.length === 0) return;

    const allPoints: L.LatLngExpression[] = [];
    routes.forEach((r) => {
      r.stops.forEach((s) => {
        allPoints.push([s.lat, s.lng]);
      });
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 11,
        animate: true,
      });
    }
  }, [routes]);

  // Render Markers and Polylines
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = layerGroupRef.current;
    const polyGroup = polylineGroupRef.current;

    if (!map || !markerGroup || !polyGroup) return;

    markerGroup.clearLayers();
    polyGroup.clearLayers();

    if (routes.length === 0) return;

    // Draw unselected lines first, then selected on top
    routes.forEach((route) => {
      const isSelected = route.load.id === selectedLoadId;
      if (!isSelected && route.pathCoordinates.length >= 2) {
        L.polyline(route.pathCoordinates, {
          color: '#6366f1',
          weight: 2,
          opacity: 0.45,
          dashArray: '5, 8',
          lineCap: 'round',
        })
          .addTo(polyGroup)
          .on('click', () => onSelectLoad(route.load.id));
      }
    });

    // Draw selected route with glowing accent
    const selectedRoute = routes.find((r) => r.load.id === selectedLoadId);
    if (selectedRoute && selectedRoute.pathCoordinates.length >= 2) {
      // Glow underlay
      L.polyline(selectedRoute.pathCoordinates, {
        color: '#38bdf8',
        weight: 6,
        opacity: 0.35,
        lineCap: 'round',
      }).addTo(polyGroup);

      // Main line
      L.polyline(selectedRoute.pathCoordinates, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
      }).addTo(polyGroup);
    }

    // Render Markers
    routes.forEach((route) => {
      const isSelected = route.load.id === selectedLoadId;

      route.stops.forEach((stop) => {
        const iconHtml = createStopMarkerIconHtml(stop, isSelected);
        const icon = L.divIcon({
          className: 'custom-map-stop-marker',
          html: iconHtml,
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        });

        const popupHtml = createStopPopupHtml(stop, route.load.load_number);

        const marker = L.marker([stop.lat, stop.lng], { icon, zIndexOffset: isSelected ? 1000 : 100 })
          .bindPopup(popupHtml, {
            className: 'dispatchdesk-map-popup',
            maxWidth: 300,
            closeButton: true,
          })
          .addTo(markerGroup);

        marker.on('click', () => {
          onSelectLoad(route.load.id);
        });
      });
    });
  }, [routes, selectedLoadId, onSelectLoad, onOpenLoadDetail]);

  // Focus on Selected Load when selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLoadId) return;

    const selectedRoute = routes.find((r) => r.load.id === selectedLoadId);
    if (!selectedRoute || selectedRoute.stops.length === 0) return;

    const stopCoords: L.LatLngExpression[] = selectedRoute.stops.map((s) => [s.lat, s.lng]);
    if (stopCoords.length === 1) {
      map.flyTo(stopCoords[0], 9, { animate: true });
    } else if (stopCoords.length > 1) {
      const bounds = L.latLngBounds(stopCoords);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 10,
        animate: true,
      });
    }
  }, [selectedLoadId]);

  return (
    <div id="dispatch-map-canvas-container" className="relative w-full h-full min-h-[350px] bg-slate-950 overflow-hidden select-none">
      {/* Map Viewport DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Operational Disclaimer */}
      <div className="absolute top-3 left-3 right-16 sm:right-auto z-10 pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-800 text-slate-300 text-[11px] shadow-lg pointer-events-auto">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">
            <strong className="text-slate-100 font-medium">Operational Stop Visualization:</strong>{' '}
            Deterministic sequence markers &bull; Not real-time GPS telemetry
          </span>
        </div>
      </div>

      {/* Top Right Map Controls Floating Bar */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1 rounded-lg shadow-xl">
        <button
          id="map-zoom-in-btn"
          title="Zoom In"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          id="map-zoom-out-btn"
          title="Zoom Out"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-slate-800 my-0.5" />
        <button
          id="map-fit-all-btn"
          title="Fit All Visible Loads"
          onClick={fitAllVisibleBounds}
          className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          id="map-theme-toggle-btn"
          title={activeTileTheme === 'dark' ? 'Switch to Light Map' : 'Switch to Dark Map'}
          onClick={() => setActiveTileTheme((prev) => (prev === 'dark' ? 'voyager' : 'dark'))}
          className="p-2 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors cursor-pointer"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Floating Collapsible Operational Legend */}
      <div className="absolute bottom-3 left-3 z-10 max-w-[280px]">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-lg shadow-xl overflow-hidden text-xs">
          <button
            onClick={() => setIsLegendOpen((prev) => !prev)}
            className="w-full px-3 py-2 flex items-center justify-between font-semibold text-slate-300 hover:text-white bg-slate-900/60 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Map Legend</span>
            </div>
            {isLegendOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>

          {isLegendOpen && (
            <div className="p-3 border-t border-slate-800/80 space-y-2 text-[11px] text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  1
                </span>
                <span>Stop 1: Origin Pickup (Scheduled)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold shrink-0">
                  2
                </span>
                <span>Stop 2+: Final Delivery Consignee</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-bold shrink-0">
                  <Radio className="w-2.5 h-2.5" />
                </span>
                <span>Last Reported Check-Call</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <span className="w-5 h-0.5 bg-indigo-400 border-b border-dashed border-indigo-300 shrink-0"></span>
                <span className="text-[10px] text-slate-400">Stop Sequence (Visual Sequence)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
