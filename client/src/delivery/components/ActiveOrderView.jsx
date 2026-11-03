import React, { useState, useEffect } from 'react';
import { 
  Navigation, MapPin, Phone, MessageSquare, CheckCircle, Package, 
  AlertTriangle, Clock, Camera, ShieldCheck, ChevronRight, IndianRupee, 
  QrCode, ArrowLeft, RefreshCw, Sparkles, Check, AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playDeliveredChime } from '../audio.js';

export function ActiveOrderView({ order, onUpdateStatus, onCompleteDelivery, onReturnToStore, lang = 'en' }) {
  if (!order) return null;

  // Determine active stage from order status
  // Stages: 'to_store' -> 'pickup' -> 'out_for_delivery' -> 'doorstep'
  const [stage, setStage] = useState(() => {
    if (order.order_status === 'Delivered') return 'doorstep';
    if (order.order_status === 'Out for Delivery') return 'out_for_delivery';
    if (order.order_status === 'Ready' || order.order_status === 'Processing') return 'pickup';
    return 'to_store';
  });

  // Store delay reporter state
  const [storeDelayMinutes, setStoreDelayMinutes] = useState(0);
  const [delayReported, setDelayReported] = useState(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState(false);

  // Store item checklist verification
  const [checkedItems, setCheckedItems] = useState({});

  // Package photo
  const [packagePhoto, setPackagePhoto] = useState(null);

  // Delivery OTP verification
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [usePhotoFallback, setUsePhotoFallback] = useState(false);
  const [proofPhoto, setProofPhoto] = useState(null);

  // COD Payment Mode: Cash vs Dynamic UPI QR
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [codReceived, setCodReceived] = useState(false);

  // Failed delivery / Return to store modal
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedReason, setFailedReason] = useState('');
  const [waitTimer, setWaitTimer] = useState(300); // 5 min countdown

  const isCod = order.payment_method?.includes('Cash') || order.payment_status?.includes('COD');
  const expectedOtp = String(order.delivery_otp || (order.customer_phone ? order.customer_phone.slice(-4) : '1234'));

  // Track waiting time at store if delay reported
  useEffect(() => {
    let timer;
    if (delayReported) {
      timer = setInterval(() => {
        setStoreDelayMinutes(m => m + 1);
      }, 60000);
    }
    return () => clearInterval(timer);
  }, [delayReported]);

  const handleItemCheck = (idx) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handlePhotoUpload = (e, setter) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmPickup = () => {
    setStage('out_for_delivery');
    onUpdateStatus(order.id, 'Out for Delivery', {
      note: 'Order picked up from store by Delivery Partner',
      has_photo: !!packagePhoto
    });
  };

  const handleArrivedDoorstep = () => {
    setStage('doorstep');
  };

  const handleFinalDeliverySubmit = () => {
    if (!usePhotoFallback && enteredOtp.trim() !== expectedOtp.trim()) {
      setOtpError(true);
      return;
    }
    if (isCod && !codReceived) {
      alert(lang === 'hi' ? 'कृपया पहले COD कैश या UPI पेमेंट कन्फर्म करें' : 'Please confirm COD cash or UPI collection first');
      return;
    }

    playDeliveredChime();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    onCompleteDelivery(order.id, {
      delivery_otp: enteredOtp || 'PHOTO_PROOF',
      cod_collected: isCod ? order.total : 0,
      payment_mode: showUpiQr ? 'UPI_QR' : 'CASH',
      proof_photo: proofPhoto
    });
  };

  const handleOpenGoogleMaps = (lat, lng, label) => {
    const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(label || 'Khair, Uttar Pradesh');
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };

  const handleCallCustomer = () => {
    const phone = order.customer_phone || order.address?.phone || '9536432003';
    window.location.href = `tel:${phone}`;
  };

  const handleWhatsappCustomer = () => {
    const phone = (order.customer_phone || '9536432003').replace(/\D/g, '').slice(-10);
    const text = encodeURIComponent(
      lang === 'hi'
        ? `नमस्ते! मैं घरतककार्ट से आपका डिलीवरी पार्टनर हूँ। मैं आपका ऑर्डर #${order.id} लेकर आ रहा हूँ।`
        : `Hello! I am your GhartakKart delivery partner on the way with your order #${order.id}.`
    );
    window.open(`https://wa.me/91${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-4 pb-20 select-none">
      
      {/* Active Order Card Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full inline-block">
              {order.order_status || 'In Progress'}
            </span>
            <h3 className="text-base font-black text-white mt-1">
              Order #{order.id}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-semibold">
              {lang === 'hi' ? 'कुल बिल' : 'Order Bill'}
            </span>
            <span className="text-lg font-black text-emerald-400">
              ₹{order.total}
            </span>
          </div>
        </div>

        {/* 4-Step Progress Flow Bar */}
        <div className="pt-3 flex items-center justify-between text-center">
          {[
            { id: 'to_store', label: lang === 'hi' ? 'स्टोर' : 'Store' },
            { id: 'pickup', label: lang === 'hi' ? 'पिकअप' : 'Pickup' },
            { id: 'out_for_delivery', label: lang === 'hi' ? 'रास्ते में' : 'On Way' },
            { id: 'doorstep', label: lang === 'hi' ? 'डिलीवर' : 'Drop' }
          ].map((st, i) => {
            const isDone = 
              (stage === 'pickup' && i === 0) ||
              (stage === 'out_for_delivery' && i <= 1) ||
              (stage === 'doorstep' && i <= 2);
            const isCurrent = stage === st.id;
            return (
              <div key={st.id} className="flex-1 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isDone 
                    ? 'bg-emerald-500 text-slate-950' 
                    : isCurrent 
                      ? 'bg-emerald-500/30 text-emerald-400 border-2 border-emerald-500 ring-4 ring-emerald-500/20' 
                      : 'bg-slate-800 text-slate-500'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-semibold truncate max-w-[65px] ${
                  isCurrent ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STAGE 1: Head to Store */}
      {/* ============================================================ */}
      {stage === 'to_store' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                {lang === 'hi' ? 'चरण 1: स्टोर पर पहुंचें' : 'Step 1: Reach Store'}
              </span>
              <h4 className="text-base font-bold text-white">
                GhartakKart Khair Store
              </h4>
              <p className="text-xs text-slate-400">
                Somna Road, Main Market, Khair (0.4 km)
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => handleOpenGoogleMaps(27.941887, 77.843715, 'GhartakKart Somna Road Khair')}
              className="py-3 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{lang === 'hi' ? 'स्टोर मैप (Maps)' : 'Navigate Store'}</span>
            </button>

            <button
              onClick={() => setIsDelayModalOpen(true)}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>{lang === 'hi' ? 'स्टोर देरी रिपोर्ट' : 'Report Delay'}</span>
            </button>
          </div>

          {/* Geofence Detection or Manual Arrive */}
          <div className="pt-2">
            <button
              onClick={() => setStage('pickup')}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-98"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{lang === 'hi' ? 'मैं स्टोर पहुंच गया हूँ (Arrived)' : "I've Arrived at Store"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STAGE 2: Store Pickup & Checklist */}
      {/* ============================================================ */}
      {stage === 'pickup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                {lang === 'hi' ? 'चरण 2: सामान चेक करें' : 'Step 2: Checklist & Pickup'}
              </span>
              <h4 className="text-base font-bold text-white">
                {lang === 'hi' ? 'सामान और थैले जांचें' : 'Verify Items & Bags'}
              </h4>
            </div>
            <span className="text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-xl">
              {order.items?.length || 1} {lang === 'hi' ? 'आइटम' : 'Items'}
            </span>
          </div>

          {/* Items Checklist with checkboxes */}
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {(order.items || [
              { name: 'Fresh Vegetables & Grocery Bag', qty: 1, unit: 'Bag', price: order.total }
            ]).map((item, idx) => (
              <label 
                key={idx}
                className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                  checkedItems[idx] 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' 
                    : 'bg-slate-800/60 border-slate-700/80 text-slate-300'
                }`}
                onClick={() => handleItemCheck(idx)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center border transition ${
                    checkedItems[idx] 
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
                      : 'border-slate-600 bg-slate-900'
                  }`}>
                    {checkedItems[idx] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{item.name}</span>
                    <span className="text-[11px] text-slate-400">{item.qty} × {item.unit || 'unit'}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-300">₹{item.price}</span>
              </label>
            ))}
          </div>

          {/* Optional Package Photo Capture */}
          <div className="pt-2">
            <label className="p-3 bg-slate-800/80 border border-dashed border-slate-700 rounded-2xl flex items-center justify-between cursor-pointer hover:border-slate-500 transition">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handlePhotoUpload(e, setPackagePhoto)} 
              />
              <div className="flex items-center gap-2.5">
                <Camera className="w-5 h-5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-300">
                  {packagePhoto 
                    ? (lang === 'hi' ? 'पैकेट फोटो सेव हुई ✓' : 'Package Photo Attached ✓') 
                    : (lang === 'hi' ? 'सील पैकेट की फोटो लें (वैकल्पिक)' : 'Take Sealed Bag Photo (Optional)')}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                {packagePhoto ? 'Retake' : 'Capture'}
              </span>
            </label>
          </div>

          {/* Confirm Pickup Slider */}
          <div className="pt-2">
            <button
              onClick={handleConfirmPickup}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-98"
            >
              <span>{lang === 'hi' ? 'पिकअप कन्फर्म करें (रास्ते में जाएं) →' : 'Confirm Pickup & Head to Customer →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STAGE 3: Out for Delivery (Navigation to Customer) */}
      {/* ============================================================ */}
      {stage === 'out_for_delivery' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                {lang === 'hi' ? 'चरण 3: ग्राहक के पास जाएं' : 'Step 3: Navigate to Drop'}
              </span>
              <h4 className="text-base font-bold text-white">
                {order.customer_name || 'Khair Customer'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {order.address?.line1 || 'Khair, Uttar Pradesh - 202138'}
              </p>
              {order.address?.landmark && (
                <p className="text-xs font-semibold text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 mt-1">
                  📍 {lang === 'hi' ? 'लैंडमार्क: ' : 'Landmark: '} {order.address.landmark}
                </p>
              )}
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          {/* Customer Masked Call & WhatsApp */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleCallCustomer}
              className="py-3 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Phone className="w-4 h-4" />
              <span>{lang === 'hi' ? 'ग्राहक को कॉल करें' : 'Call Customer'}</span>
            </button>

            <button
              onClick={handleWhatsappCustomer}
              className="py-3 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{lang === 'hi' ? 'व्हाट्सएप चैट' : 'WhatsApp'}</span>
            </button>
          </div>

          {/* Turn-by-Turn Google Maps Navigation Link */}
          <div className="pt-1">
            <button
              onClick={() => handleOpenGoogleMaps(order.address?.lat, order.address?.lng, order.address?.line1)}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>{lang === 'hi' ? 'गूगल मैप्स नेविगेशन शुरू करें' : 'Open Google Maps Turn-by-Turn'}</span>
            </button>
          </div>

          {/* Arrived at Doorstep Button */}
          <div className="pt-2">
            <button
              onClick={handleArrivedDoorstep}
              className="w-full py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-98"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{lang === 'hi' ? 'घर के दरवाजे पर पहुंच गया हूँ' : 'Arrived at Customer Doorstep'}</span>
            </button>
          </div>

          {/* Delivery Issue / Can't Deliver link */}
          <div className="text-center pt-1">
            <button
              onClick={() => setShowFailedModal(true)}
              className="text-xs text-rose-400/90 hover:text-rose-300 font-semibold underline underline-offset-4"
            >
              {lang === 'hi' ? 'ग्राहक अनुपलब्ध / डिलीवरी समस्या?' : 'Customer unreachable / Delivery problem?'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STAGE 4: Doorstep Delivery Completion & COD/OTP */}
      {/* ============================================================ */}
      {stage === 'doorstep' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="text-center space-y-1 pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              {lang === 'hi' ? 'अंतिम चरण: डिलीवरी और भुगतान' : 'Final Step: Delivery & Payment'}
            </span>
            <h4 className="text-lg font-black text-white">
              {order.customer_name || 'Customer'}
            </h4>
          </div>

          {/* COD Payment Section if applicable */}
          {isCod && (
            <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-300 uppercase block">
                    {lang === 'hi' ? 'वसूल करने योग्य COD कैश:' : 'Collect Cash on Delivery:'}
                  </span>
                  <div className="text-2xl font-black text-amber-400">
                    ₹{order.total}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUpiQr(!showUpiQr)}
                  className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>{showUpiQr ? 'Hide QR' : (lang === 'hi' ? 'UPI QR दिखाएं' : 'Show UPI QR')}</span>
                </button>
              </div>

              {/* Dynamic Doorstep UPI QR Code display */}
              {showUpiQr && (
                <div className="p-4 bg-white rounded-2xl text-center space-y-2 text-slate-900 animate-fadeIn">
                  <div className="text-xs font-black text-slate-800">
                    Scan with GPay / PhonePe / Paytm / BHIM
                  </div>
                  {/* Visual QR generator image */}
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `upi://pay?pa=9058564391@ptsbi&pn=GhartakKart%20Khair&am=${order.total}&tn=Order-${order.id}`
                    )}`}
                    alt="Doorstep UPI QR"
                    className="mx-auto rounded-xl border border-slate-200"
                  />
                  <div className="text-[11px] font-mono font-bold text-slate-600">
                    UPI: 9058564391@ptsbi • Amount: ₹{order.total}
                  </div>
                </div>
              )}

              {/* Cash Received Checkbox Button */}
              <button
                type="button"
                onClick={() => setCodReceived(!codReceived)}
                className={`w-full py-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition ${
                  codReceived 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <CheckCircle className={`w-4 h-4 ${codReceived ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>
                  {codReceived 
                    ? (lang === 'hi' ? `₹${order.total} कैश प्राप्त हुआ ✓` : `₹${order.total} Payment Collected ✓`)
                    : (lang === 'hi' ? `मैंने ₹${order.total} पेमेंट ले लिया है` : `I have received ₹${order.total}`)}
                </span>
              </button>
            </div>
          )}

          {/* Delivery OTP verification */}
          {!usePhotoFallback ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                {lang === 'hi' ? 'ग्राहक का 4-अंकीय डिलीवरी OTP दर्ज करें:' : 'Enter Customer 4-digit Delivery OTP:'}
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => {
                    setEnteredOtp(e.target.value.replace(/\D/g, ''));
                    setOtpError(false);
                  }}
                  placeholder="e.g. 7842"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setEnteredOtp(expectedOtp)}
                  className="px-3 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 rounded-xl text-[10px] font-semibold"
                  title="Auto-fill OTP for test"
                >
                  Demo Fill
                </button>
              </div>

              {otpError && (
                <div className="text-xs text-rose-400 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{lang === 'hi' ? 'गलत OTP! कृपया ग्राहक से पुनः पूछें' : 'Invalid OTP! Please ask customer'}</span>
                </div>
              )}

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setUsePhotoFallback(true)}
                  className="text-[11px] text-slate-400 hover:text-emerald-400 underline"
                >
                  {lang === 'hi' ? 'OTP नहीं मिल रहा? फ़ोटो प्रूफ से पूरा करें' : 'OTP not available? Use Contactless Photo'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {lang === 'hi' ? 'कॉन्टैक्टलेस ड्रॉप फ़ोटो' : 'Contactless Drop Photo Proof'}
                </span>
                <button
                  onClick={() => setUsePhotoFallback(false)}
                  className="text-[11px] text-emerald-400 underline"
                >
                  {lang === 'hi' ? 'OTP पर वापस' : 'Back to OTP'}
                </button>
              </div>
              <label className="p-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl flex items-center justify-center cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handlePhotoUpload(e, setProofPhoto)} 
                />
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>{proofPhoto ? 'Photo Uploaded ✓' : 'Take Doorstep Package Photo'}</span>
                </div>
              </label>
            </div>
          )}

          {/* Swipe / Complete Delivery Button */}
          <div className="pt-2">
            <button
              onClick={handleFinalDeliverySubmit}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/30 cursor-pointer active:scale-98"
            >
              <Sparkles className="w-5 h-5" />
              <span>{lang === 'hi' ? 'डिलीवरी पूरी करें (कन्फर्म)' : 'COMPLETE DELIVERY ✓'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Store Delay Reporter Modal */}
      {/* ============================================================ */}
      {isDelayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>{lang === 'hi' ? 'स्टोर में देरी की रिपोर्ट' : 'Report Store Delay'}</span>
              </h4>
              <button onClick={() => setIsDelayModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400">
              {lang === 'hi' 
                ? 'यदि स्टोर 5 मिनट से अधिक देर करता है, तो आपको ₹1.5/मिनट प्रतीक्षा मुआवजा दिया जाएगा।' 
                : 'Excessive store delays (>5 mins) are compensated at ₹1.5/min waiting pay.'}
            </p>
            <div className="space-y-2">
              {['Order not packed yet', 'Items out of stock', 'Long billing queue', 'Other store delay'].map(r => (
                <button
                  key={r}
                  onClick={() => {
                    setDelayReported(true);
                    setIsDelayModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Failed Delivery Modal (Section 6.5 DL-6 / DL-7) */}
      {/* ============================================================ */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>{lang === 'hi' ? 'डिलीवरी असफल / वापसी' : 'Delivery Issue & Return'}</span>
              </h4>
              <button onClick={() => setShowFailedModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
              <span className="text-[11px] text-amber-300 font-semibold block">
                {lang === 'hi' ? 'नियम: कम से कम 5 मिनट प्रतीक्षा करें व 3 बार कॉल करें' : 'Policy: Wait at least 5 mins and make 3 call attempts'}
              </span>
              <span className="text-lg font-mono font-black text-amber-400">
                {Math.floor(waitTimer / 60)}:{(waitTimer % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                'Customer phone switched off / unreachable',
                'Incorrect delivery address / landmark',
                'Customer refused to accept order',
                'Customer asked to cancel order'
              ].map(reason => (
                <button
                  key={reason}
                  onClick={() => setFailedReason(reason)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium border transition ${
                    failedReason === reason 
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200' 
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowFailedModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  onReturnToStore(order.id, failedReason || 'Customer unreachable');
                  setShowFailedModal(false);
                }}
                disabled={!failedReason}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                {lang === 'hi' ? 'स्टोर वापस करें' : 'Return to Store'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
