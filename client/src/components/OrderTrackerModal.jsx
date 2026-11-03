import React, { useState } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import {
  X,
  Clock,
  CheckCircle2,
  Package,
  Bike,
  Store,
  MapPin,
  AlertCircle,
  RotateCcw,
  Printer,
  ChevronRight,
  PhoneCall,
  Sparkles,
  Gift
} from 'lucide-react';
import ScratchCard from './ScratchCard.jsx';

export default function OrderTrackerModal({ orderId, onClose, onOpenInvoice }) {
  const { orders, staff, addToCart, setIsCartOpen, claimOrderScratchCard } = useStore();

  const order = orders.find(o => o.id === orderId);
  if (!order) return null;

  const assignedStaff = staff.find(s => s.id === order.assigned_staff_id);

  // Status mapping
  const steps = [
    { key: 'Placed', label: 'Order Placed', icon: Store, desc: 'Received by store system' },
    { key: 'Accepted', label: 'Accepted', icon: CheckCircle2, desc: 'Confirmed by store manager' },
    { key: 'Packing', label: 'Packing', icon: Package, desc: 'Items checked & bagged' },
    { key: 'Out for Delivery', label: 'Out for Delivery', icon: Bike, desc: 'Rider on the road' },
    { key: 'Delivered', label: 'Delivered', icon: CheckCircle2, desc: 'Handed over to customer' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === order.order_status);
  const isCancelled = order.order_status === 'Cancelled' || order.order_status === 'Rejected';

  const handleReorder = () => {
    order.items.forEach(item => {
      addToCart({
        id: item.product_id,
        name: item.name,
        price: item.price,
        unit: item.unit,
        stock: 50
      }, item.qty);
    });
    onClose();
    setIsCartOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-gray-900">Order #{order.id}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isCancelled
                    ? 'bg-rose-100 text-rose-800'
                    : order.order_status === 'Delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-brand-100 text-brand-800'
                }`}>
                  {order.order_status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenInvoice && (
              <button
                type="button"
                onClick={() => onOpenInvoice(order)}
                className="p-2 text-gray-600 hover:text-brand-700 hover:bg-brand-50 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold"
                title="View & Print Customer Receipt"
              >
                <Printer className="w-4 h-4 text-brand-600" />
                <span className="hidden sm:inline">Receipt</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tracker Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Stepper (Unless cancelled) */}
          {isCancelled ? (
            <div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-300 text-rose-900 text-xs flex items-start gap-3 shadow-sm animate-fadeIn">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-black text-sm text-rose-900">❌ Order Cancelled by Store</h4>
                  <span className="text-[10px] font-extrabold uppercase bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                    Live Update
                  </span>
                </div>
                <p className="mt-1 font-semibold text-rose-800">
                  {order.admin_remark || order.cancel_reason || order.reject_reason || 'This order was cancelled by the store.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                Live Delivery Progress
              </h4>
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {steps.map((st, idx) => {
                  const Icon = st.icon;
                  const isDone = currentStepIndex >= idx;
                  const isCurrent = currentStepIndex === idx;

                  return (
                    <div key={st.key} className="relative flex items-start gap-3">
                      <div
                        className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                          isDone
                            ? 'bg-brand-600 border-brand-600 text-white shadow-sm'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div className="text-xs">
                        <p className={`font-bold ${isCurrent ? 'text-brand-700 text-sm' : isDone ? 'text-gray-900' : 'text-gray-400'}`}>
                          {st.label}
                        </p>
                        <p className="text-[11px] text-gray-500">{st.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 1% Order Cashback Scratch Card (Shopping >= 500) */}
          {order.scratch_card && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                  Shopping Above ₹500 Reward
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  1% Instant Cashback
                </span>
              </div>
              <ScratchCard
                scratchCard={order.scratch_card}
                orderId={order.id}
                isAlreadyScratched={Boolean(order.scratch_card.isScratched)}
                onScratch={async () => {
                  if (claimOrderScratchCard) {
                    await claimOrderScratchCard(order.id, order.customer_phone);
                  }
                }}
              />
            </div>
          )}

          {/* Admin Live Updates / Remarks */}
          {order.admin_remark && !isCancelled && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-fadeIn">
              <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[11px] text-amber-800 uppercase tracking-wider block">
                  Store Update
                </span>
                <p className="font-medium text-xs text-amber-950 mt-0.5">{order.admin_remark}</p>
              </div>
            </div>
          )}

          {/* Assigned Delivery Partner Banner (If Out for Delivery) */}
          {assignedStaff && order.order_status === 'Out for Delivery' && (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950">{assignedStaff.name}</h4>
                  <p className="text-emerald-700 text-[11px]">{assignedStaff.vehicle}</p>
                </div>
              </div>
              <a
                href={`tel:${assignedStaff.phone}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-sm text-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Rider</span>
              </a>
            </div>
          )}

          {/* Destination Details */}
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-gray-800">
              <MapPin className="w-4 h-4 text-brand-600" />
              <span>Delivering to: {order.address.label}</span>
              <span className="text-[10px] bg-gray-200 px-1.5 py-0.2 rounded font-semibold text-gray-700">
                {order.distance_km} km
              </span>
            </div>
            <p className="text-gray-600 pl-6">{order.address.line1}</p>
            {order.address.landmark && (
              <p className="text-gray-500 pl-6 text-[11px]">Near: {order.address.landmark}</p>
            )}
          </div>

          {/* Items Summary */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Ordered Items ({order.items.length})
            </h4>
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
              {order.items.map((it, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-700">{it.qty}x</span>
                    <span className="text-gray-800 font-medium">{it.name}</span>
                    <span className="text-gray-400 text-[10px]">({it.unit})</span>
                  </div>
                  <span className="font-bold text-gray-900">₹{it.price * it.qty}</span>
                </div>
              ))}
              {order.milestone_gift && (
                <div className="p-3 bg-emerald-50/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-emerald-700">🎁 1x</span>
                    <div>
                      <span className="text-emerald-950 font-extrabold">{order.milestone_gift.name}</span>
                      <span className="text-emerald-700 text-[10px] font-bold block">
                        FREE Milestone Gift (₹{order.milestone_gift.tier_amount}+ Offer • {order.milestone_gift.unit})
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full">
                    FREE
                  </span>
                </div>
              )}
            </div>

            {/* Bill breakdown */}
            <div className="mt-3 p-3 bg-gray-50 rounded-2xl space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{order.delivery_fee}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Coupon Discount ({order.coupon_code})</span>
                  <span>-₹{order.discount}</span>
                </div>
              )}
              <div className="pt-1 border-t border-gray-200 flex justify-between font-extrabold text-sm text-gray-900">
                <span>Total Paid</span>
                <span className="text-brand-700">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons (Customer Cancel Option Removed) */}
          <div className="space-y-2 pt-2">
            {onOpenInvoice && (
              <button
                type="button"
                onClick={() => onOpenInvoice(order)}
                className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all border border-amber-200 shadow-sm"
              >
                <Printer className="w-4 h-4 text-amber-700" />
                <span>🧾 View & Print Receipt (with Store Logo)</span>
              </button>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={`https://wa.me/917017675784?text=${encodeURIComponent(
                  `Hello GhartakKart! I need help regarding my Order #${order.id} (Status: ${order.order_status}, Total: ₹${order.total}).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <span>💬 WhatsApp Store Support (7017675784)</span>
              </a>
              <button
                type="button"
                onClick={handleReorder}
                className="flex-1 py-2.5 px-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reorder Basket</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
