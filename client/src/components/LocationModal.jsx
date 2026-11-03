import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { MapPin, Navigation, CheckCircle2, AlertCircle, X, Compass, ShieldCheck } from 'lucide-react';
import L from 'leaflet';

export default function LocationModal() {
  const {
    isLocationModalOpen,
    setIsLocationModalOpen,
    userLocation,
    setUserLocation,
    autoFetchCustomerLocation,
    isDetectingLocation,
    settings,
    checkServiceability,
    customerUser,
    setCustomerUser
  } = useStore();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const storeMarkerRef = useRef(null);
  const circleRef = useRef(null);

  const [tempLat, setTempLat] = useState(userLocation.lat);
  const [tempLng, setTempLng] = useState(userLocation.lng);
  const [addressLine, setAddressLine] = useState(userLocation.addressText || '');
  const [landmark, setLandmark] = useState(userLocation.landmark || '');
  const [label, setLabel] = useState(userLocation.label || 'Home');
  const [isDetecting, setIsDetecting] = useState(false);

  // Sync local form state whenever LocationModal opens or userLocation changes externally
  useEffect(() => {
    if (isLocationModalOpen) {
      setTempLat(userLocation.lat);
      setTempLng(userLocation.lng);
      setAddressLine(userLocation.addressText || '');
      setLandmark(userLocation.landmark || '');
      setLabel(userLocation.label || 'Home');

      if (!userLocation.isAutoDetected) {
        handleDetectLocation();
      }
    }
  }, [isLocationModalOpen, userLocation.lat, userLocation.lng, userLocation.addressText, userLocation.isAutoDetected]);

  // Quick preset locations to test boundaries easily (Khair & surrounds)
  const presetLocations = [
    {
      name: 'Khair Main Market (Near Hub)',
      lat: 27.941887,
      lng: 77.843715,
      hint: '~0.1 km, ₹20 Fee'
    },
    {
      name: 'Somna Road Colony',
      lat: 27.9550,
      lng: 77.8460,
      hint: '~1.3 km, ₹20 Fee'
    },
    {
      name: 'Aligarh Road Bypass',
      lat: 27.9300,
      lng: 77.8650,
      hint: '~3.4 km, ₹40 Fee'
    },
    {
      name: 'Tappal Road Rural Hub',
      lat: 27.9650,
      lng: 77.7800,
      hint: '~6.8 km, ₹60 Fee'
    },
    {
      name: 'Aligarh City Center (Out of Zone)',
      lat: 27.8974,
      lng: 78.0880,
      hint: 'Beyond 10 km (~25 km, Blocked)'
    },
    {
      name: 'Palwal Bypass (Out of Zone)',
      lat: 28.1400,
      lng: 77.3200,
      hint: 'Beyond 10 km (~55 km, Blocked)'
    }
  ];

  // Initialize Leaflet map
  useEffect(() => {
    if (!isLocationModalOpen || !mapContainerRef.current || !settings) return;

    // Fix default marker icon in leaflet
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const storeLat = Number(settings.store_lat) || 27.941887;
    const storeLng = Number(settings.store_lng) || 77.843715;
    const radiusMeters = (Number(settings.max_radius_km) || 10) * 1000;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([tempLat, tempLng], 14);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Store Marker (Red store icon)
      const storeIcon = L.divIcon({
        className: 'custom-store-pin',
        html: `<div style="background-color: #ea580c; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; font-weight: bold;">🏬</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const sMarker = L.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup(`<b>${settings.store_name}</b><br/>${settings.store_address}<br/><b>Delivery Radius: ${settings.max_radius_km} km</b>`);
      storeMarkerRef.current = sMarker;

      // Store Radius Circle (Green filled 10km circle)
      const circle = L.circle([storeLat, storeLng], {
        color: '#16a34a',
        fillColor: '#22c55e',
        fillOpacity: 0.12,
        radius: radiusMeters,
        weight: 2,
        dashArray: '4, 6'
      }).addTo(map);
      circleRef.current = circle;

      // Customer Draggable Marker
      const customerMarker = L.marker([tempLat, tempLng], {
        draggable: true
      }).addTo(map);
      markerRef.current = customerMarker;

      customerMarker.bindPopup('Drag me to set your delivery pin!').openPopup();

      customerMarker.on('dragend', function () {
        const position = customerMarker.getLatLng();
        setTempLat(position.lat);
        setTempLng(position.lng);
        checkServiceability(position.lat, position.lng);
        reverseGeocode(position.lat, position.lng);
      });

      // Map click also moves marker
      map.on('click', (e) => {
        customerMarker.setLatLng(e.latlng);
        setTempLat(e.latlng.lat);
        setTempLng(e.latlng.lng);
        checkServiceability(e.latlng.lat, e.latlng.lng);
        reverseGeocode(e.latlng.lat, e.latlng.lng);
      });
    } else {
      mapInstanceRef.current.invalidateSize();
      if (storeMarkerRef.current) {
        storeMarkerRef.current.setLatLng([storeLat, storeLng]);
        storeMarkerRef.current.setPopupContent(`<b>${settings.store_name}</b><br/>${settings.store_address}<br/><b>Delivery Radius: ${settings.max_radius_km} km</b>`);
      }
      if (circleRef.current) {
        circleRef.current.setLatLng([storeLat, storeLng]);
        circleRef.current.setRadius(radiusMeters);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([tempLat, tempLng]);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
        storeMarkerRef.current = null;
        circleRef.current = null;
      }
    };
  }, [isLocationModalOpen, settings?.store_lat, settings?.store_lng, settings?.max_radius_km]);

  // Update marker position when tempLat/tempLng change
  useEffect(() => {
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([tempLat, tempLng]);
      mapInstanceRef.current.panTo([tempLat, tempLng]);
    }
  }, [tempLat, tempLng]);

  // Reverse geocoding simulation with OpenStreetMap Nominatim or fallback
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: { 'User-Agent': 'GhartakKart Delivery App' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          setAddressLine(data.display_name.split(',').slice(0, 4).join(', '));
        }
      }
    } catch {
      // fallback
    }
  };

  // Browser Geolocation API
  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const loc = await autoFetchCustomerLocation({ silent: false });
      if (loc && loc.lat && loc.lng) {
        setTempLat(loc.lat);
        setTempLng(loc.lng);
        if (loc.addressText) setAddressLine(loc.addressText);
      }
    } catch (err) {
      console.warn('Geolocation detection in modal failed:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setTempLat(preset.lat);
    setTempLng(preset.lng);
    setAddressLine(preset.name);
    checkServiceability(preset.lat, preset.lng);
  };

  const handleConfirmLocation = () => {
    checkServiceability(tempLat, tempLng);

    setUserLocation(prev => ({
      ...prev,
      lat: tempLat,
      lng: tempLng,
      addressText: addressLine || 'Selected Location',
      landmark: landmark,
      label: label,
      isAutoDetected: true
    }));

    // Add to customer's saved addresses
    if (customerUser) {
      const newAddress = {
        id: `addr-${Date.now()}`,
        label,
        line1: addressLine || 'Saved Location',
        landmark,
        city: 'Khair',
        pincode: '202138',
        lat: tempLat,
        lng: tempLng
      };
      setCustomerUser(prev => ({
        ...prev,
        addresses: [newAddress, ...(prev.addresses || [])]
      }));
    }

    setIsLocationModalOpen(false);
  };

  if (!isLocationModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Choose Delivery Location</h2>
              <p className="text-xs text-gray-500">Service radius: 0 to {settings?.max_radius_km || 10} km from our central hub</p>
            </div>
          </div>
          <button
            onClick={() => setIsLocationModalOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Map + Details */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Map Column (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Auto Fetch GPS Banner Button */}
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Navigation className={`w-4 h-4 ${isDetecting ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Auto-Detect GPS Location</h4>
                  <p className="text-[11px] text-emerald-800">Fetch your live GPS coordinates with 1-click high accuracy</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-emerald-600/30 transition-all shrink-0"
              >
                <Navigation className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />
                <span>{isDetecting ? 'Fetching Live GPS...' : '🎯 Auto-Fetch Exact Location'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-600" />
                Interactive Map (Store circle in green, drag pin to fine-tune)
              </span>
            </div>

            {/* Map Container */}
            <div className="w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200 relative shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full" />
            </div>

            {/* Quick Presets for Demo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">⚡ Quick Test Locations (Click to test zones):</p>
              <div className="flex flex-wrap gap-2">
                {presetLocations.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="text-xs px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg border border-gray-200 font-medium transition-all text-left flex items-center gap-1"
                  >
                    <span>{p.name}</span>
                    <span className="text-[10px] text-gray-500 font-normal">({p.hint})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Delivery Details & Status Column (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {/* Real-time Deliverability Status Box */}
            <div className={`p-4 rounded-xl border-2 transition-all ${
              userLocation.deliverable
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-rose-50/80 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-start gap-3">
                {userLocation.deliverable ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-sm">
                    {userLocation.deliverable ? 'Deliverable to this Address' : 'Outside Service Zone'}
                  </h3>
                  <div className="text-xs mt-1.5 leading-relaxed space-y-1">
                    {userLocation.deliverable ? (
                      <>
                        <p>
                          Distance from store: <span className="font-extrabold">{userLocation.distance_km} km</span>
                        </p>
                        <p>
                          Minimum Order Value: <span className="font-extrabold">₹{userLocation.min_order || 150}</span>
                        </p>
                        <p>
                          Standard Delivery Fee: <span className="font-extrabold text-brand-700">₹{userLocation.base_fee ?? userLocation.fee}</span>
                        </p>
                        {userLocation.free_above > 0 && (
                          <div className="mt-2 p-2.5 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-sm flex items-center justify-between gap-2">
                            <span>🚚 Min Order for ₹0 (FREE) Delivery:</span>
                            <span className="bg-yellow-300 text-amber-950 px-2.5 py-0.5 rounded-lg text-xs font-black">
                              ₹{userLocation.free_above}+
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p>{userLocation.reason || `Sorry, we only deliver within ${settings?.max_radius_km || 10} km.`}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Distance-Wise Minimum Order & Zero Delivery Fee Slab Table */}
            {(settings?.fee_slabs || []).length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                    <span>🚚 Zero Delivery Fee Chart (By Distance)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    ₹0 Delivery Slabs
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-amber-200 text-gray-600 font-bold">
                        <th className="py-1 pr-2">Zone</th>
                        <th className="py-1 px-2">Min Order</th>
                        <th className="py-1 px-2">Fee</th>
                        <th className="py-1 pl-2 text-right text-emerald-800">₹0 Free Delivery On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {(settings?.fee_slabs || []).map((slab, idx) => {
                        const dist = Number(userLocation.distance_km) || 0;
                        const isCurrentZone = userLocation.deliverable && dist >= slab.min_km && dist <= slab.max_km;
                        return (
                          <tr
                            key={idx}
                            className={isCurrentZone ? 'bg-emerald-100/80 font-extrabold text-emerald-950' : 'text-gray-700 font-medium'}
                          >
                            <td className="py-1.5 pr-2 whitespace-nowrap">
                              {slab.min_km}–{slab.max_km} km {isCurrentZone && <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full ml-1">Your Zone</span>}
                            </td>
                            <td className="py-1.5 px-2">₹{slab.min_order}</td>
                            <td className="py-1.5 px-2">₹{slab.fee}</td>
                            <td className="py-1.5 pl-2 text-right font-black text-emerald-700">
                              Orders ≥ ₹{slab.free_above}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Address Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Complete Address / House No. / Flat
                </label>
                <textarea
                  rows="2"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="e.g. Flat 302, Green Avenue, Main Road"
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near HDFC Bank ATM"
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Save Address As</label>
                <div className="flex gap-2">
                  {['Home', 'Work', 'Other'].map(lbl => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setLabel(lbl)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        label === lbl
                          ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleConfirmLocation}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                Confirm & Set Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
