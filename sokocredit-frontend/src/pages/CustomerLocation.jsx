import { useEffect, useState } from 'react';
import { MapPin, Route, Navigation, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import AppShell from '../components/AppShell';
import '../lib/leafletIcons';
import { fetchCustomerLocations, optimizeRoute } from '../features/location/gpsApi';

export default function CustomerLocation() {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    fetchCustomerLocations()
      .then(setLocations)
      .catch((err) => setError(err.response?.data?.error || 'Failed to load customer locations.'))
      .finally(() => setIsLoading(false));
  }, []);

  function optimize() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    setIsOptimizing(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { route, totalDistanceKm, unavailable } = await optimizeRoute({
            startLat: position.coords.latitude,
            startLng: position.coords.longitude,
          });
          if (unavailable) {
            setError('Backend unreachable. Try again once the API is reachable.');
          } else {
            setNotice(`Optimized route: ${route.length} stop${route.length === 1 ? '' : 's'}, ${totalDistanceKm.toFixed(1)} km total.`);
          }
        } catch (err) {
          setError(err.response?.data?.error || 'Failed to optimize the route.');
        } finally {
          setIsOptimizing(false);
        }
      },
      () => {
        setError('Location access was denied. Enable it to optimize a route from your current position.');
        setIsOptimizing(false);
      },
    );
  }

  return (
    <AppShell title="Customer Locations" subtitle="GPS tracking and route optimization for agents and customers.">
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Active Locations</p>
          <p className="font-display text-2xl font-semibold text-green-600">{locations.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Tracked</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{locations.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={optimize} disabled={isOptimizing} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm disabled:opacity-60">
            {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Route size={16} />} Optimize Route
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={() => setMapVisible((visible) => !visible)} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
            <Navigation size={16} /> View Map
          </button>
        </div>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}
      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {isLoading && (
        <p className="mb-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Loading locations…</p>
      )}

      <div className="bg-white rounded-2xl border border-brand-100 p-5 mb-6">
        <h2 className="font-display font-semibold text-slate-900 mb-4">Active Tracking</h2>
        <div className="space-y-3">
          {locations.map((location) => (
            <div key={location.id} className="flex items-start justify-between p-4 rounded-lg bg-brand-50/40 hover:bg-brand-50 transition">
              <div className="flex items-start gap-3 flex-1">
                <div className={`w-3 h-3 rounded-full mt-1.5 ${location.status === 'Active' ? 'bg-green-500' : 'bg-slate-400'}`} />
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{location.name}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{location.market}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Coordinates</p>
                <p className="text-xs text-slate-600">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              </div>
            </div>
          ))}
          {!locations.length && !isLoading && (
            <p className="text-center text-sm text-slate-500 py-4">No customers with recorded GPS coordinates yet.</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Map View</h2>
          {mapVisible && locations.length ? (
            <div className="w-full h-64 rounded-lg overflow-hidden">
              <MapContainer
                center={[locations[0].lat, locations[0].lng]}
                zoom={12}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map((location) => (
                  <Marker key={location.id} position={[location.lat, location.lng]}>
                    <Popup>
                      <strong>{location.name}</strong>
                      <br />
                      {location.market}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="w-full h-64 bg-brand-50 rounded-lg flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MapPin size={32} className="mx-auto mb-2 text-brand-300" />
                <p className="text-sm">{locations.length ? 'Select "View Map" to show the map preview' : 'No locations to show yet'}</p>
                <p className="text-xs text-slate-400 mt-1">OpenStreetMap</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Geofence Alerts</h2>
          <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            Geofencing isn't wired to live data yet — there's no backend model for it. This panel is a placeholder for a future feature.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
