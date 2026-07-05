import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { SearchOverlay } from './SearchOverlay';
import { useDebounce } from '../hooks/useDebounce';
import { DEFAULT_LAT, DEFAULT_LNG } from '../constants/config';

import { useRef, useCallback } from 'react';

// Helper component for map clicks
const MapEvents = ({ onMapClick, isSolving }) => {
  const onMapClickRef = useRef(onMapClick);
  const isSolvingRef = useRef(isSolving);
  onMapClickRef.current = onMapClick;
  isSolvingRef.current = isSolving;
  
  useMapEvents({
    click(e) {
      if (!isSolvingRef.current) {
        onMapClickRef.current(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

// Helper component to center map on search result
const MapCenter = ({ center, onFlown }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14);
      onFlown();
    }
  }, [center, map]);
  return null;
};

export const MapView = ({ theme, showSidebar, locations, optimizedPath, routeGeometry, isSolving, onMapClick }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
    const run = async () => {
        if(debouncedSearch.length < 3) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearch)}&limit=5`);
        const d = await res.json();
        setSearchResults(d);
        setShowDropdown(true);
    };
    run();
  }, [debouncedSearch]);

  const tileUrl = theme === 'dark' 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const createIcon = (loc, idx) => {
    let label = idx === 0 ? 'D' : idx;
    if(optimizedPath.length > 0) {
        const routeIdx = optimizedPath.indexOf(idx);
        if(routeIdx !== -1) label = routeIdx + 1;
    }
    const color = loc.type === 'depot' ? '#002D72' : '#009CDE';
    const html = `
        <div style="background:${color}; width:24px; height:24px; border-radius:50%; border:2px solid white; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold; font-size:10px; box-shadow:0 2px 4px rgba(0,0,0,0.3);">
            ${label}
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [24,24], iconAnchor: [12,12] });
  };

  const getPolylinePositions = () => {
    if (optimizedPath.length === 0) return [];
    const pts = optimizedPath.map(i => [locations[i].lat, locations[i].lng]);
    pts.push([locations[optimizedPath[0]].lat, locations[optimizedPath[0]].lng]);
    return pts;
  };

  const handleSelectSearch = (lat, lon) => {
    setMapCenter([parseFloat(lat), parseFloat(lon)]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className={`flex-1 relative transition-all duration-300 ${showSidebar ? 'md:ml-80' : 'ml-0'} mt-14 bg-gray-200 z-0`}>
      <MapContainer center={[DEFAULT_LAT, DEFAULT_LNG]} zoom={13} className="w-full h-full" zoomControl={false}>
        <TileLayer key={tileUrl} url={tileUrl} attribution="&copy; OpenStreetMap" />
        <MapEvents onMapClick={onMapClick} isSolving={isSolving} />
        {mapCenter && <MapCenter center={mapCenter} onFlown={() => setMapCenter(null)} />}
        
        {locations.map((loc, idx) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={createIcon(loc, idx)}>
                <Popup><b>{loc.type.toUpperCase()}</b><br/>{loc.address}</Popup>
            </Marker>
        ))}

        {optimizedPath.length > 0 && (
            <Polyline 
                positions={routeGeometry && routeGeometry.length > 0 ? routeGeometry : getPolylinePositions()} 
                color={isSolving ? '#93c5fd' : '#009CDE'} 
                weight={routeGeometry && routeGeometry.length > 0 ? 5 : 4} 
                dashArray={isSolving ? '5,10' : null} 
            />
        )}
      </MapContainer>
      
      <SearchOverlay 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showDropdown={showDropdown}
        setShowDropdown={setShowDropdown}
        searchResults={searchResults}
        theme={theme}
        onSelect={handleSelectSearch}
      />
    </div>
  );
};
