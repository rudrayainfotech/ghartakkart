import React, { useState } from 'react';
import { 
  HelpCircle, MessageSquare, Phone, ShieldCheck, AlertTriangle, 
  FileText, CloudRain, ChevronDown, ChevronUp, X, CheckCircle2 
} from 'lucide-react';

export function SupportModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;

  const [openFaq, setOpenFaq] = useState(null);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentType, setIncidentType] = useState('accident');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [incidentSuccess, setIncidentSuccess] = useState(false);

  const faqs = [
    {
      q: lang === 'hi' ? 'स्टोर पर ऑर्डर तैयार न होने पर क्या करें?' : 'What to do if order is not ready at store?',
      a: lang === 'hi' 
        ? 'ऐप में "Report Delay" बटन दबाएं। यदि स्टोर 5 मिनट से अधिक देर करता है, तो आपको प्रतीक्षा मुआवजा ₹1.5 प्रति मिनट स्वचालित रूप से दिया जाएगा।'
        : 'Tap "Report Delay" on the pickup screen. If the store delay exceeds 5 minutes, you will receive ₹1.5/min waiting compensation automatically.'
    },
    {
      q: lang === 'hi' ? 'यदि ग्राहक फोन नहीं उठा रहा है या पता गलत है?' : 'What if the customer is unreachable or address is incorrect?',
      a: lang === 'hi'
        ? 'कम से कम 3 बार कॉल करें और 5 मिनट का वेट टाइमर पूरा होने दें। इसके बाद "Return to Store" विकल्प चुनें। आपको राउंड ट्रिप का पूरा भुगतान मिलेगा।'
        : 'Attempt 3 calls and wait until the 5-minute timer elapses. Then tap "Return to Store". You are compensated for the round-trip distance.'
    },
    {
      q: lang === 'hi' ? 'कैश-इन-हैंड की सीमा क्या है और इसे कैसे जमा करें?' : 'What is the Cash-in-Hand limit and how do I deposit?',
      a: lang === 'hi'
        ? 'आपकी सुरक्षित सीमा ₹2,500 है। आप सोमना रोड स्टोर काउंटर पर कैशियर को दे सकते हैं या आधिकारिक UPI ID (9058564391@ptsbi) पर ट्रांसफर कर सकते हैं।'
        : 'Your safe limit is ₹2,500. Deposit cash at the Somna Road store counter or transfer via UPI to 9058564391@ptsbi.'
    },
    {
      q: lang === 'hi' ? 'दुर्घटना या चोट लगने पर बीमा क्लेम कैसे लें?' : 'How does the accident insurance claim work?',
      a: lang === 'hi'
        ? 'सभी ऑन-ड्यूटी पार्टनर्स को ₹5,00,000 का दुर्घटना बीमा और ₹1,00,000 तक कैशलेस अस्पताल भर्ती कवर मिलता है। तुरंत 24x7 हेल्पलाइन (+91 7017675784) पर संपर्क करें।'
        : 'All on-duty partners are covered with ₹5,00,000 accident cover and ₹1,00,000 cashless hospitalization. Call the 24x7 helpline (+91 7017675784) immediately.'
    }
  ];

  const handleIncidentSubmit = () => {
    if (!incidentDesc) return;
    setIncidentSuccess(true);
    setTimeout(() => {
      setIncidentSuccess(false);
      setShowIncidentForm(false);
      setIncidentDesc('');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {lang === 'hi' ? 'सहायता केंद्र और सुरक्षा' : 'Help Centre & Safety'}
              </h3>
              <p className="text-[11px] text-slate-400">
                24x7 GhartakKart Partner Support
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Quick Contact Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => window.open('https://wa.me/917017675784', '_blank')}
              className="py-3 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp Support</span>
            </button>

            <button
              onClick={() => window.location.href = 'tel:+917017675784'}
              className="py-3 px-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Call Helpline</span>
            </button>
          </div>

          {/* Insurance Card (PRD Section 6.8 SP-5) */}
          <div className="p-4 bg-gradient-to-r from-emerald-950/40 to-slate-800 rounded-2xl border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                {lang === 'hi' ? 'राइडर सुरक्षा व दुर्घटना बीमा' : 'Partner Insurance Cover'}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              {lang === 'hi' 
                ? '₹5,00,000 का दुर्घटना बीमा व कैशलेस ओपीडी/अस्पताल भर्ती सुविधा।' 
                : '₹5,00,000 accidental cover & cashless emergency hospital network in Aligarh/Khair.'}
            </p>
            <div className="flex justify-between items-center text-[10px] text-emerald-400 font-semibold pt-1">
              <span>Policy: GK-ICICI-LOMBARD-2026</span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full">Active ✓</span>
            </div>
          </div>

          {/* Incident / Accident Report Button */}
          <button
            onClick={() => setShowIncidentForm(true)}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-rose-300 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{lang === 'hi' ? 'दुर्घटना / वाहन खराबी की रिपोर्ट दर्ज करें' : 'Report Incident / Accident / Breakdown'}</span>
          </button>

          {/* Weather Advisory Card (PRD Section 6.8 SP-6) */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
            <CloudRain className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white block">
                {lang === 'hi' ? 'मौसम एडवाइजरी:' : 'Weather & Safety Advisory:'}
              </span>
              <span className="text-[11px] text-blue-200">
                Clear weather in Khair. Heavy rain surge bonus automatically activates if rainfall starts.
              </span>
            </div>
          </div>

          {/* FAQs List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              {lang === 'hi' ? 'अक्सर पूछे जाने वाले प्रश्न (FAQs)' : 'Frequently Asked Questions'}
            </h4>
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-800/60 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-3.5 text-left text-xs font-bold text-white flex items-center justify-between gap-2"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="p-3.5 pt-0 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 bg-slate-900/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Incident Form Modal */}
      {showIncidentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Report Incident</span>
            </h4>
            <select
              value={incidentType}
              onChange={(e) => setIncidentType(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="accident">Road Accident / Injury</option>
              <option value="breakdown">Vehicle Breakdown / Puncture</option>
              <option value="harassment">Customer / Store Dispute</option>
              <option value="other">Other Emergency</option>
            </select>
            <textarea
              rows={3}
              placeholder="Provide incident details & location..."
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
            />
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowIncidentForm(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold">
                Cancel
              </button>
              <button onClick={handleIncidentSubmit} className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold">
                {incidentSuccess ? 'Reported ✓' : 'Submit Incident'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
