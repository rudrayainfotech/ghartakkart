import React, { Component } from 'react';
import { useStore } from './context/StoreContext.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import AdminPanel from './components/AdminPanel.jsx';

class AdminErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('AdminPanel Crash Caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 text-center text-white">
          <div className="bg-gray-900 border border-red-500/30 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center font-bold text-xl">
              ⚠️
            </div>
            <h2 className="text-lg font-black text-white">Admin Terminal Error</h2>
            <p className="text-xs text-gray-400">
              {this.state.error?.message || 'An unexpected error occurred in Admin Panel.'}
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Reload Admin Panel
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('gk_orders');
                    localStorage.removeItem('gk_vendor_ledger');
                  } catch {}
                  window.location.reload();
                }}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-gray-300 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Reset Stored Cache & Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AdminApp() {
  const { adminAuth } = useStore();

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
        {adminAuth ? <AdminPanel /> : <AdminLogin />}
      </div>
    </AdminErrorBoundary>
  );
}
