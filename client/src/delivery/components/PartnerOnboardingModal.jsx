import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, Camera, Upload, ArrowRight, ArrowLeft, 
  ShieldCheck, FileText, User, CreditCard, Sparkles, X 
} from 'lucide-react';

export function PartnerOnboardingModal({ isOpen, onClose, partner, onSave, lang = 'en' }) {
  if (!isOpen) return null;

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState(partner?.phone || '');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [name, setName] = useState(partner?.name || '');
  const [vehicle, setVehicle] = useState(partner?.vehicle || '');
  const [vehicleType, setVehicleType] = useState(partner?.vehicle_type || '2 Wheeler (Bike)');
  const [upiId, setUpiId] = useState(partner?.bank_details?.upi_id || '');
  const [bankAcc, setBankAcc] = useState(partner?.bank_details?.account_number || '');
  const [ifsc, setIfsc] = useState(partner?.bank_details?.ifsc || '');
  const [pennyDropSuccess, setPennyDropSuccess] = useState(partner?.bank_details?.penny_drop_verified || false);
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);

  // Document states
  const [documents, setDocuments] = useState({
    aadhaar: null,
    pan: null,
    drivingLicense: null,
    vehicleRc: null,
    selfie: null
  });

  const handleDocUpload = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => ({ ...prev, [key]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePennyDropTest = () => {
    if (!upiId && (!bankAcc || !ifsc)) {
      alert(lang === 'hi' ? 'कृपया बैंक खाता या UPI ID दर्ज करें' : 'Please enter Bank Account or UPI ID');
      return;
    }
    setIsVerifyingBank(true);
    setTimeout(() => {
      setIsVerifyingBank(false);
      setPennyDropSuccess(true);
    }, 1500);
  };

  const handleComplete = () => {
    const updated = {
      ...partner,
      name: name || partner.name,
      phone: phone || partner.phone,
      vehicle: vehicle || partner.vehicle,
      vehicle_type: vehicleType,
      kyc_status: 'verified',
      bank_details: {
        account_number: bankAcc || '•••• •••• 5612',
        ifsc: ifsc || 'SBIN0001234',
        upi_id: upiId || `${phone}@upi`,
        penny_drop_verified: true
      }
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'hi' ? 'राइडर ऑनबोर्डिंग और केवाईसी' : 'Delivery Partner Onboarding & KYC'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {lang === 'hi' ? `चरण ${step} / 5` : `Step ${step} of 5`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 flex">
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s} 
              className={`flex-1 h-full transition-all duration-300 ${s <= step ? 'bg-emerald-500' : 'bg-transparent'}`} 
            />
          ))}
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* STEP 1: Phone & OTP */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">
                  {lang === 'hi' ? 'अपना मोबाइल नंबर सत्यापित करें' : 'Verify Mobile Number'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'लॉगिन और ऑर्डर अलर्ट प्राप्त करने के लिए OTP दर्ज करें' : 'Enter phone number to receive instant login OTP'}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'hi' ? 'मोबाइल नंबर (+91)' : 'Mobile Number (+91)'}
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono tracking-wider"
                    />
                    <button 
                      onClick={() => { setOtpSent(true); setOtp('7842'); }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
                    >
                      {otpSent ? (lang === 'hi' ? 'पुनः भेजें' : 'Resend') : (lang === 'hi' ? 'OTP भेजें' : 'Send OTP')}
                    </button>
                  </div>
                </div>

                {otpSent && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-emerald-300 font-medium">
                        {lang === 'hi' ? 'डेमो OTP भेजा गया: ' : 'Demo OTP received: '} <strong className="font-mono text-emerald-200">7842</strong>
                      </span>
                    </div>
                    <input 
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Enter 4-digit OTP"
                      className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-center text-lg font-mono tracking-widest text-emerald-300 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Basic Info & Vehicle */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">
                  {lang === 'hi' ? 'व्यक्तिगत और वाहन विवरण' : 'Personal & Vehicle Details'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'डिलीवरी असाइनमेंट के लिए सटीक जानकारी दें' : 'Accurate information ensures optimal order matching'}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'hi' ? 'पूरा नाम (आधार के अनुसार)' : 'Full Name (as per Aadhaar)'}
                  </label>
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Krishna Kumar"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'hi' ? 'वाहन का प्रकार' : 'Vehicle Type'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['2 Wheeler (Bike)', 'EV Scooty', 'Bicycle'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVehicleType(v)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition ${
                          vehicleType === v 
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' 
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'hi' ? 'गाड़ी का नंबर (RC Plate)' : 'Vehicle Registration Number'}
                  </label>
                  <input 
                    type="text"
                    value={vehicle}
                    onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                    placeholder="e.g. UP 81 AZ 4412"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Document Uploads & Quality Check */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">
                  {lang === 'hi' ? 'केवाईसी दस्तावेज़ अपलोड करें' : 'KYC Document Capture'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'साफ़ और बिना चमक वाली फ़ोटो लें (24 घंटे में अप्रूवल)' : 'Ensure text is clear with no blur or glare'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'aadhaar', label: lang === 'hi' ? 'आधार कार्ड' : 'Aadhaar Card' },
                  { id: 'pan', label: lang === 'hi' ? 'पैन कार्ड' : 'PAN Card' },
                  { id: 'drivingLicense', label: lang === 'hi' ? 'ड्राइविंग लाइसेंस (DL)' : 'Driving License' },
                  { id: 'vehicleRc', label: lang === 'hi' ? 'गाड़ी की RC' : 'Vehicle RC' },
                  { id: 'selfie', label: lang === 'hi' ? 'लाइव सेल्फ़ी' : 'Live Selfie' }
                ].map(doc => (
                  <label 
                    key={doc.id}
                    className={`relative p-3 rounded-2xl border border-dashed cursor-pointer flex flex-col items-center justify-center text-center transition ${
                      documents[doc.id] 
                        ? 'bg-emerald-500/10 border-emerald-500/50' 
                        : 'bg-slate-800/60 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleDocUpload(doc.id, e)} 
                    />
                    {documents[doc.id] ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <span className="text-[11px] font-bold text-emerald-300 block">{doc.label}</span>
                        <span className="text-[9px] text-emerald-400/80 bg-emerald-500/20 px-1.5 py-0.5 rounded-full">
                          {lang === 'hi' ? 'अपलोड हुआ ✓' : 'Captured ✓'}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-1">
                        <Camera className="w-5 h-5 text-slate-400 mx-auto" />
                        <span className="text-xs font-semibold text-slate-300 block">{doc.label}</span>
                        <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                          <Upload className="w-3 h-3" /> {lang === 'hi' ? 'अपलोड करें' : 'Tap to upload'}
                        </span>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Bank Details & Penny Drop */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h4 className="text-base font-bold text-white">
                  {lang === 'hi' ? 'बैंक खाता व UPI सत्यापन' : 'Bank & UPI Verification'}
                </h4>
                <p className="text-xs text-slate-400">
                  {lang === 'hi' ? 'दैनिक/साप्ताहिक कमाई सीधे इसी खाते में ट्रांसफर होगी' : 'Earnings and incentive bonuses will be transferred here'}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    {lang === 'hi' ? 'UPI ID (Google Pay, PhonePe, Paytm)' : 'UPI ID (Instant Transfer)'}
                  </label>
                  <input 
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. 6398317028@paytm"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">
                    {lang === 'hi' ? 'या बैंक खाता दर्ज करें:' : 'Or Bank Account Details:'}
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input 
                        type="text"
                        value={bankAcc}
                        onChange={(e) => setBankAcc(e.target.value)}
                        placeholder="Account Number"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <input 
                        type="text"
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="IFSC Code (e.g. SBIN0001234)"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Penny Drop Verification Button & Badge */}
                <div className="pt-2">
                  <button 
                    type="button"
                    onClick={handlePennyDropTest}
                    disabled={isVerifyingBank || pennyDropSuccess}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                      pennyDropSuccess 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isVerifyingBank ? (
                      <span>{lang === 'hi' ? 'बैंक सत्यापन जारी है (₹1 परीक्षण)...' : 'Sending ₹1 penny-drop test...'}</span>
                    ) : pennyDropSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>{lang === 'hi' ? 'खाता सफलतापूर्वक सत्यापित (₹1 जमा हुआ) ✓' : 'Account Verified via Penny-Drop (₹1 Deposited) ✓'}</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>{lang === 'hi' ? 'पेनी-ड्रॉप बैंक टेस्ट शुरू करें' : 'Run Penny-Drop Account Test (Instant)'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: In-app Training & Activation */}
          {step === 5 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center shadow-lg border border-emerald-500/30">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-black text-white">
                  {lang === 'hi' ? 'बधाई हो! आप डिलीवरी के लिए तैयार हैं' : 'Congratulations! You are Ready to Earn'}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {lang === 'hi' 
                    ? 'आपकी प्रोफ़ाइल और दस्तावेज़ सत्यापित कर लिए गए हैं। अब ऑनलाइन जाएं और खैर में ऑर्डर स्वीकार करना शुरू करें!' 
                    : 'Your profile and KYC documents are verified. Go online now to start accepting orders in Khair zone!'}
                </p>
              </div>

              {/* Safety & Hygiene Checklist */}
              <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-left space-y-2">
                <div className="text-xs font-bold text-slate-200">
                  {lang === 'hi' ? 'डिलीवरी सुरक्षा निर्देश:' : 'Safety & Hygiene Standard:'}
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li>{lang === 'hi' ? 'हमेशा हेलमेट पहनें और सुरक्षित गति में चलाएं' : 'Wear helmet at all times and follow road safety'}</li>
                  <li>{lang === 'hi' ? 'स्टोर पर पैकेट सील और ग्राहक OTP ज़रूर चेक करें' : 'Inspect sealed bags and always verify customer 4-digit OTP'}</li>
                  <li>{lang === 'hi' ? 'COD कैश को तुरंत ऐप में दर्ज करें और सुरक्षित रखें' : 'Log COD cash doorstep collection directly in the app'}</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-800/90 border-t border-slate-700 flex items-center justify-between">
          {step > 1 ? (
            <button 
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" /> {lang === 'hi' ? 'पीछे' : 'Back'}
            </button>
          ) : <div />}

          {step < 5 ? (
            <button 
              onClick={() => {
                if (step === 1 && !otpSent && !otp) {
                  setOtpSent(true);
                  setOtp('7842');
                  return;
                }
                setStep(s => s + 1);
              }}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition"
            >
              <span>{lang === 'hi' ? 'अगला कदम' : 'Next Step'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-xl shadow-emerald-500/20 transition"
            >
              <span>{lang === 'hi' ? 'काम शुरू करें (Go Online)' : 'Complete & Go Online'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
