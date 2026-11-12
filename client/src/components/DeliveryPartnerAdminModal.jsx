import React, { useState } from 'react';
import { 
  Bike, ShieldCheck, MapPin, IndianRupee, Phone, CheckCircle2, 
  XCircle, Clock, AlertTriangle, ExternalLink, User, FileText, 
  CreditCard, Eye, X, Check, RefreshCw, KeyRound, Camera 
} from 'lucide-react';
import { updateNodeItemInSupabase, syncNodeToSupabase } from '../supabase.js';

export const STORE_SHIFTS = [
  'Morning Shift (07:00 AM - 12:00 PM)',
  'Afternoon Shift (12:00 PM - 05:00 PM)',
  'Evening Peak Shift (05:00 PM - 10:30 PM)',
  'Night Express Shift (10:30 PM - 02:00 AM)'
];

export function DeliveryPartnerAdminModal({ isOpen, onClose, rider, orders = [], onRiderUpdated }) {
  const [activeTab, setActiveTab] = useState('kyc'); // 'kyc' | 'location' | 'cash' | 'orders' | 'credentials'
  const [kycStatus, setKycStatus] = useState(rider?.kyc_status || 'verified');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Rider ID, Password and Shift Management States
  const [riderUsername, setRiderUsername] = useState(rider?.username || rider?.phone || '');
  const [riderPassword, setRiderPassword] = useState(rider?.password || '123456');
  const [riderShift, setRiderShift] = useState(rider?.shift || rider?.active_shift?.name || STORE_SHIFTS[0]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  React.useEffect(() => {
    if (rider) {
      setKycStatus(rider.kyc_status || 'verified');
      setRiderUsername(rider.username || rider.phone || '');
      setRiderPassword(rider.password || '123456');
      setRiderShift(rider.shift || rider.active_shift?.name || STORE_SHIFTS[0]);
    }
  }, [rider?.id]);

  if (!isOpen || !rider) return null;

  const assignedOrders = (orders || []).filter(o => o.assigned_staff_id === rider.id);
  const activeOrders = assignedOrders.filter(o => !['Delivered', 'Cancelled'].includes(o.order_status));
  const deliveredOrders = assignedOrders.filter(o => o.order_status === 'Delivered');

  const cashInHand = rider.cash_in_hand || (deliveredOrders.reduce((sum, o) => {
    const isCod = o.payment_method?.includes('Cash') || o.payment_status?.includes('COD');
    return sum + (isCod ? Number(o.total || 0) : 0);
  }, 0));

  const location = rider.location || {
    lat: 27.941887,
    lng: 77.843715,
    updated_at: new Date().toISOString()
  };

  const handleUpdateKyc = async (status, reason = '') => {
    setIsSaving(true);
    const updated = {
      ...rider,
      kyc_status: status,
      kyc_reject_reason: reason,
      kyc_reviewed_at: new Date().toISOString()
    };

    try {
      await updateNodeItemInSupabase('delivery_partners', rider.id, updated);
      await updateNodeItemInSupabase('staff', rider.id, updated);
      setKycStatus(status);
      setShowRejectInput(false);
      if (onRiderUpdated) onRiderUpdated(updated);
    } catch (e) {
      console.error('Failed to update KYC in Supabase:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettleCash = async () => {
    const amt = Number(settleAmount);
    if (!amt || amt <= 0) return;

    setIsSaving(true);
    const newCash = Math.max(0, cashInHand - amt);
    const updated = { ...rider, cash_in_hand: newCash };

    try {
      await updateNodeItemInSupabase('delivery_partners', rider.id, { cash_in_hand: newCash });
      await updateNodeItemInSupabase('staff', rider.id, { cash_in_hand: newCash });
      setSettleAmount('');
      if (onRiderUpdated) onRiderUpdated(updated);
    } catch (e) {
      console.error('Failed to settle cash in Supabase:', e);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Rider Login ID, Password and Shift
  const handleSaveCredentialsAndShift = async (e) => {
    e?.preventDefault();
    setIsSaving(true);
    setSaveSuccessMsg('');

    const updated = {
      ...rider,
      username: riderUsername.trim().toLowerCase(),
      password: riderPassword.trim(),
      shift: riderShift,
      active_shift: {
        name: riderShift,
        time: riderShift.includes('Morning') ? '07:00 AM - 12:00 PM' :
              riderShift.includes('Afternoon') ? '12:00 PM - 05:00 PM' :
              riderShift.includes('Evening') ? '05:00 PM - 10:30 PM' : '10:30 PM - 02:00 AM',
        zone: 'Khair Operational Zone',
        assigned_by_admin: true,
        assigned_at: new Date().toISOString()
      }
    };

    try {
      await updateNodeItemInSupabase('delivery_partners', rider.id, updated);
      await updateNodeItemInSupabase('staff', rider.id, updated);

      setSaveSuccessMsg('✓ Rider ID, Password & Shift updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
      if (onRiderUpdated) onRiderUpdated(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white rounded-3xl border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-800">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/20 text-brand-400 flex items-center justify-center border border-brand-500/30 font-bold">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">{rider.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  kycStatus === 'verified' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : kycStatus === 'rejected' 
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  KYC: {kycStatus}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                📞 {rider.phone} • Shift: {rider.shift || 'Morning'}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-100 p-2 flex gap-1 border-b border-gray-200 text-xs font-bold overflow-x-auto">
          {[
            { id: 'credentials', label: '🔑 ID & Shift', icon: KeyRound },
            { id: 'kyc', label: '📄 KYC Documents', icon: ShieldCheck },
            { id: 'location', label: '📍 Live GPS', icon: MapPin },
            { id: 'cash', label: '💰 COD Cash', icon: IndianRupee },
            { id: 'orders', label: '🛵 Orders', icon: Bike }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 ${
                activeTab === t.id 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/80 font-black' 
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* TAB 0: ID, PASSWORD & SHIFT ASSIGNMENT (ADMIN ONLY) */}
          {activeTab === 'credentials' && (
            <div className="space-y-4">
              <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-200/60">
                <h4 className="font-bold text-sm text-brand-950 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-brand-600" />
                  <span>Rider Login ID & Shift Assignment</span>
                </h4>
                <p className="text-xs text-brand-700 mt-1">
                  Delivery boys log into the app using the ID and Password created here. Shifts are controlled only by Admin.
                </p>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveCredentialsAndShift} className="space-y-3.5 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Login ID / Username
                    </label>
                    <input
                      type="text"
                      required
                      value={riderUsername}
                      onChange={(e) => setRiderUsername(e.target.value)}
                      placeholder="e.g. krishna01"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      required
                      value={riderPassword}
                      onChange={(e) => setRiderPassword(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Assigned Shift (Only Admin Can Change)
                  </label>
                  <select
                    value={riderShift}
                    onChange={(e) => setRiderShift(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    {STORE_SHIFTS.map((s, idx) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition"
                  >
                    {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Save ID, Password & Shift</span>
                  </button>
                </div>
              </form>

              {/* Duty Start Geofence Photo Inspection */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>Duty Start Selfie & Geofence Status</span>
                  </span>
                  {rider.duty_start ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Duty Started at {new Date(rider.duty_start.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                      Not Started Today
                    </span>
                  )}
                </div>

                {rider.duty_start ? (
                  <div className="flex items-center gap-4 pt-1">
                    {rider.duty_start.photo && (
                      <img 
                        src={rider.duty_start.photo} 
                        alt="Duty Start Selfie" 
                        onClick={() => setPreviewImage(rider.duty_start.photo)}
                        className="w-20 h-20 rounded-2xl object-cover border border-gray-300 cursor-pointer hover:opacity-90 shadow-sm" 
                      />
                    )}
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-gray-800">
                        Geofence Distance: <span className="text-emerald-700">{rider.duty_start.distance_from_hub || '0.1'} km from Khair Hub</span>
                      </p>
                      <p className="text-[11px] text-gray-500">
                        GPS: {rider.duty_start.location?.lat?.toFixed(4)}, {rider.duty_start.location?.lng?.toFixed(4)}
                      </p>
                      <p className="text-[11px] text-gray-500 font-semibold">
                        Shift: {rider.duty_start.shift || rider.shift}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    When the rider clicks "Start Duty" in the mobile app, their live selfie and geofence GPS will appear here.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: KYC DOCUMENTS CHECK & APPROVAL */}
          {activeTab === 'kyc' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-xs font-bold text-gray-700 block">KYC Verification Decision:</span>
                  <p className="text-[11px] text-gray-500">Approve documents to allow order assignment</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateKyc('verified')}
                    disabled={isSaving}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve KYC ✓</span>
                  </button>

                  <button
                    onClick={() => setShowRejectInput(!showRejectInput)}
                    disabled={isSaving}
                    className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject...</span>
                  </button>
                </div>
              </div>

              {/* Rejection Reason Form */}
              {showRejectInput && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-800">Reason for Rejecting KYC Profile:</span>
                    <button onClick={() => setShowRejectInput(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  <textarea
                    rows={2}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. Driving licence photo is blurry, please re-upload clear front & back photos"
                    className="w-full p-2.5 text-xs border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-bold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateKyc('rejected', rejectReason || 'Documents unclear / incomplete')}
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}

              {/* Documents Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Driving Licence', url: rider.kyc_docs?.driving_licence || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80' },
                  { label: 'Vehicle RC', url: rider.kyc_docs?.vehicle_rc || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=600&q=80' },
                  { label: 'Aadhaar Card', url: rider.kyc_docs?.aadhaar || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80' },
                  { label: 'Live Selfie / Photo', url: rider.kyc_docs?.selfie || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' }
                ].map((doc, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-700">{doc.label}</span>
                      <button 
                        onClick={() => setPreviewImage(doc.url)}
                        className="text-[11px] font-bold text-brand-600 flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Zoom</span>
                      </button>
                    </div>
                    <img 
                      src={doc.url} 
                      alt={doc.label} 
                      onClick={() => setPreviewImage(doc.url)}
                      className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-90 transition border border-gray-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: LIVE GPS LOCATION */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-mono block">Last Pinged Location:</span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    Latitude: {location.lat?.toFixed(6) || '27.941887'} | Longitude: {location.lng?.toFixed(6) || '77.843715'}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Last updated: {new Date(location.updated_at || Date.now()).toLocaleTimeString()}
                  </p>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${location.lat || 27.941887},${location.lng || 77.843715}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Google Maps</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: COD CASH IN HAND & SETTLEMENT */}
          {activeTab === 'cash' && (
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                      Current COD Balance With Rider
                    </span>
                    <span className="text-3xl font-black text-amber-900 font-mono mt-1 block">
                      ₹{cashInHand}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-900">
                    Limit: ₹2,500
                  </span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-gray-700 block">Record Cash Handover / Deposit:</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    placeholder={`e.g. ${cashInHand}`}
                    className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleSettleCash}
                    disabled={isSaving || !settleAmount}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    Mark Received
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASSIGNED DELIVERIES */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                <span>Active Deliveries: {activeOrders.length}</span>
                <span>Total Delivered: {deliveredOrders.length}</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignedOrders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl">
                    No orders currently assigned to this rider.
                  </div>
                ) : (
                  assignedOrders.map(o => (
                    <div key={o.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">Order #{o.id}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-700">
                            {o.order_status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate max-w-xs mt-0.5">
                          {o.customer_name} • {o.address?.line1 || 'Khair'}
                        </p>
                      </div>
                      <span className="font-bold font-mono text-gray-900">
                        ₹{o.total}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Image Zoom Lightbox */}
        {previewImage && (
          <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-fadeIn">
            <div className="relative max-w-lg w-full">
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white p-2 text-sm font-bold bg-white/20 rounded-full"
              >
                ✕ Close
              </button>
              <img src={previewImage} alt="Document Preview" className="w-full rounded-2xl max-h-[80vh] object-contain" />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
