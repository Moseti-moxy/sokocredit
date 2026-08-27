import { useState } from 'react';
import { MapPin, Route, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import AppShell from '../components/AppShell';
import '../lib/leafletIcons';

export default function CustomerLocation() {
  const [locations] = useState([
    { id: 1, name: 'Jane Wanjiru', market: 'Kiseka Market', lat: -1.2921, lng: 36.8219, lastUpdate: '2 mins ago', status: 'Active', distance: '2.5 km' },
    { id: 2, name: 'David Otieno', market: 'Kawangware Market', lat: -1.3092, lng: 36.7832, lastUpdate: '5 mins ago', status: 'Active', distance: '5.2 km' },
    { id: 3, name: 'Mary Kipchoge', market: 'Kamukunji Market', lat: -1.3159, lng: 36.8575, lastUpdate: '12 mins ago', status: 'Inactive', distance: '3.8 km' },
  ]);
  const [notice, setNotice] = useState('');
  const [mapVisible, setMapVisible] = useState(false);

  return (
    <AppShell title="Customer Locations" subtitle="GPS tracking and route optimization for agents and customers.">
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Active Locations</p>
          <p className="font-display text-2xl font-semibold text-green-600">{locations.filter(l => l.status === 'Active').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <p className="text-xs text-slate-500 mb-1">Total Tracked</p>
          <p className="font-display text-2xl font-semibold text-slate-900">{locations.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={() => setNotice(`Route optimized for ${locations.filter((location) => location.status === 'Active').length} active customer locations.`)} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
            <Route size={16} /> Optimize Route
          </button>
        </div>
        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <button type="button" onClick={() => setMapVisible((visible) => !visible)} className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium text-sm">
            <Navigation size={16} /> View Map
          </button>
        </div>
      </div>
      {notice && <p role="status" className="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</p>}

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
                  <p className="text-xs text-slate-400 mt-1">Updated {location.lastUpdate}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-brand-600 mb-2">{location.distance}</p>
                <p className="text-xs text-slate-500 mb-1">Coordinates</p>
                <p className="text-xs text-slate-600">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Map View</h2>
          {mapVisible ? (
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
                      <br />
                      Updated {location.lastUpdate}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <div className="w-full h-64 bg-brand-50 rounded-lg flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MapPin size={32} className="mx-auto mb-2 text-brand-300" />
                <p className="text-sm">Select "View Map" to show the map preview</p>
                <p className="text-xs text-slate-400 mt-1">OpenStreetMap</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-brand-100 p-5">
          <h2 className="font-display font-semibold text-slate-900 mb-4">Geofence Alerts</h2>
          <div className="space-y-3">
            {[
              { type: 'Outside Geofence', customer: 'Jane Wanjiru', time: '10 mins ago', severity: 'warning' },
              { type: 'Extended Absence', customer: 'Mary Kipchoge', time: '25 mins ago', severity: 'info' },
              { type: 'Unusual Activity', customer: 'David Otieno', time: '1 hour ago', severity: 'info' },
            ].map((alert, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${alert.severity === 'warning' ? 'bg-orange-50 border border-orange-100' : 'bg-blue-50 border border-blue-100'}`}>
                <p className={`text-sm font-medium ${alert.severity === 'warning' ? 'text-orange-700' : 'text-blue-700'}`}>
                  {alert.type}
                </p>
                <p className="text-xs text-slate-600 mt-1">{alert.customer} - {alert.time}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
