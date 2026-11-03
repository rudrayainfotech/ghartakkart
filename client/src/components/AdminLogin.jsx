import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { Lock, User, KeyRound, ShieldAlert, ArrowLeft, Store, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const { loginAdmin, setAdminMode } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both admin username and password');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await loginAdmin(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Access Denied: Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col justify-center items-center p-4">
      {/* Back to Customer Store button */}
      <a
        href="https://vertexpsbyri.web.app"
        className="mb-6 flex items-center gap-2 text-xs font-bold text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Customer Storefront</span>
      </a>

      {/* Admin Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-800 animate-fadeIn">
        {/* Top Header */}
        <div className="bg-gray-950 p-6 text-center text-white relative border-b border-gray-800">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white p-1 shadow-lg border-2 border-brand-500">
            <img src="/logo.jpg" alt="GhartakKart" className="w-full h-full object-cover rounded-xl" />
          </div>
          <h2 className="text-xl font-black tracking-tight">GhartakKart Admin & Staff Portal</h2>
          <p className="text-xs text-amber-400 font-semibold mt-0.5">Khair Store Management & Dispatch Terminal</p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-white/10 px-3 py-0.5 rounded-full text-[11px] text-gray-300">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Super Admin & Staff Terminal Access</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                User ID / Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Admin username or Staff User ID (e.g. staff01)"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter security password"
                  className="w-full pl-9 pr-10 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] disabled:bg-gray-300 text-white font-extrabold rounded-2xl shadow-lg shadow-brand-600/30 transition-all text-xs flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{loading ? 'Authenticating Secure Session...' : 'Sign In to Portal'}</span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 text-center text-[10px] text-gray-400 space-y-1 border-t border-gray-100 pt-4">
            <p className="font-semibold text-gray-500">🔒 Role-Based Access & Audit Logging</p>
            <p>Staff accounts can view customer orders, process dispatches, and print invoices. Actions are monitored in the Super Admin audit log.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
