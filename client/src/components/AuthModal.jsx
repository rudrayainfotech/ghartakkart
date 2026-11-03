import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import PhoneLogin from '../PhoneLogin.jsx';
import ScratchCard from './ScratchCard.jsx';
import {
  X,
  ShieldCheck,
  MapPin,
  Clock,
  CheckCircle2,
  Trash2,
  LogOut,
  Award,
  Gift,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    authModalInitialTab,
    setAuthModalInitialTab,
    customerUser,
    setCustomerUser,
    customerStampStatus,
    orders,
    setActiveTrackingOrderId,
    setUserLocation,
    checkServiceability,
    autoFetchCustomerLocation,
    setIsPrivacyModalOpen,
    wallets,
    customerWalletBalance,
    claimOrderScratchCard,
    clearCart
  } = useStore();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'stamps', 'addresses', 'profile'

  useEffect(() => {
    if (isAuthModalOpen && authModalInitialTab) {
      setActiveTab(authModalInitialTab);
    }
  }, [isAuthModalOpen, authModalInitialTab]);

  // Edit profile state
  const [editName, setEditName] = useState(customerUser?.name || '');
  const [editEmail, setEditEmail] = useState(customerUser?.email || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  // Sync edit inputs whenever customerUser updates (e.g., right after Google login)
  useEffect(() => {
    setEditName(customerUser?.name || '');
    setEditEmail(customerUser?.email || '');
  }, [customerUser?.name, customerUser?.email]);

  if (!isAuthModalOpen) return null;

  const liveActiveStamps = customerStampStatus?.activeStamps ?? (customerUser?.stamps || 0);
  const liveSurpriseGifts = customerStampStatus?.surpriseGifts ?? (customerUser?.surpriseGifts || 0);

  // Filter orders belonging to this customer phone or last placed order ID
  const lastPhone = typeof window !== 'undefined' ? (localStorage.getItem('gk_last_customer_phone') || '') : '';
  const lastOrderId = typeof window !== 'undefined' ? localStorage.getItem('gk_last_customer_order_id') : null;
  const customerOrders = orders.filter(o => {
    if (lastOrderId && o.id === lastOrderId) return true;
    const orderPhone = o.customer_phone?.replace(/\D/g, '').slice(-10);
    const userPhone = (customerUser?.phone || lastPhone || '').replace(/\D/g, '').slice(-10);
    return orderPhone && userPhone && orderPhone === userPhone;
  });

  // Jab Google 1-Click + Phone Number complete ho jayega tab yeh call hoga
  const handleLoginSuccess = (userData) => {
    const updatedName = userData.name || customerUser?.name || 'Customer';
    const updatedEmail = userData.email || customerUser?.email || '';

    setCustomerUser(prev => ({
      ...prev,
      isLoggedIn: true,
      name: updatedName,
      email: updatedEmail,
      phone: userData.phoneNumber,
      uid: userData.uid
    }));

    setEditName(updatedName);
    setEditEmail(updatedEmail);

    // Automatically fetch live customer GPS location immediately upon login
    if (autoFetchCustomerLocation) {
      autoFetchCustomerLocation({ silent: true });
    }
  };

  const handleLogout = () => {
    setCustomerUser(prev => ({
      ...prev,
      isLoggedIn: false,
      uid: null
    }));
    clearCart();
    try {
      localStorage.removeItem('gk_customer_cart');
    } catch {}
    setIsAuthModalOpen(false);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setCustomerUser(prev => ({
      ...prev,
      name: editName,
      email: editEmail
    }));
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleDeleteAddress = (id) => {
    setCustomerUser(prev => ({
      ...prev,
      addresses: (prev.addresses || []).filter(a => a.id !== id)
    }));
  };

  const isLoggedIn = customerUser?.isLoggedIn;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-base">
                {customerUser?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="font-bold text-base text-gray-900">
                {isLoggedIn ? (customerUser?.name || 'Customer Account') : 'Login / Sign Up'}
              </h3>
              <p className="text-xs text-gray-500">
                {isLoggedIn 
                  ? (customerUser?.phone ? `+91 ${customerUser.phone.replace(/^\+91/, '')}` : 'Manage orders and addresses') 
                  : 'Get started with fast delivery'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Content Based on Login State */}
        {!isLoggedIn ? (
          /* ----- 1-CLICK GOOGLE LOGIN VIEW ----- */
          <div className="p-6 overflow-y-auto">
            <PhoneLogin onSuccess={handleLoginSuccess} />
          </div>
        ) : (
          /* ----- LOGGED IN DASHBOARD VIEW ----- */
          <>
            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-white px-6 overflow-x-auto">
              {[
                { id: 'orders', label: 'My Orders', count: customerOrders.length },
                { id: 'wallet', label: 'My Wallet 👛', count: `₹${customerWalletBalance}` },
                { id: 'stamps', label: 'Stamps & Gifts 🎁', count: `${liveActiveStamps}/10` },
                { id: 'addresses', label: 'Saved Addresses', count: customerUser?.addresses?.length || 0 },
                { id: 'profile', label: 'Edit Profile' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full text-[10px]">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {customerOrders.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold">No orders placed yet</p>
                      <p className="text-xs mt-1">Orders you place will appear here with live tracking.</p>
                    </div>
                  ) : (
                    customerOrders.map(order => {
                      const isCancelled = order.order_status === 'Cancelled' || order.order_status === 'Rejected';
                      return (
                        <div
                          key={order.id}
                          className={`p-4 border rounded-2xl transition-all shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            isCancelled
                              ? 'bg-rose-50/70 border-rose-300'
                              : order.order_status === 'Delivered'
                              ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400'
                              : 'bg-white border-gray-200 hover:border-brand-400'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-sm text-gray-900">#{order.id}</span>
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                  isCancelled
                                    ? 'bg-rose-600 text-white'
                                    : order.order_status === 'Delivered'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-brand-100 text-brand-800'
                                }`}
                              >
                                {isCancelled ? '❌ Cancelled by Store' : order.order_status}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(order.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                              {(order.items || []).map(i => `${i.qty}x ${i.name}`).join(', ')}
                            </p>
                            {isCancelled && (
                              <p className="text-[11px] font-bold text-rose-700 mt-1 bg-rose-100/80 border border-rose-200 px-2.5 py-1 rounded-lg">
                                Store Notice: {order.admin_remark || order.cancel_reason || 'This order was cancelled by the store.'}
                              </p>
                            )}
                            {!isCancelled && order.admin_remark && (
                              <p className="text-[11px] font-bold text-amber-800 mt-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                Live Store Update: {order.admin_remark}
                              </p>
                            )}
                            <p className="text-xs font-bold text-gray-900 mt-1">
                              Total: ₹{order.total} • {order.payment_method}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTrackingOrderId(order.id);
                                setIsAuthModalOpen(false);
                              }}
                              className={`flex-1 sm:flex-none px-3.5 py-2 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1 shadow-sm ${
                                isCancelled
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-brand-600 hover:bg-brand-700 text-white'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isCancelled ? 'View Status' : 'Track Live'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB: WALLET */}
              {activeTab === 'wallet' && (() => {
                const cleanPhone = String(customerUser?.phone || '').replace(/\D/g, '').slice(-10);
                const userWalletData = wallets[cleanPhone] || { balance: customerWalletBalance, history: [] };
                const historyList = Array.isArray(userWalletData.history) ? userWalletData.history : [];

                return (
                  <div className="space-y-5 animate-fadeIn">
                    {/* Hero Wallet Card */}
                    <div className="bg-gradient-to-br from-emerald-700 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="bg-emerald-400 text-slate-950 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <Wallet className="w-3.5 h-3.5" />
                            <span>GhartakKart Cash Wallet</span>
                          </span>
                          <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            <span>100% Usable at Checkout</span>
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-emerald-200">Available Wallet Balance</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl sm:text-4xl font-black tracking-tight">₹{customerWalletBalance}</span>
                            <span className="text-xs font-bold text-emerald-300">INR</span>
                          </div>
                          <p className="text-xs text-emerald-100 font-medium mt-1.5 max-w-md">
                            Use your wallet balance to pay for grocery, vegetables & daily essentials directly on checkout with 1-tap instant deduction.
                          </p>
                        </div>

                        <div className="pt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsAuthModalOpen(false)}
                            className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Order Now & Redeem at Checkout</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* How Wallet Works */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1">
                        <div className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                          <span>⚡ 1-Tap Redemption</span>
                        </div>
                        <p className="text-[11px] text-emerald-800">
                          Toggle &quot;Pay with Wallet&quot; at checkout to deduct money instantly from your order.
                        </p>
                      </div>
                      <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-2xl space-y-1">
                        <div className="font-extrabold text-teal-900 flex items-center gap-1.5">
                          <span>🎁 Store Cashback & Gifts</span>
                        </div>
                        <p className="text-[11px] text-teal-800">
                          Promotional bonuses, cashbacks, and goodwill top-ups are credited directly here.
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl space-y-1">
                        <div className="font-extrabold text-blue-900 flex items-center gap-1.5">
                          <span>🛡️ Instant Auto-Refund</span>
                        </div>
                        <p className="text-[11px] text-blue-800">
                          If an order is ever cancelled, your wallet funds are restored immediately.
                        </p>
                      </div>
                    </div>

                    {/* Customer 1% Cashback Scratch Cards */}
                    {(() => {
                      const userOrdersWithScratchCard = orders.filter(o => {
                        const oPhone = String(o.customer_phone || '').replace(/\D/g, '').slice(-10);
                        return oPhone === cleanPhone && o.scratch_card;
                      });
                      if (userOrdersWithScratchCard.length === 0) return null;

                      const unscratchedList = userOrdersWithScratchCard.filter(o => !o.scratch_card.isScratched);

                      return (
                        <div className="space-y-3 bg-amber-50/60 p-4 rounded-3xl border border-amber-200">
                          <div className="flex items-center justify-between">
                            <h5 className="font-black text-sm text-amber-950 flex items-center gap-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                              <span>My Scratch Cards (1% Order Cashback)</span>
                            </h5>
                            {unscratchedList.length > 0 && (
                              <span className="text-[11px] font-black text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full border border-amber-300 animate-pulse">
                                {unscratchedList.length} Unscratched
                              </span>
                            )}
                          </div>

                          <div className="space-y-3">
                            {userOrdersWithScratchCard.map(o => (
                              <div key={o.id} className="bg-white p-3 rounded-2xl border border-amber-200 shadow-xs">
                                <ScratchCard
                                  scratchCard={o.scratch_card}
                                  orderId={o.id}
                                  isAlreadyScratched={Boolean(o.scratch_card.isScratched)}
                                  onScratch={async () => {
                                    if (claimOrderScratchCard) {
                                      await claimOrderScratchCard(o.id, cleanPhone);
                                    }
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Transaction History Log */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>Wallet Activity & History</span>
                        </h5>
                        <span className="text-[11px] font-bold text-gray-500">
                          {historyList.length} {historyList.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>

                      {historyList.length === 0 ? (
                        <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 text-center text-gray-400 space-y-1.5">
                          <Wallet className="w-8 h-8 text-gray-300 mx-auto" />
                          <p className="font-bold text-xs text-gray-700">No wallet transactions yet</p>
                          <p className="text-[11px] text-gray-500">
                            Cashback credits from the store and checkout redemptions will appear here.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {historyList.map(tx => {
                            const isCredit = tx.type === 'credit';
                            return (
                              <div
                                key={tx.id}
                                className="p-3.5 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 transition-all flex items-center justify-between gap-3 shadow-2xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                      isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                    }`}
                                  >
                                    {isCredit ? (
                                      <ArrowDownLeft className="w-5 h-5" />
                                    ) : (
                                      <ArrowUpRight className="w-5 h-5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-extrabold text-xs text-gray-900 truncate">
                                      {tx.reason || (isCredit ? 'Wallet Balance Added' : 'Redeemed on Order')}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                      <span>
                                        {tx.created_at
                                          ? new Date(tx.created_at).toLocaleString('en-IN', {
                                              day: '2-digit',
                                              month: 'short',
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })
                                          : 'Recent'}
                                      </span>
                                      {tx.order_id && (
                                        <span className="font-mono bg-gray-100 px-1.5 py-0.2 rounded text-gray-700 font-bold">
                                          #{tx.order_id}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span
                                    className={`font-black text-sm block ${
                                      isCredit ? 'text-emerald-600' : 'text-rose-600'
                                    }`}
                                  >
                                    {isCredit ? `+₹${tx.amount}` : `-₹${tx.amount}`}
                                  </span>
                                  {tx.balanceAfter !== undefined && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                      Bal: ₹{tx.balanceAfter}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB: STAMPS & SURPRISE GIFTS */}
              {activeTab === 'stamps' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Hero Stamp Pass Card */}
                  <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5" />
                          <span>Loyalty Stamp Card</span>
                        </span>
                        <span className="text-xs font-bold text-amber-100">
                          {10 - liveActiveStamps} stamps to next gift
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl sm:text-2xl font-black">
                          Collect 10 Stamps = Free Surprise Gift 🎁
                        </h4>
                        <p className="text-xs text-amber-100 font-medium mt-1">
                          Every single order above ₹250 automatically gives you 1 Stamp. When your card reaches 10 stamps, we deliver a delightful surprise gift right to your home!
                        </p>
                      </div>

                      {/* 10 Stamp Slot Grid */}
                      <div className="pt-2">
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {Array.from({ length: 10 }).map((_, idx) => {
                            const isStamped = idx < liveActiveStamps;
                            const is10th = idx === 9;
                            return (
                              <div
                                key={idx}
                                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all shadow-sm ${
                                  isStamped
                                    ? 'bg-white text-amber-700 border-white scale-105 shadow-md'
                                    : is10th
                                    ? 'bg-amber-700/60 border-amber-300 border-dashed text-amber-200 animate-pulse'
                                    : 'bg-white/10 border-white/20 text-white/50'
                                }`}
                              >
                                {isStamped ? (
                                  <span className="text-base sm:text-lg">⭐</span>
                                ) : is10th ? (
                                  <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
                                ) : (
                                  <span className="text-xs font-black">{idx + 1}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rewards Stats Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                        Current Stamps
                      </span>
                      <span className="text-2xl font-black text-amber-900 mt-1 block">
                        {liveActiveStamps} / 10
                      </span>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Active stamps collected
                      </p>
                    </div>

                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Gifts Earned
                      </span>
                      <span className="text-2xl font-black text-emerald-900 mt-1 block">
                        {liveSurpriseGifts} 🎁
                      </span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Delivered to your home
                      </p>
                    </div>
                  </div>

                  {/* Rules Explainer */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-gray-600 space-y-2">
                    <h5 className="font-bold text-gray-900 flex items-center gap-1.5">
                      <span>How it works:</span>
                    </h5>
                    <ul className="space-y-1.5 pl-4 list-disc text-[11px]">
                      <li>Place any grocery, fruits, veggies or fast food order of ₹250 or more.</li>
                      <li>1 Stamp is credited immediately upon placing your order.</li>
                      <li>Upon your 10th stamp, a complimentary Surprise Gift packet is dispatched alongside your order straight to your doorstep!</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 2: ADDRESSES */}
              {activeTab === 'addresses' && (
                <div className="space-y-3">
                  {(customerUser?.addresses || []).length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <MapPin className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm font-semibold">No saved addresses</p>
                      <p className="text-xs mt-1">Addresses you save during checkout will appear here.</p>
                    </div>
                  ) : (
                    (customerUser?.addresses || []).map(addr => (
                      <div
                        key={addr.id}
                        className="p-4 bg-white border border-gray-200 rounded-2xl flex items-start justify-between gap-3 shadow-sm"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="text-xs">
                            <span className="font-bold text-gray-900 text-sm">{addr.label}</span>
                            <p className="text-gray-600 mt-0.5">{addr.line1 || addr.address}</p>
                            {addr.landmark && <p className="text-gray-400">Landmark: {addr.landmark}</p>}
                            <p className="text-gray-500">{addr.city || 'Khair'}, {addr.pincode || '202138'}</p>
                            {addr.lat && addr.lng && (
                              <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                                📍 {Number(addr.lat).toFixed(5)}, {Number(addr.lng).toFixed(5)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {addr.lat && addr.lng && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserLocation(prev => ({
                                  ...prev,
                                  lat: Number(addr.lat),
                                  lng: Number(addr.lng),
                                  addressText: addr.line1 || addr.address || prev.addressText,
                                  landmark: addr.landmark || '',
                                  label: addr.label || 'Home',
                                  isAutoDetected: true
                                }));
                                if (checkServiceability) checkServiceability(Number(addr.lat), Number(addr.lng));
                                setIsAuthModalOpen(false);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg border border-emerald-200 transition-colors"
                            >
                              Deliver Here
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 3: PROFILE */}
              {activeTab === 'profile' && (
                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Registered Mobile</label>
                    <input
                      type="text"
                      disabled
                      value={customerUser?.phone ? `+91 ${customerUser.phone.replace(/^\+91/, '')}` : ''}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  {isSavedNotice && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Profile updated successfully!</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      className="py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-brand-600/20 cursor-pointer"
                    >
                      Save Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrivacyModalOpen(true)}
                      className="text-xs text-brand-700 hover:text-brand-900 font-bold underline cursor-pointer"
                    >
                      🔒 View Privacy Policy
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}