import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Clock,
  Bed,
  ShieldCheck,
  AlertTriangle,
  Locate,
  Layers,
  Compass,
  ArrowRight,
  TrendingUp,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Ambulance as AmbulanceIcon,
  Building2,
  Activity,
  HeartPulse
} from 'lucide-react';
import { Ambulance, Incident, Hospital, IncidentStatus } from '../../types';
import { useMedMesh } from '../../store/useMedMeshStore';

interface AmbulanceMapViewProps {
  ambulance: Ambulance;
  incident?: Incident | null;
  destinationHospital?: Hospital | null;
  journeyStage?: IncidentStatus;
  fullScreen?: boolean;
  hideBottomControls?: boolean;
  onOpenHospitalSelection?: () => void;
  onSelectHospitalQuick?: (hospitalId: string, careUnit: string) => void;
}

interface TurnManeuver {
  instruction: string;
  distanceMeters: number;
  modifier?: string;
}

interface NavigationState {
  distanceKm: number;
  etaMinutes: number;
  currentStreet: string;
  nextManeuver: TurnManeuver;
  trafficStatus: 'Low' | 'Moderate' | 'Heavy';
  polyline: [number, number][];
}

type MapTileStyle = 'google-roads' | 'satellite' | 'osm';

export const AmbulanceMapView: React.FC<AmbulanceMapViewProps> = ({
  ambulance,
  incident,
  destinationHospital,
  journeyStage = 'En Route',
  fullScreen = false,
  hideBottomControls = false,
  onOpenHospitalSelection,
  onSelectHospitalQuick
}) => {
  const { hospitals, updateAmbulanceLocation } = useMedMesh();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const ambulanceMarkerRef = useRef<L.Marker | null>(null);

  // Map Tile Style: Google Roads (Carto Voyager), Satellite Hybrid, OSM
  const [tileStyle, setTileStyle] = useState<MapTileStyle>('google-roads');

  // Live GPS tracking
  const [currentGps, setCurrentGps] = useState<[number, number]>([ambulance.latitude, ambulance.longitude]);
  const [isGpsAcquired, setIsGpsAcquired] = useState(false);
  const [navState, setNavState] = useState<NavigationState>({
    distanceKm: 0,
    etaMinutes: 0,
    currentStreet: 'Locating route...',
    nextManeuver: { instruction: 'Proceed along route', distanceMeters: 300 },
    trafficStatus: 'Low',
    polyline: []
  });

  // Calculate Haversine distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(1));
  };

  // Determine target waypoint based strictly on journey stage
  // Leg 1: When 'En Route' / 'ACCEPTED' / 'EN_ROUTE_SCENE' or 'On Scene' / 'AT_SCENE', waypoint is Incident Scene
  // Leg 2: When 'Transporting' / 'EN_ROUTE_HOSPITAL' and destinationHospital selected, waypoint is Receiving Hospital
  const isTransportingToHospital =
    (journeyStage === 'Transporting' || journeyStage === 'EN_ROUTE_HOSPITAL' || journeyStage === 'Arrived' || journeyStage === 'ARRIVED_HOSPITAL') &&
    !!destinationHospital;

  const targetCoords = useMemo<[number, number]>(() => {
    if (isTransportingToHospital && destinationHospital) {
      return [destinationHospital.latitude, destinationHospital.longitude];
    }
    if (incident) {
      return [incident.latitude, incident.longitude];
    }
    return [ambulance.latitude, ambulance.longitude];
  }, [isTransportingToHospital, destinationHospital, incident, ambulance]);

  const destinationLabel = useMemo<string>(() => {
    if (isTransportingToHospital && destinationHospital) {
      return destinationHospital.name;
    }
    if (incident) {
      return incident.locationName;
    }
    return 'Patrol Corridor';
  }, [isTransportingToHospital, destinationHospital, incident]);

  const navigationPhaseLabel = useMemo<string>(() => {
    if (isTransportingToHospital) {
      return 'LEG 2: PATIENT TRANSPORT TO HOSPITAL';
    }
    if (journeyStage === 'On Scene' || journeyStage === 'AT_SCENE' || journeyStage === 'PATIENT_ONBOARD') {
      return 'ON SCENE: TRIAGE & STABILIZATION';
    }
    return 'LEG 1: EMERGENCY RESPONSE TO INCIDENT SCENE';
  }, [isTransportingToHospital, journeyStage]);

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: currentGps,
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // Default Google Maps / Carto Voyager Roads
      const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup
    };
  }, []);

  // Update Tile Layer when tileStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let newUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    let subdomains = 'abcd';
    let maxZoom = 19;

    if (tileStyle === 'satellite') {
      newUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      subdomains = '';
      maxZoom = 18;
    } else if (tileStyle === 'osm') {
      newUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      subdomains = 'abc';
      maxZoom = 19;
    }

    const newLayer = L.tileLayer(newUrl, { maxZoom, subdomains }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // 2. Fetch OSRM Real Road Route
  useEffect(() => {
    let isMounted = true;

    const fetchRealRoute = async () => {
      const [startLat, startLng] = currentGps;
      const [destLat, destLng] = targetCoords;

      // If start and destination are essentially identical, do not query route
      if (Math.abs(startLat - destLat) < 0.0001 && Math.abs(startLng - destLng) < 0.0001) {
        return;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;

      try {
        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (!isMounted) return;

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coordinates: [number, number][] = route.geometry.coordinates.map(
            (coord: [number, number]) => [coord[1], coord[0]] as [number, number]
          );

          const distanceKm = parseFloat((route.distance / 1000).toFixed(1));
          // Emergency response travel time (~40 km/h with priority clearance)
          const etaMinutes = Math.max(1, Math.round(distanceKm * 1.8 + 1));

          // First turn instruction
          const firstStep = route.legs?.[0]?.steps?.[0];
          const instruction = firstStep?.maneuver?.type
            ? `${firstStep.maneuver.type} onto ${firstStep.name || 'main road'}`
            : `Proceed directly towards ${destinationLabel}`;

          setNavState({
            distanceKm,
            etaMinutes,
            currentStreet: firstStep?.name || 'Emergency Transit Corridor',
            nextManeuver: {
              instruction: instruction,
              distanceMeters: Math.round(firstStep?.distance || 300)
            },
            trafficStatus: distanceKm > 8 ? 'Heavy' : distanceKm > 4 ? 'Moderate' : 'Low',
            polyline: coordinates
          });

          // Draw real road polyline on map
          if (mapInstanceRef.current) {
            if (routeLayerRef.current) {
              mapInstanceRef.current.removeLayer(routeLayerRef.current);
            }

            // High-visibility glowing emergency polyline
            const polylineColor = isTransportingToHospital ? '#10B981' : '#2563EB'; // Emerald for hospital leg, Blue for scene leg
            const polyline = L.polyline(coordinates, {
              color: polylineColor,
              weight: 6,
              opacity: 0.92,
              lineJoin: 'round'
            }).addTo(mapInstanceRef.current);

            routeLayerRef.current = polyline;

            // Fit bounds with padding for HUD overlay
            mapInstanceRef.current.fitBounds(polyline.getBounds(), {
              paddingTopLeft: [40, 140],
              paddingBottomRight: [40, 80],
              maxZoom: 16
            });
          }
        }
      } catch (e) {
        console.warn('OSRM router request failed or network busy', e);
      }
    };

    fetchRealRoute();

    return () => {
      isMounted = false;
    };
  }, [currentGps, targetCoords, destinationLabel, isTransportingToHospital]);

  // 3. Render Markers: Ambulance, Incident, and Nearby District Hospitals
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    // 1. Ambulance Location Marker
    const ambulanceIcon = L.divIcon({
      className: 'custom-ambulance-marker',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-blue-600/30 rounded-full animate-ping"></div>
          <div class="w-10 h-10 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-white ring-2 ring-blue-500 font-bold">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7h2m14 0a2 2 0 100 4 2 2 0 000-4zm-12 0a2 2 0 100 4 2 2 0 000-4z"></path>
            </svg>
          </div>
          <div class="absolute -bottom-6 bg-slate-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-black whitespace-nowrap shadow-lg border border-slate-700">
            ${ambulance.code} (GPS)
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const ambMarker = L.marker(currentGps, { icon: ambulanceIcon, zIndexOffset: 1000 }).addTo(markersGroup);
    ambulanceMarkerRef.current = ambMarker;

    // 2. Incident Scene Marker (Displayed when NOT transporting to hospital)
    if (!isTransportingToHospital && incident) {
      const incidentIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-12 h-12 bg-rose-600/35 rounded-full animate-ping"></div>
            <div class="w-10 h-10 bg-rose-600 text-white rounded-2xl shadow-2xl flex items-center justify-center border-2 border-white font-black text-lg">
              🚨
            </div>
            <div class="absolute -bottom-6 bg-rose-900 text-white font-bold text-[9px] px-2 py-0.5 rounded whitespace-nowrap shadow-lg border border-rose-700">
              ${incident.category}
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const incMarker = L.marker([incident.latitude, incident.longitude], { icon: incidentIcon }).addTo(markersGroup);
      incMarker.bindPopup(`
        <div class="p-2 space-y-1 text-slate-900">
          <div class="font-black text-xs text-rose-700 uppercase">Emergency Incident Scene</div>
          <div class="font-bold text-sm text-slate-900">${incident.category}</div>
          <p class="text-xs text-slate-600">${incident.locationName}</p>
          <div class="text-[11px] font-semibold text-slate-500">Patient: ${incident.patientName || 'Emergency Patient'}</div>
        </div>
      `);
    }

    // 3. Destination Hospital Marker (ONLY displayed during Stage 5/6 Transport to Hospital!)
    if (isTransportingToHospital && destinationHospital) {
      const hospIcon = L.divIcon({
        className: 'custom-destination-hospital-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-14 h-14 bg-emerald-500/30 rounded-full animate-ping"></div>
            <div class="w-11 h-11 rounded-2xl shadow-2xl flex items-center justify-center text-xl font-bold border-2 border-white ring-4 ring-emerald-400/50 bg-emerald-600 text-white">
              🏥
            </div>
            <div class="absolute -bottom-6 bg-emerald-900 text-white font-mono text-[9px] px-2 py-0.5 rounded font-black whitespace-nowrap shadow border border-emerald-700">
              ${destinationHospital.name} (Emergency Bay)
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      const hospMarker = L.marker([destinationHospital.latitude, destinationHospital.longitude], {
        icon: hospIcon,
        zIndexOffset: 900
      }).addTo(markersGroup);

      hospMarker.bindPopup(`
        <div class="p-2 space-y-1 text-slate-900">
          <div class="font-black text-xs text-emerald-700 uppercase">Destination Hospital (ER Bay)</div>
          <div class="font-bold text-sm text-slate-900">${destinationHospital.name}</div>
          <p class="text-xs text-slate-600">${destinationHospital.address}</p>
          <div class="text-xs font-semibold text-emerald-700">Emergency Intake Bay Reserved</div>
        </div>
      `);
    }
  }, [currentGps, incident, destinationHospital, hospitals, ambulance.code, isTransportingToHospital]);

  // Acquire real browser/device GPS coordinates
  const handleAcquireDeviceGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const newCoord: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setCurrentGps(newCoord);
          setIsGpsAcquired(true);
          updateAmbulanceLocation(ambulance.id, pos.coords.latitude, pos.coords.longitude);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(newCoord, 15, { duration: 1.2 });
          }
        },
        err => {
          console.warn('Device GPS unavailable or permission denied:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  return (
    <div className={`w-full bg-slate-950 overflow-hidden ${fullScreen ? 'absolute inset-0 h-full' : 'relative h-[620px] rounded-3xl border border-slate-800 shadow-2xl'}`}>
      {/* 1. Turn-by-Turn Maneuver HUD Banner (Top Overlay) */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pointer-events-none">
        {/* Left: Turn-by-Turn Instruction Banner */}
        <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-4 max-w-xl">
          <div
            className={`w-11 h-11 rounded-xl text-white flex items-center justify-center flex-shrink-0 shadow-lg ${
              isTransportingToHospital ? 'bg-emerald-600 shadow-emerald-600/30' : 'bg-blue-600 shadow-blue-600/30'
            }`}
          >
            <Navigation className="w-6 h-6 rotate-45 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {navigationPhaseLabel}
              </span>
              <span className="text-emerald-400 font-extrabold text-xs">
                In {navState.nextManeuver.distanceMeters}m
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-tight">
              {navState.nextManeuver.instruction}
            </h3>
            <span className="text-[11px] text-slate-400">
              Destination: <strong className={isTransportingToHospital ? 'text-emerald-300' : 'text-blue-300'}>{destinationLabel}</strong>
            </span>
          </div>
        </div>

        {/* Right: Real Road ETA & Traffic Metrics Pill */}
        <div className="pointer-events-auto bg-slate-950/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl border border-slate-800 shadow-2xl flex items-center space-x-4">
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Road ETA</div>
            <div className="text-xl font-black text-emerald-400">{navState.etaMinutes} min</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Road Dist</div>
            <div className="text-xl font-black text-white">{navState.distanceKm} km</div>
          </div>
          <div className="h-8 w-px bg-slate-800"></div>
          <div className="text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Traffic</div>
            <div
              className={`text-xs font-black uppercase px-2 py-0.5 rounded mt-0.5 ${
                navState.trafficStatus === 'Low'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : navState.trafficStatus === 'Moderate'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              {navState.trafficStatus}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Side Control (Locate GPS & Tile switcher) */}
      <div className="absolute right-4 top-24 z-[400] flex flex-col items-end space-y-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col items-center space-y-1">
          <button
            onClick={handleAcquireDeviceGps}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 transition"
            title="Lock Live GPS"
          >
            <Locate className="w-5 h-5" />
          </button>
          <div className="w-6 h-px bg-slate-800 my-0.5" />
          <button
            onClick={() => setTileStyle(tileStyle === 'google-roads' ? 'satellite' : 'google-roads')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 transition"
            title="Toggle Satellite / Roads"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-[1]" />

      {/* 3. Bottom Control Dock (Only shown when not overridden by Uber bottom sheet) */}
      {!hideBottomControls && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pointer-events-none">
          {/* Left: GPS Status & Device Lock */}
          <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl border border-slate-800 shadow-xl flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="font-mono font-bold text-emerald-400">
                {isGpsAcquired ? 'DEVICE GPS LOCKED' : 'CAD GPS ACTIVE'}
              </span>
            </div>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-mono text-[11px]">
              {currentGps[0].toFixed(4)}°N, {currentGps[1].toFixed(4)}°E
            </span>
            <button
              onClick={handleAcquireDeviceGps}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition flex items-center space-x-1"
              title="Lock Live Device GPS"
            >
              <Locate className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">Lock GPS</span>
            </button>
          </div>

          {/* Center: Map Style Switcher (Roads / Satellite / OSM) */}
          <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md p-1 rounded-2xl border border-slate-800 shadow-xl flex items-center space-x-1 text-xs font-bold">
            <button
              onClick={() => setTileStyle('google-roads')}
              className={`px-3 py-1.5 rounded-xl transition ${
                tileStyle === 'google-roads'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Roads
            </button>
            <button
              onClick={() => setTileStyle('satellite')}
              className={`px-3 py-1.5 rounded-xl transition ${
                tileStyle === 'satellite'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setTileStyle('osm')}
              className={`px-3 py-1.5 rounded-xl transition ${
                tileStyle === 'osm'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              OSM
            </button>
          </div>

          {/* Right: Post-Pickup Hospital Wizard Trigger */}
          {onOpenHospitalSelection && (
            <button
              onClick={onOpenHospitalSelection}
              className="pointer-events-auto bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-emerald-600/30 flex items-center space-x-2 transition active:scale-95 border border-emerald-400/30"
            >
              <Building2 className="w-4 h-4" />
              <span>
                {isTransportingToHospital ? 'Change Destination Hospital' : 'Choose Receiving Hospital (Live Beds)'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
