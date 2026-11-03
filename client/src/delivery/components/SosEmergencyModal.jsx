import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, Phone, ShieldAlert, Siren, 
  MapPin, CheckCircle2, X, MessageSquare 
} from 'lucide-react';
import { playSosAlarm } from '../audio.js';
import { broadcastSosAlert } from '../storage.js';

export function SosEmergencyModal({ isOpen, onClose, partner, lang = 'en' }) {
  if (!isOpen) return null;

  const [alertSent, setAlertSent] = useState(false);
  const [coords, setCoords] = useState({ lat: 27.941887, lng: 77.843715 });

  useEffect(() => {
    playSosAlarm();

    // Get current GPS
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(loc);
          broadcastSosAlert(partner, loc).then(() => setAlertSent(true));
        },
        () => {
          broadcastSosAlert(partner, coords).then(() => setAlertSent(true));
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      broadcastSosAlert(partner, coords).then(() => setAlertSent(true));
    }
  }, []);

  const handleCallPolice = () => {
    window.location.href = 'tel:112';
  };

  const handleCallAmbulance = () => {
    window.location.href = 'tel:108';
  };

  const handleCallGkSupport = () => {
    window.location.href = 'tel:+917017675784';
  };

  const handleSendWhatsappEmergency = () => {
    const text = encodeURIComponent(
      `🚨 EMERGENCY SOS ALERT! I am GhartakKart rider ${partner?.name || 'Rider'} (${partner?.phone}). I need immediate assistance! Live GPS: https://www.google.com/maps?q=${coords.lat},${coords.lng}`
    );
    window.open(`https://wa.me/917017675784?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-red-950/90 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-slate-900 border-2 border-red-500 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-slate-100">
        
        {/* Flashing Siren Header */}
        <div className="p-4 bg-red-600 text-white flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <Siren className="w-6 h-6" />
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">
                {lang === 'hi' ? 'आपातकालीन एसओएस अलार्म' : 'EMERGENCY SOS ACTIVE'}
              </h3>
              <p className="text-[11px] text-red-100">
                Live Location Broadcasted
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/80 hover:text-white bg-black/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <span className="font-bold text-white block">
                {lang === 'hi' ? 'लाइव लोकेशन ऑप्स टीम को भेजी गई:' : 'Live GPS shared with Ops Control:'}
              </span>
              <span className="font-mono text-red-300">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (Khair, UP)
              </span>
            </div>
          </div>

          {/* Quick 1-Tap Dialers */}
          <div className="space-y-2.5">
            <button
              onClick={handleCallGkSupport}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>{lang === 'hi' ? 'घरतककार्ट 24x7 हेल्पलाइन (+91 7017675784)' : 'Call GhartakKart Ops Hotline (+91 7017675784)'}</span>
            </button>

            <button
              onClick={handleSendWhatsappEmergency}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{lang === 'hi' ? 'व्हाट्सएप पर आपातकालीन लोकेशन भेजें' : 'Send Emergency WhatsApp with Live GPS'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCallPolice}
                className="py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>POLICE (112)</span>
              </button>

              <button
                onClick={handleCallAmbulance}
                className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>AMBULANCE (108)</span>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              {lang === 'hi' ? 'अलार्म बंद करें (मैं सुरक्षित हूँ)' : 'Dismiss Alarm (I am Safe)'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
