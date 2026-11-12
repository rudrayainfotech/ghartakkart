import React, { useState } from 'react';
import { Upload, ShieldCheck, X, CheckCircle2, FileText } from 'lucide-react';
import { updateNodeItemInSupabase } from '../../supabase.js';

export function ReuploadDocumentsModal({ isOpen, onClose, partner, onDocumentsResubmitted, lang = 'en' }) {
  const [docs, setDocs] = useState({
    aadhaar: null,
    drivingLicense: null,
    selfie: null
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen || !partner) return null;

  const handleFileChange = (key, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocs((prev) => ({ ...prev, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const updated = {
      ...partner,
      documents: { ...(partner.documents || {}), ...docs },
      kyc_status: 'under_review',
      kyc_reject_reason: '',
      kyc_resubmitted_at: new Date().toISOString()
    };

    try {
      await updateNodeItemInSupabase('staff', partner.id, updated);
      await updateNodeItemInSupabase('delivery_partners', partner.id, updated);
    } catch (err) {
      console.warn('Could not sync resubmitted KYC docs to Supabase:', err);
    } finally {
      setSaving(false);
    }

    onDocumentsResubmitted?.(updated);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
        <div className="p-5 bg-rose-950/60 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {lang === 'hi' ? 'KYC दस्तावेज़ पुनः अपलोड करें' : 'Re-upload KYC Documents'}
              </h3>
              <p className="text-[11px] text-rose-200">
                {partner.kyc_reject_reason || (lang === 'hi' ? 'सत्यापन के लिए स्पष्ट फोटो अपलोड करें' : 'Upload clear photos for admin verification')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {[
            { key: 'aadhaar', label: lang === 'hi' ? 'आधार कार्ड (Aadhaar)' : 'Aadhaar Card' },
            { key: 'drivingLicense', label: lang === 'hi' ? 'ड्राइविंग लाइसेंस (DL)' : 'Driving License' },
            { key: 'selfie', label: lang === 'hi' ? 'ताज़ा सेल्फी (Selfie)' : 'Live Selfie Photo' }
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/50 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-200">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {docs[item.key] ? (
                  <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                  </span>
                ) : (
                  <span className="text-amber-400 font-bold inline-flex items-center gap-1">
                    <Upload className="w-3.5 h-3.5" /> Choose File
                  </span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(item.key, e)}
              />
            </label>
          ))}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
            >
              {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold"
            >
              {saving ? 'Submitting...' : (lang === 'hi' ? 'सत्यापन के लिए भेजें' : 'Submit for Verification')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
