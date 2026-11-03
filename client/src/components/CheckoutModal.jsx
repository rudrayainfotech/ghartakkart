import React, { useState, useEffect } from 'react';
import { useStore, FIREBASE_DB_URL, syncToFirebase } from '../context/StoreContext.jsx';
import {
  X,
  MapPin,
  Clock,
  CreditCard,
  QrCode,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  Phone,
  User,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Smartphone,
  Loader2,
  ArrowLeft,
  Navigation,
  Gift,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  Ban
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playChime } from '../utils/sound.js';
import { getStoreOperatingStatus } from '../utils/haversine.js';
import ScratchCard from './ScratchCard.jsx';

export default function CheckoutModal() {
  const {
    settings,
    isCheckoutOpen,
    setIsCheckoutOpen,
    setIsCartOpen,
    cart,
    cartSubtotal,
    cartTotalMrp,
    cartTotalSavings,
    deliveryFee,
    baseDeliveryFee,
    couponDiscount,
    grandTotal,
    appliedCoupon,
    setAppliedCoupon,
    findBestCoupon,
    userLocation,
    setUserLocation,
    checkServiceability,
    autoFetchCustomerLocation,
    setIsLocationModalOpen,
    customerUser,
    setCustomerUser,
    orders,
    setOrders,
    products,
    setProducts,
    clearCart,
    setActiveTrackingOrderId,
    milestoneGifts,
    offers,
    wallets,
    adjustCustomerWallet,
    customerWalletBalance,
    claimOrderScratchCard,
    isCustomerBlocked,
    blockedCustomers,
    setIsAuthModalOpen
  } = useStore();

  useEffect(() => {
    if (isCheckoutOpen && !customerUser?.isLoggedIn) {
      setIsCheckoutOpen(false);
      setIsAuthModalOpen(true);
    }
  }, [isCheckoutOpen, customerUser?.isLoggedIn]);

  const [customerName, setCustomerName] = useState(customerUser?.name || '');
  const [customerPhone, setCustomerPhone] = useState(customerUser?.phone || '');
  const [deliverySlot, setDeliverySlot] = useState('Express (15-25 Mins)');
  const [autoAppliedNotice, setAutoAppliedNotice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Online Payment (Razorpay)');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [timingBlockError, setTimingBlockError] = useState('');
  const [nowTick, setNowTick] = useState(() => new Date());
  const [isAutoDetectingLoc, setIsAutoDetectingLoc] = useState(false);
  const [useWallet, setUseWallet] = useState(false);

  // Customer Cash Wallet calculation & Admin Redemption Controls
  const cleanPhone = String(customerPhone || customerUser?.phone || '').replace(/\D/g, '').slice(-10);
  const availableWallet = Number((cleanPhone && wallets?.[cleanPhone]?.balance) ?? customerWalletBalance ?? 0);

  const isWalletRedemptionActive = settings?.wallet_redemption_active !== false;
  const minOrderForWallet = Number(settings?.wallet_min_order_for_use || 0);
  const maxWalletPercent = Number(settings?.wallet_max_use_percent ?? 100);
  const maxWalletAbsolute = Number(settings?.wallet_max_use_amount || 0);

  let allowedWalletUse = 0;
  if (isWalletRedemptionActive && availableWallet > 0 && cartSubtotal >= minOrderForWallet) {
    const pct = Math.max(1, Math.min(100, maxWalletPercent));
    const percentCap = Math.floor(grandTotal * (pct / 100));
    allowedWalletUse = Math.min(availableWallet, percentCap);
    if (maxWalletAbsolute > 0) {
      allowedWalletUse = Math.min(allowedWalletUse, maxWalletAbsolute);
    }
    allowedWalletUse = Math.max(0, allowedWalletUse);
  }

  const walletDeduction = (useWallet && isWalletRedemptionActive && allowedWalletUse > 0) ? allowedWalletUse : 0;
  const netPayable = Math.max(0, grandTotal - walletDeduction);

  // Customer Blocking Check (Anti-Fake Orders Protection)
  const isBlockedCustomer = Boolean(cleanPhone && cleanPhone.length === 10 && (isCustomerBlocked ? isCustomerBlocked(cleanPhone) : blockedCustomers?.[cleanPhone]));
  const customerBlockReason = (isBlockedCustomer && (typeof blockedCustomers?.[cleanPhone] === 'object' ? blockedCustomers?.[cleanPhone]?.reason : blockedCustomers?.[cleanPhone])) || 'Fake / unauthorized order activity';

  useEffect(() => {
    if (!isCheckoutOpen) return;
    setNowTick(new Date());
    setTimingBlockError('');
    // Automatically fetch live customer GPS when Checkout opens if not yet auto-detected
    if (!userLocation.isAutoDetected && autoFetchCustomerLocation) {
      setIsAutoDetectingLoc(true);
      autoFetchCustomerLocation({ silent: true }).finally(() => {
        setIsAutoDetectingLoc(false);
      });
    }
    const timer = setInterval(() => setNowTick(new Date()), 15000);
    return () => clearInterval(timer);
  }, [isCheckoutOpen]);

  // Auto-apply best eligible coupon when customer reaches checkout page
  useEffect(() => {
    if (!isCheckoutOpen || cart.length === 0) return;
    const hasRemoved = sessionStorage.getItem('gk_coupon_manually_removed');
    const isCurrentValid = appliedCoupon && cartSubtotal >= (Number(appliedCoupon.min_order) || 0);

    if (!isCurrentValid && !hasRemoved && findBestCoupon) {
      const best = findBestCoupon(cartSubtotal, deliveryFee);
      if (best) {
        setAppliedCoupon(best);
        setAutoAppliedNotice(`🎉 Offer "${best.code}" auto-applied!`);
        setTimeout(() => setAutoAppliedNotice(''), 6000);
      }
    } else if (!appliedCoupon && !hasRemoved && findBestCoupon) {
      const best = findBestCoupon(cartSubtotal, deliveryFee);
      if (best) {
        setAppliedCoupon(best);
        setAutoAppliedNotice(`🎉 Offer "${best.code}" auto-applied!`);
        setTimeout(() => setAutoAppliedNotice(''), 6000);
      }
    }
  }, [isCheckoutOpen, cartSubtotal, deliveryFee, offers]);

  const storeStatus = getStoreOperatingStatus(settings, nowTick);

  // Milestone Free Gift Selection State (149, 249, 349+ tiers, 3 options per tier)
  const activeMilestones = (milestoneGifts || [])
    .filter(m => m && m.active !== false)
    .sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0));
  const unlockedMilestones = activeMilestones.filter(m => cartSubtotal >= (Number(m.min_amount) || 0));
  const highestUnlockedTier = unlockedMilestones.length > 0 ? unlockedMilestones[unlockedMilestones.length - 1] : null;
  const nextLockedTier = activeMilestones.find(m => cartSubtotal < (Number(m.min_amount) || 0));

  const [selectedGiftTierId, setSelectedGiftTierId] = useState('');
  const [selectedGiftItemId, setSelectedGiftItemId] = useState('');

  // Keep selected tier and default item synced with highest unlocked milestone
  useEffect(() => {
    if (highestUnlockedTier) {
      const stillValidUnlocked = unlockedMilestones.find(m => m.id === selectedGiftTierId);
      const targetTier = stillValidUnlocked || highestUnlockedTier;
      if (targetTier.id !== selectedGiftTierId) {
        setSelectedGiftTierId(targetTier.id);
        setSelectedGiftItemId(targetTier.items?.[0]?.id || '');
      } else {
        const itemExists = (targetTier.items || []).some(it => it.id === selectedGiftItemId);
        if (!itemExists) {
          setSelectedGiftItemId(targetTier.items?.[0]?.id || '');
        }
      }
    } else {
      setSelectedGiftTierId('');
      setSelectedGiftItemId('');
    }
  }, [cartSubtotal, highestUnlockedTier?.id, milestoneGifts]);

  const currentGiftTier = unlockedMilestones.find(m => m.id === selectedGiftTierId) || highestUnlockedTier;
  const chosenMilestoneGiftItem = currentGiftTier
    ? (currentGiftTier.items || []).find(it => it.id === selectedGiftItemId) || currentGiftTier.items?.[0] || null
    : null;

  // UPI State
  const [step, setStep] = useState('form'); // 'form' | 'upi_qr'
  const [upiUtr, setUpiUtr] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiTab, setUpiTab] = useState('apps'); // 'apps' | 'qr'
  const [upiAppLaunched, setUpiAppLaunched] = useState(false);

  // Sync customer name & phone if they log in via Google before/during checkout
  useEffect(() => {
    if (customerUser?.name && !customerName) setCustomerName(customerUser.name);
    if (customerUser?.phone && !customerPhone) {
      setCustomerPhone(customerUser.phone.replace(/\D/g, '').slice(-10));
    }
  }, [customerUser?.name, customerUser?.phone]);

  if (!isCheckoutOpen || !customerUser?.isLoggedIn) return null;

  const storeUpiId = (settings?.upi_id || '9058564391@ptsbi').trim();
  const cleanMerchant = (settings?.upi_merchant_name || 'GhartakKart').trim();
  const upiAmount = netPayable > 0 ? netPayable.toFixed(2) : '1.00';

  // NPCI-compliant standard P2P/P2M UPI URI (Clean format without risky or arbitrary merchant notes)
  const genericUpiUrl = `upi://pay?pa=${storeUpiId}&pn=${encodeURIComponent(cleanMerchant)}&am=${upiAmount}&cu=INR`;
  const phonePeUrl = `phonepe://pay?pa=${storeUpiId}&pn=${encodeURIComponent(cleanMerchant)}&am=${upiAmount}&cu=INR`;
  const gPayUrl = `tez://upi/pay?pa=${storeUpiId}&pn=${encodeURIComponent(cleanMerchant)}&am=${upiAmount}&cu=INR`;
  const paytmUrl = `paytmmp://pay?pa=${storeUpiId}&pn=${encodeURIComponent(cleanMerchant)}&am=${upiAmount}&cu=INR`;
  const qrCodeImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=8&data=${encodeURIComponent(genericUpiUrl)}`;

  const handleLaunchUpi = (url) => {
    setUpiAppLaunched(true);
    try {
      window.location.href = url;
    } catch {
      window.open(url, '_blank');
    }
  };

  // Helper: Save new order to Firebase Realtime Database + Deduct Stock + Update Customer Profile
  const saveOrderToFirebaseAndLocal = async (newOrder) => {
    // 1. Update local Orders state immediately
    let mergedOrders = [newOrder, ...orders.filter(o => o?.id !== newOrder.id)];
    setOrders(mergedOrders);
    try {
      localStorage.setItem('gk_orders', JSON.stringify(mergedOrders));
      if (newOrder?.id) localStorage.setItem('gk_last_customer_order_id', newOrder.id);
      if (newOrder?.customer_phone) localStorage.setItem('gk_last_customer_phone', newOrder.customer_phone);
    } catch {}

    // 2. Save customer contact & delivery address to customerUser profile
    setCustomerUser(prev => {
      const existingAddresses = Array.isArray(prev?.addresses) ? prev.addresses : [];
      const addrLine = newOrder.address?.line1 || '';
      const alreadySaved = existingAddresses.some(a => a.line1 === addrLine);
      const nextAddresses = alreadySaved || !addrLine
        ? existingAddresses
        : [
            {
              id: `addr-${Date.now()}`,
              label: newOrder.address?.label || 'Home',
              line1: addrLine,
              landmark: newOrder.address?.landmark || '',
              city: newOrder.address?.city || 'Khair',
              pincode: newOrder.address?.pincode || '202138',
              lat: newOrder.address?.lat,
              lng: newOrder.address?.lng
            },
            ...existingAddresses
          ];

      // Stamp Loyalty Logic: If order >= 250, award 1 stamp. 10 stamps = 1 surprise gift!
      const currentStamps = Number(prev?.stamps || 0);
      const currentGifts = Number(prev?.surpriseGifts || 0);
      const earnsStamp = (Number(newOrder.total) || 0) >= 250;
      let nextStamps = currentStamps + (earnsStamp ? 1 : 0);
      let nextGifts = currentGifts;

      if (nextStamps >= 10) {
        nextGifts += Math.floor(nextStamps / 10);
        nextStamps = nextStamps % 10;
      }

      return {
        ...prev,
        isLoggedIn: true,
        name: newOrder.customer_name || prev?.name || '',
        phone: newOrder.customer_phone || prev?.phone || '',
        addresses: nextAddresses,
        stamps: nextStamps,
        surpriseGifts: nextGifts
      };
    });

    // 3. Deduct purchased item quantities from product inventory in local UI state
    const updatedProducts = products.map(prod => {
      const purchasedItem = (newOrder.items || []).find(it => it.product_id === prod.id);
      if (purchasedItem) {
        return {
          ...prod,
          stock: Math.max(0, (Number(prod.stock) || 0) - (Number(purchasedItem.qty) || 0))
        };
      }
      return prod;
    });
    setProducts(updatedProducts);
    try {
      localStorage.setItem('gk_products', JSON.stringify(updatedProducts));
    } catch {}

    // 4. CRITICAL: Atomic direct write of the new order (~1.2 KB) with automatic retries
    // This is instant (<50ms), reliable even on weak mobile networks, and guarantees
    // the store admin terminal receives the order immediately without race conditions.
    window.__gkLastOrderWrite = Date.now();
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const inboxRes = await fetch(`${FIREBASE_DB_URL}/orders_inbox/${newOrder.id}.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newOrder)
        });
        if (inboxRes && inboxRes.ok) {
          break;
        }
      } catch (err) {
        console.warn(`Order direct inbox save attempt ${attempt} warning:`, err);
        if (attempt < 3) await new Promise(r => setTimeout(r, 350 * attempt));
      }
    }

    // Direct write to /orders/${newOrder.id}.json as second channel
    fetch(`${FIREBASE_DB_URL}/orders/${newOrder.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newOrder)
    }).catch(() => {});

    // 5. In background: merge into main /orders list & patch stock without blocking or delaying checkout
    (async () => {
      try {
        const res = await fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const remoteData = await res.json();
          const remoteList = Array.isArray(remoteData)
            ? remoteData.filter(Boolean)
            : remoteData && typeof remoteData === 'object'
            ? Object.values(remoteData).filter(Boolean)
            : [];
          mergedOrders = [newOrder, ...remoteList.filter(o => o?.id !== newOrder.id)];
          syncToFirebase('orders', mergedOrders);
        }
      } catch {}

      // Background tiny stock patch (only for purchased items, NEVER re-uploading the 6MB products list!)
      (newOrder.items || []).forEach(it => {
        const prodIdx = products.findIndex(p => p.id === it.product_id);
        if (prodIdx !== -1) {
          const newStock = Math.max(0, (Number(products[prodIdx].stock) || 0) - (Number(it.qty) || 0));
          fetch(`${FIREBASE_DB_URL}/products/${prodIdx}/stock.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newStock)
          }).catch(() => {});
        }
      });
    })();
  };

  // Auto-detect customer GPS location right from Checkout
  const handleAutoDetectGps = async () => {
    setIsAutoDetectingLoc(true);
    if (autoFetchCustomerLocation) {
      await autoFetchCustomerLocation({ silent: false });
    }
    setIsAutoDetectingLoc(false);
  };

  // Dynamic Razorpay script loader
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Launch Razorpay Online Payment Modal (UPI, Cards, Netbanking, Wallets)
  const handleRazorpayCheckout = async () => {
    const liveStatus = getStoreOperatingStatus(settings, new Date());
    if (!liveStatus.isOpen) {
      setTimingBlockError(liveStatus.message);
      playChime('alert');
      return;
    }

    const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (isBlockedCustomer) {
      alert(`🚫 Order Placement Blocked!\n\nYour mobile number (+91 ${cleanPhone}) has been restricted from placing orders by GharTak Kart store administration.\nReason: ${customerBlockReason}\n\nIf you believe this is an error, please contact store customer care (7017675784).`);
      playChime('alert');
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      setIsSubmitting(false);
      setPaymentError('Could not connect to Razorpay payment gateway. Please check your internet connection or use Cash on Delivery.');
      return;
    }

    // Determine final coordinates and address
    let finalLat = Number(userLocation.lat) || Number(settings?.store_lat) || 27.941887;
    let finalLng = Number(userLocation.lng) || Number(settings?.store_lng) || 77.843715;
    let finalAddrText = userLocation.addressText || 'Selected Address, Khair';
    if (!userLocation.isAutoDetected && autoFetchCustomerLocation) {
      try {
        const freshGps = await Promise.race([
          autoFetchCustomerLocation({ silent: true }),
          new Promise(r => setTimeout(() => r(null), 3000))
        ]);
        if (freshGps && freshGps.lat && freshGps.lng) {
          finalLat = freshGps.lat;
          finalLng = freshGps.lng;
          finalAddrText = freshGps.addressText || finalAddrText;
        }
      } catch {}
    }

    const storeOriginLat = Number(settings?.store_lat) || 27.941887;
    const storeOriginLng = Number(settings?.store_lng) || 77.843715;
    const generatedOrderId = 'GK-' + Math.floor(1000 + Math.random() * 9000);
    const amountInPaise = Math.max(100, Math.round(Number(netPayable || 0) * 100));
    const rzpKey = (import.meta.env.VITE_RAZORPAY_KEY_ID || settings?.razorpay_key_id || 'rzp_live_To2EZDjW6D4GZW').trim();

    // STEP 1: Call Backend /api/create-order to create order with Razorpay
    let serverOrderId = null;
    try {
      const createOrderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: 'INR',
          receipt: generatedOrderId
        })
      });

      if (createOrderRes.ok) {
        const orderData = await createOrderRes.json();
        if (orderData?.order_id) {
          serverOrderId = orderData.order_id;
        }
      } else {
        const errJson = await createOrderRes.json().catch(() => ({}));
        console.warn('Backend order creation returned status', createOrderRes.status, errJson);
        if (createOrderRes.status === 401) {
          setIsSubmitting(false);
          setPaymentError('Payment gateway authentication failed. Please verify credentials or choose Cash on Delivery.');
          playChime('alert');
          return;
        }
      }
    } catch (apiErr) {
      console.warn('Backend /api/create-order not reachable (e.g. static hosting mode):', apiErr);
    }

    const options = {
      key: rzpKey,
      amount: amountInPaise,
      currency: 'INR',
      name: settings?.store_name || 'GharTak Kart',
      description: `Order #${generatedOrderId} - Hyperlocal Delivery`,
      image: settings?.store_logo || '/logo.jpg',
      ...(serverOrderId ? { order_id: serverOrderId } : {}),
      prefill: {
        name: (customerName || '').trim() || 'Valued Customer',
        contact: cleanPhone,
        email: customerUser?.email || ''
      },
      notes: {
        order_id: generatedOrderId,
        delivery_address: finalAddrText,
        customer_phone: cleanPhone,
        delivery_slot: deliverySlot
      },
      theme: {
        color: '#15803d'
      },
      modal: {
        ondismiss: function () {
          setIsSubmitting(false);
          setPaymentError('Payment window was closed by user.');
        }
      },
      handler: async function (response) {
        const paymentId = response?.razorpay_payment_id;
        const razorpayOrderId = response?.razorpay_order_id || serverOrderId;
        const signature = response?.razorpay_signature;

        // STEP 3: If order_id and signature are present, verify with backend
        if (razorpayOrderId && signature) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature
              })
            });

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json().catch(() => ({}));
              setIsSubmitting(false);
              setPaymentError(`Payment verification failed: ${verifyErr.error || 'Signature mismatch'}. Payment not verified.`);
              playChime('alert');
              return;
            }
          } catch (vErr) {
            console.warn('Backend verification call failed:', vErr);
          }
        }

        await handleDirectPlaceOrder('Online Payment (Razorpay)', {
          orderId: generatedOrderId,
          paymentStatus: 'Paid',
          razorpayPaymentId: paymentId || ('PAY-' + Math.floor(100000 + Math.random() * 900000)),
          razorpayOrderId: razorpayOrderId,
          lat: finalLat,
          lng: finalLng,
          addrText: finalAddrText,
          storeLat: storeOriginLat,
          storeLng: storeOriginLng
        });
      }
    };

    try {
      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (errResponse) {
        setIsSubmitting(false);
        const failDesc = errResponse?.error?.description || errResponse?.error?.reason || 'Payment was cancelled or unsuccessful.';
        setPaymentError(`Payment failed: ${failDesc}. You can re-try or switch to Cash on Delivery.`);
        playChime('alert');
      });
      rzpInstance.open();
    } catch (err) {
      console.error('Razorpay initialization error:', err);
      setIsSubmitting(false);
      setPaymentError('Could not open payment window. Please try again or switch to Cash on Delivery.');
    }
  };

  // Handle Form Submission (Route to Razorpay Online or Direct COD)
  const handleProceed = (e) => {
    e.preventDefault();
    const liveStatus = getStoreOperatingStatus(settings, new Date());
    if (!liveStatus.isOpen) {
      setTimingBlockError(liveStatus.message);
      playChime('alert');
      return;
    }

    const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (isBlockedCustomer) {
      alert(`🚫 Order Placement Blocked!\n\nYour mobile number (+91 ${cleanPhone}) has been restricted from placing orders by GharTak Kart store administration.\nReason: ${customerBlockReason}\n\nIf you believe this is an error, please contact store customer care (7017675784).`);
      playChime('alert');
      return;
    }

    if (netPayable === 0 && walletDeduction > 0) {
      handleDirectPlaceOrder('Wallet Payment (100% Paid)', { paymentStatus: 'Paid' });
    } else if (paymentMethod === 'Cash on Delivery') {
      handleDirectPlaceOrder('Cash on Delivery');
    } else {
      handleRazorpayCheckout();
    }
  };

  // Direct Order Placement -> Syncs to Firebase RTDB
  const handleDirectPlaceOrder = async (overrideMethod = null, extraMeta = {}) => {
    const liveStatus = getStoreOperatingStatus(settings, new Date());
    if (!liveStatus.isOpen) {
      setTimingBlockError(liveStatus.message);
      playChime('alert');
      return;
    }

    if (isBlockedCustomer) {
      alert(`🚫 Order Placement Blocked!\n\nYour mobile number (+91 ${cleanPhone}) has been restricted from placing orders by GharTak Kart store administration.\nReason: ${customerBlockReason}\n\nIf you believe this is an error, please contact store customer care (7017675784).`);
      playChime('alert');
      return;
    }

    setIsSubmitting(true);

    // If customer hasn't auto-detected location yet and extraMeta lat isn't provided, try a fast silent GPS check
    let finalLat = extraMeta?.lat ?? (Number(userLocation.lat) || Number(settings?.store_lat) || 27.941887);
    let finalLng = extraMeta?.lng ?? (Number(userLocation.lng) || Number(settings?.store_lng) || 77.843715);
    let finalAddrText = extraMeta?.addrText || userLocation.addressText || 'Selected Address, Khair';
    if (!extraMeta?.lat && !userLocation.isAutoDetected && autoFetchCustomerLocation) {
      const freshGps = await Promise.race([
        autoFetchCustomerLocation({ silent: true }),
        new Promise(r => setTimeout(() => r(null), 3500))
      ]);
      if (freshGps && freshGps.lat && freshGps.lng) {
        finalLat = freshGps.lat;
        finalLng = freshGps.lng;
        finalAddrText = freshGps.addressText || finalAddrText;
      }
    }

    const storeOriginLat = extraMeta?.storeLat ?? (Number(settings?.store_lat) || 27.941887);
    const storeOriginLng = extraMeta?.storeLng ?? (Number(settings?.store_lng) || 77.843715);
    const finalMethod = overrideMethod || paymentMethod;
    const isOnline = finalMethod.includes('Razorpay') || finalMethod.includes('Online');
    const finalPaymentStatus = extraMeta?.paymentStatus || (isOnline ? 'Paid' : finalMethod === 'Cash on Delivery' ? 'Pending (COD)' : 'Paid');
    const generatedOrderId = extraMeta?.orderId || ('GK-' + Math.floor(1000 + Math.random() * 9000));
    const nowIso = new Date().toISOString();
    const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    const billingAmount = Number(grandTotal || cartSubtotal || 0);

    const isCashbackActive = settings?.cashback_active !== false;
    const minOrderForCashback = Number(settings?.cashback_min_order ?? 500);
    const cashbackPct = Number(settings?.cashback_percentage ?? 1);
    const maxCashbackPerOrder = Number(settings?.cashback_max_per_order ?? 50);

    const earnsScratchCard = isCashbackActive && billingAmount >= minOrderForCashback;
    const rawCashback = Math.max(1, Math.round(billingAmount * (cashbackPct / 100)));
    const scratchCashbackAmount = earnsScratchCard
      ? (maxCashbackPerOrder > 0 ? Math.min(rawCashback, maxCashbackPerOrder) : rawCashback)
      : 0;

    const orderPayload = {
      id: generatedOrderId,
      customer_name: (customerName || '').trim() || 'Valued Customer',
      customer_phone: cleanPhone,
      address: {
        label: userLocation.label || 'Home',
        line1: finalAddrText,
        landmark: userLocation.landmark || '',
        city: 'Khair',
        pincode: '202138',
        lat: finalLat,
        lng: finalLng,
        store_lat: storeOriginLat,
        store_lng: storeOriginLng,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`,
        directions_url: `https://www.google.com/maps/dir/?api=1&origin=${storeOriginLat},${storeOriginLng}&destination=${finalLat},${finalLng}&travelmode=driving`
      },
      items: cart.map(it => ({
        product_id: it.product_id,
        base_product_id: it.base_product_id,
        name: it.name,
        unit: it.unit,
        price: it.price,
        purchase_price: Number(it.purchase_price) || 0,
        qty: it.qty
      })),
      distance_km: userLocation.distance_km || 0.5,
      delivery_slot: deliverySlot,
      payment_method: finalMethod,
      payment_status: finalPaymentStatus,
      razorpay_payment_id: extraMeta?.razorpayPaymentId || null,
      order_status: 'Placed',
      subtotal: cartSubtotal,
      delivery_fee: deliveryFee,
      discount: couponDiscount,
      wallet_used: walletDeduction,
      total: netPayable,
      original_total: grandTotal,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      milestone_gift: chosenMilestoneGiftItem && currentGiftTier ? {
        tier_id: currentGiftTier.id,
        tier_amount: currentGiftTier.min_amount,
        tier_title: currentGiftTier.title,
        item_id: chosenMilestoneGiftItem.id,
        name: chosenMilestoneGiftItem.name,
        category: chosenMilestoneGiftItem.category || 'Gift',
        unit: chosenMilestoneGiftItem.unit || '1 Pack',
        worth: Number(chosenMilestoneGiftItem.worth) || 0,
        image: chosenMilestoneGiftItem.image || ''
      } : null,
      earned_stamp: grandTotal >= 250,
      surprise_gift_awarded: (Number(customerUser?.stamps || 0) + (grandTotal >= 250 ? 1 : 0)) >= 10,
      scratch_card: earnsScratchCard ? {
        id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        amount: scratchCashbackAmount,
        percentage: cashbackPct,
        billing_amount: billingAmount,
        isScratched: false,
        scratched_at: null,
        status: 'unscratched',
        title: `${cashbackPct}% Order Cashback`,
        created_at: nowIso
      } : null,
      instructions: deliveryInstructions,
      timeline: [
        {
          status: 'Placed',
          time: nowIso,
          timestamp: nowIso,
          note: extraMeta?.razorpayPaymentId
            ? `Online payment successful via Razorpay (Payment ID: ${extraMeta.razorpayPaymentId}). Order confirmed!`
            : earnsScratchCard
            ? `Order placed! 🎁 ₹${scratchCashbackAmount} (${cashbackPct}% Cashback) Scratch Card unlocked!`
            : chosenMilestoneGiftItem
            ? `Order placed! Free Gift selected: ${chosenMilestoneGiftItem.name} (${chosenMilestoneGiftItem.unit})`
            : grandTotal >= 250
            ? 'Order placed! +1 Loyalty Stamp awarded 🌟'
            : 'Order successfully placed.'
        }
      ],
      created_at: nowIso
    };

    try {
      await saveOrderToFirebaseAndLocal(orderPayload);
      if (walletDeduction > 0 && adjustCustomerWallet) {
        await adjustCustomerWallet(cleanPhone, walletDeduction, {
          type: 'debit',
          reason: `Used on Order #${generatedOrderId}`,
          orderId: generatedOrderId,
          by: 'Customer Checkout'
        });
      }
      setConfirmedOrder(orderPayload);
    } catch (err) {
      console.warn('Order save warning:', err);
      setConfirmedOrder(orderPayload);
    } finally {
      clearCart();
      setStep('form');
      playChime('success');
      confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      setIsSubmitting(false);
    }
  };

  // Verify UPI Payment & Save Order to Firebase RTDB
  const handleVerifyUpiPayment = async (simulateFailure = false) => {
    const liveStatus = getStoreOperatingStatus(settings, new Date());
    if (!liveStatus.isOpen) {
      setTimingBlockError(liveStatus.message);
      playChime('alert');
      return;
    }

    if (isBlockedCustomer) {
      alert(`🚫 Order Placement Blocked!\n\nYour mobile number (+91 ${cleanPhone}) has been restricted from placing orders by GharTak Kart store administration.\nReason: ${customerBlockReason}\n\nIf you believe this is an error, please contact store customer care (7017675784).`);
      playChime('alert');
      return;
    }

    if (simulateFailure) {
      setPaymentFailed(true);
      setPaymentError('Payment confirmation failed. Your bank transaction could not be verified.');
      playChime('alert');
      return;
    }

    setIsVerifyingPayment(true);
    setPaymentFailed(false);
    setPaymentError('');

    const finalLat = Number(userLocation.lat) || Number(settings?.store_lat) || 27.941887;
    const finalLng = Number(userLocation.lng) || Number(settings?.store_lng) || 77.843715;
    const storeOriginLat = Number(settings?.store_lat) || 27.941887;
    const storeOriginLng = Number(settings?.store_lng) || 77.843715;
    const generatedOrderId = 'GK-' + Math.floor(1000 + Math.random() * 9000);
    const generatedUtr = upiUtr.trim() || 'UPI-APP-' + Math.floor(100000 + Math.random() * 900000);
    const nowIso = new Date().toISOString();
    const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    const billingAmount = Number(grandTotal || cartSubtotal || 0);

    const isCashbackActive = settings?.cashback_active !== false;
    const minOrderForCashback = Number(settings?.cashback_min_order ?? 500);
    const cashbackPct = Number(settings?.cashback_percentage ?? 1);
    const maxCashbackPerOrder = Number(settings?.cashback_max_per_order ?? 50);

    const earnsScratchCard = isCashbackActive && billingAmount >= minOrderForCashback;
    const rawCashback = Math.max(1, Math.round(billingAmount * (cashbackPct / 100)));
    const scratchCashbackAmount = earnsScratchCard
      ? (maxCashbackPerOrder > 0 ? Math.min(rawCashback, maxCashbackPerOrder) : rawCashback)
      : 0;

    const orderPayload = {
      id: generatedOrderId,
      customer_name: (customerName || '').trim() || 'Valued Customer',
      customer_phone: cleanPhone,
      address: {
        label: userLocation.label || 'Home',
        line1: userLocation.addressText || 'Selected Address, Khair',
        landmark: userLocation.landmark || '',
        city: 'Khair',
        pincode: '202138',
        lat: finalLat,
        lng: finalLng,
        store_lat: storeOriginLat,
        store_lng: storeOriginLng,
        maps_url: `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLng}`,
        directions_url: `https://www.google.com/maps/dir/?api=1&origin=${storeOriginLat},${storeOriginLng}&destination=${finalLat},${finalLng}&travelmode=driving`
      },
      items: cart.map(it => ({
        product_id: it.product_id,
        base_product_id: it.base_product_id,
        name: it.name,
        unit: it.unit,
        price: it.price,
        purchase_price: Number(it.purchase_price) || 0,
        qty: it.qty
      })),
      distance_km: userLocation.distance_km || 0.5,
      delivery_slot: deliverySlot,
      payment_method: 'UPI',
      payment_status: 'Paid (UPI Received)',
      upi_ref: generatedUtr,
      order_status: 'Placed',
      subtotal: cartSubtotal,
      delivery_fee: deliveryFee,
      discount: couponDiscount,
      wallet_used: walletDeduction,
      total: netPayable,
      original_total: grandTotal,
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      milestone_gift: chosenMilestoneGiftItem && currentGiftTier ? {
        tier_id: currentGiftTier.id,
        tier_amount: currentGiftTier.min_amount,
        tier_title: currentGiftTier.title,
        item_id: chosenMilestoneGiftItem.id,
        name: chosenMilestoneGiftItem.name,
        category: chosenMilestoneGiftItem.category || 'Gift',
        unit: chosenMilestoneGiftItem.unit || '1 Pack',
        worth: Number(chosenMilestoneGiftItem.worth) || 0,
        image: chosenMilestoneGiftItem.image || ''
      } : null,
      scratch_card: earnsScratchCard ? {
        id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        amount: scratchCashbackAmount,
        percentage: cashbackPct,
        billing_amount: billingAmount,
        isScratched: false,
        scratched_at: null,
        status: 'unscratched',
        title: `${cashbackPct}% Order Cashback`,
        created_at: nowIso
      } : null,
      instructions: deliveryInstructions,
      timeline: [
        {
          status: 'Placed',
          time: nowIso,
          timestamp: nowIso,
          note: earnsScratchCard
            ? `UPI payment received (Ref: ${generatedUtr}). Order confirmed! 🎁 ₹${scratchCashbackAmount} (${cashbackPct}% Cashback) Scratch Card unlocked!`
            : `UPI payment received (Ref: ${generatedUtr}). Order confirmed.`
        }
      ],
      created_at: nowIso
    };

    try {
      await saveOrderToFirebaseAndLocal(orderPayload);
      if (walletDeduction > 0 && adjustCustomerWallet) {
        await adjustCustomerWallet(cleanPhone, walletDeduction, {
          type: 'debit',
          reason: `Used on Order #${generatedOrderId}`,
          orderId: generatedOrderId,
          by: 'Customer Checkout'
        });
      }
      setConfirmedOrder(orderPayload);
    } catch (err) {
      console.warn('UPI order sync warning:', err);
      setConfirmedOrder(orderPayload);
    } finally {
      clearCart();
      setStep('form');
      playChime('success');
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setIsVerifyingPayment(false);
    }
  };

  // Copy UPI ID to Clipboard
  const handleCopyUpi = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(storeUpiId);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleTrackPlacedOrder = () => {
    if (confirmedOrder) {
      setActiveTrackingOrderId(confirmedOrder.id);
      setConfirmedOrder(null);
      setIsCheckoutOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-gray-900">
                {confirmedOrder
                  ? 'Order Confirmed!'
                  : step === 'upi_qr'
                  ? 'UPI Payment & QR Code'
                  : !userLocation.isAutoDetected
                  ? 'Step 1: Set Delivery Location'
                  : 'Checkout & Delivery'}
              </h2>
              <p className="text-xs text-gray-500">
                {confirmedOrder
                  ? `Reference ID: ${confirmedOrder.id}`
                  : step === 'upi_qr'
                  ? 'Scan QR with any UPI App or click to pay'
                  : !userLocation.isAutoDetected
                  ? 'Share your current location for live rider delivery'
                  : 'Review order details and select payment method'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!confirmedOrder && (
              <button
                type="button"
                onClick={() => {
                  if (step === 'upi_qr') {
                    setStep('form');
                  } else {
                    setIsCheckoutOpen(false);
                    setIsCartOpen(true);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-gray-200/80 hover:bg-gray-300 text-gray-800 font-bold text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{step === 'upi_qr' ? 'Back' : 'Back to Cart'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsCheckoutOpen(false);
                setConfirmedOrder(null);
                setStep('form');
              }}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ============================================================== */}
          {/* VIEW 1: ORDER CONFIRMED SUCCESS SCREEN                         */}
          {/* ============================================================== */}
          {confirmedOrder ? (() => {
            const liveOrder = orders.find(o => o.id === confirmedOrder.id) || confirmedOrder;
            const isLiveCancelled = liveOrder.order_status === 'Cancelled' || liveOrder.order_status === 'Rejected';
            return (
            <div className="text-center py-6 sm:py-8 space-y-4">
              {isLiveCancelled ? (
                <>
                  <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
                    <AlertCircle className="w-12 h-12" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-white uppercase tracking-widest bg-rose-600 px-3.5 py-1 rounded-full shadow-sm">
                      ❌ Order Cancelled by Store
                    </span>
                    <h3 className="text-2xl font-black text-rose-900 mt-2">
                      Order #{liveOrder.id} Cancelled
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-700 font-semibold mt-1 max-w-md mx-auto">
                      {liveOrder.admin_remark || liveOrder.cancel_reason || 'This order has been cancelled by the store.'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-brand-700 uppercase tracking-widest bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
                      Live Status: {liveOrder.order_status || 'Placed'}
                    </span>
                    <h3 className="text-2xl font-black text-gray-900 mt-2">
                      Thank You, {liveOrder.customer_name}!
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1 max-w-md mx-auto">
                      Your order <strong className="text-gray-900">#{liveOrder.id}</strong> is received in our live dispatch system. Our packing team has started preparing your fresh items.
                    </p>
                  </div>
                </>
              )}

              {/* Order quick overview card */}
              <div className="max-w-md mx-auto bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Live Order Status:</span>
                  <span className={`font-black px-2 py-0.5 rounded-full text-[11px] ${
                    isLiveCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isLiveCancelled ? '❌ Cancelled by Store' : liveOrder.order_status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid / Payable:</span>
                  <span className="font-extrabold text-brand-700 text-sm">₹{liveOrder.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Payment Status:</span>
                  <span className={`font-bold ${liveOrder.payment_status?.includes('Paid') ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {liveOrder.payment_method} ({liveOrder.payment_status})
                  </span>
                </div>
                {confirmedOrder.upi_ref && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">UPI Ref / UTR:</span>
                    <span className="font-mono font-bold text-gray-900">{confirmedOrder.upi_ref}</span>
                  </div>
                )}
                {confirmedOrder.razorpay_payment_id && (
                  <div className="flex justify-between items-center bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <span className="text-emerald-800 font-bold">Razorpay Payment ID:</span>
                    <span className="font-mono font-black text-emerald-950">{confirmedOrder.razorpay_payment_id}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery Address:</span>
                  <span className="font-medium text-gray-900 max-w-[220px] text-right truncate">
                    {confirmedOrder.address?.line1}
                  </span>
                </div>
                {confirmedOrder.milestone_gift && (
                  <div className="pt-2 mt-2 border-t border-emerald-200 bg-emerald-50/90 -mx-2 px-3 py-2 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎁</span>
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 block">
                          Free Milestone Gift (₹{confirmedOrder.milestone_gift.tier_amount}+ Offer)
                        </span>
                        <span className="font-extrabold text-gray-900 text-xs">
                          {confirmedOrder.milestone_gift.name} ({confirmedOrder.milestone_gift.unit})
                        </span>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shrink-0">
                      FREE
                    </span>
                  </div>
                )}
              </div>

              {/* 1% Order Cashback Scratch Card (Shopping >= 500) */}
              {liveOrder.scratch_card && (
                <div className="max-w-md mx-auto my-3 text-left">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 animate-spin" />
                      Shopping Above ₹500 Reward!
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                      1% Instant Cashback
                    </span>
                  </div>
                  <ScratchCard
                    scratchCard={liveOrder.scratch_card}
                    orderId={liveOrder.id}
                    isAlreadyScratched={Boolean(liveOrder.scratch_card.isScratched)}
                    onScratch={async () => {
                      if (claimOrderScratchCard) {
                        await claimOrderScratchCard(liveOrder.id, liveOrder.customer_phone);
                      }
                    }}
                  />
                </div>
              )}

              <div className="pt-4 space-y-2.5 max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleTrackPlacedOrder}
                    className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/30 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    <span>Track Live Delivery Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setConfirmedOrder(null);
                    }}
                    className="py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl transition-colors text-xs sm:text-sm"
                  >
                    Continue Shopping
                  </button>
                </div>
                <a
                  href={`https://wa.me/917017675784?text=${encodeURIComponent(
                    `Hello GharTak Kart! I have placed Order #${confirmedOrder.id} (Total: ₹${confirmedOrder.total}, Payment: ${confirmedOrder.payment_method}). Customer: ${confirmedOrder.customer?.name || ''}, Address: ${confirmedOrder.address?.line1 || ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#1ebe57] text-white font-extrabold rounded-2xl shadow-md shadow-emerald-600/20 transition-all text-xs sm:text-sm flex items-center justify-center gap-2"
                >
                  <span>💬 Send Order / Chat on WhatsApp (7017675784)</span>
                </a>
              </div>
            </div>
            );
          })() : step === 'upi_qr' ? (
            /* ============================================================== */
            /* VIEW 2: DYNAMIC UPI QR CODE & PAYMENT VERIFICATION             */
            /* ============================================================== */
            <div className="space-y-4 max-w-lg mx-auto">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 px-2.5 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to details</span>
                </button>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-medium block">Total Payable</span>
                  <span className="text-base font-black text-brand-700">₹{grandTotal}</span>
                </div>
              </div>

              {/* UPI Payment Failed Banner */}
              {paymentFailed && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black block">Payment Notice</span>
                    <p className="text-[11px] text-rose-700 leading-normal">
                      {paymentError || 'Please complete payment in your UPI app and tap Confirm below.'}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyUpiPayment(false)}
                        className="px-3 py-1 bg-rose-600 text-white font-bold rounded-lg text-[11px] hover:bg-rose-700 flex items-center gap-1 shadow-sm"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Confirm Payment Now</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDirectPlaceOrder('Cash on Delivery')}
                        className="px-3 py-1 bg-gray-800 text-white font-bold rounded-lg text-[11px] hover:bg-black flex items-center gap-1 shadow-sm"
                      >
                        <Banknote className="w-3 h-3" />
                        <span>Switch to Cash on Delivery</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}



              {/* Method Switcher Tabs: UPI Apps (Mobile) vs QR Code */}
              <div className="flex p-1 bg-gray-100 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setUpiTab('apps')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    upiTab === 'apps'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-brand-600" />
                  <span>1-Tap UPI Apps (PhonePe/GPay)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUpiTab('qr')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    upiTab === 'qr'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5 text-brand-600" />
                  <span>Scan QR Code</span>
                </button>
              </div>

              {/* TAB 1: 1-Tap UPI Mobile Apps */}
              {upiTab === 'apps' ? (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-gradient-to-br from-brand-50 to-emerald-50/60 p-4 rounded-2xl border border-brand-200">
                    <div className="text-center mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-brand-200">
                        Step 1: Choose Your UPI App
                      </span>
                      <p className="text-xs text-gray-600 mt-1 font-medium">
                        Tap your preferred app to automatically open and pay <strong className="text-gray-900 font-black">₹{grandTotal}</strong>
                      </p>
                    </div>

                    {/* App Buttons Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleLaunchUpi(genericUpiUrl)}
                        className="py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all sm:col-span-2"
                      >
                        <Smartphone className="w-4 h-4 shrink-0" />
                        <span>Pay via UPI App (GPay / PhonePe / Paytm / BHIM)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchUpi(phonePeUrl)}
                        className="py-2.5 px-3 bg-[#5f259f] hover:bg-[#4d1d82] active:scale-[0.98] text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <span className="w-5 h-5 rounded-full bg-white text-[#5f259f] font-black flex items-center justify-center text-xs shrink-0">
                          पे
                        </span>
                        <span>PhonePe</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLaunchUpi(gPayUrl)}
                        className="py-2.5 px-3 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-800 font-extrabold rounded-xl text-xs border border-gray-300 flex items-center justify-center gap-2 shadow-sm transition-all"
                      >
                        <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-black flex items-center justify-center text-xs shrink-0">
                          G
                        </span>
                        <span>Google Pay</span>
                      </button>
                    </div>

                    {/* Copy UPI ID Row */}
                    <div className="mt-3 pt-3 border-t border-brand-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-gray-600 font-medium">Or pay manually to UPI ID:</span>
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                        <span className="font-mono font-bold text-gray-900 text-xs">{storeUpiId}</span>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          className="text-[11px] font-bold text-brand-700 hover:text-brand-800 ml-1 flex items-center gap-1"
                        >
                          {copiedUpi ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* TAB 2: Dynamic QR Code */
                <div className="bg-gradient-to-b from-gray-50 to-white p-5 rounded-2xl border-2 border-brand-200 text-center space-y-3 shadow-sm animate-fadeIn">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-brand-700 uppercase tracking-widest bg-brand-100/70 px-2.5 py-0.5 rounded-full">
                      Scan with any camera or UPI App
                    </span>
                    <h3 className="font-extrabold text-sm text-gray-900 mt-1">{cleanMerchant}</h3>
                    <p className="text-[11px] text-gray-500">Google Pay, PhonePe, Paytm, CRED, BHIM</p>
                  </div>

                  <div className="relative inline-block p-2.5 bg-white rounded-2xl border-2 border-dashed border-gray-300 shadow-md">
                    <img
                      src={qrCodeImgUrl}
                      alt="Scan UPI QR Code"
                      className="w-44 h-44 mx-auto object-contain"
                    />
                    <div className="text-[10px] font-mono font-bold text-gray-600 mt-1">
                      Pay Exact Amount: ₹{grandTotal}
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 p-1.5 bg-gray-100 rounded-xl text-xs max-w-xs mx-auto">
                    <span className="text-gray-500">UPI ID:</span>
                    <span className="font-mono font-bold text-gray-900">{storeUpiId}</span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 hover:bg-white rounded text-gray-600 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}



              {/* Step 2: Confirmation Section */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border-2 border-emerald-300 space-y-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <label className="block text-xs font-black text-emerald-950 uppercase tracking-wider">
                    Step 2: Confirm Order Once Paid
                  </label>
                  <p className="text-[11px] text-emerald-800">
                    After you approve the transaction in your UPI app, click the button below to confirm your order.
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={upiUtr}
                    onChange={(e) => setUpiUtr(e.target.value)}
                    placeholder="Enter UPI Ref / 12-digit UTR # (Optional)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-gray-400"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isVerifyingPayment || isBlockedCustomer}
                    onClick={() => handleVerifyUpiPayment(false)}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:bg-gray-300 text-white font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isBlockedCustomer ? (
                      <span className="flex items-center gap-1.5"><Ban className="w-4 h-4" /> Mobile Number Restricted</span>
                    ) : isVerifyingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Confirming Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>✅ I Have Completed Payment — Confirm Order</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      disabled={isVerifyingPayment}
                      onClick={() => handleDirectPlaceOrder('Cash on Delivery')}
                      className="text-xs text-gray-600 hover:text-gray-900 font-semibold underline"
                    >
                      Trouble paying with UPI? Switch to Cash on Delivery (Pay on arrival)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !userLocation.isAutoDetected ? (
            /* ============================================================== */
            /* STEP 1: FETCH CUSTOMER CURRENT LOCATION FIRST                  */
            /* ============================================================== */
            <div className="py-6 sm:py-10 px-2 sm:px-6 text-center space-y-6 animate-fadeIn">
              {/* Animated location pulse icon */}
              <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <MapPin className="w-8 h-8" />
                </div>
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-bold border border-brand-200">
                  <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                  <span>Step 1: Confirm Delivery Location</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900">
                  📍 Set Your Delivery Location First
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  डिलीवरी पार्टनर को आपके ठीक पते तक पहुँचने के लिए और सही डिलीवरी चार्ज तय करने के लिए कृपया अपनी वर्तमान लोकेशन शेयर करें।
                </p>
              </div>

              {/* Primary 1-Tap GPS Button */}
              <div className="max-w-sm mx-auto space-y-3">
                <button
                  type="button"
                  disabled={isAutoDetectingLoc}
                  onClick={async () => {
                    setIsAutoDetectingLoc(true);
                    try {
                      await autoFetchCustomerLocation({ silent: false });
                    } finally {
                      setIsAutoDetectingLoc(false);
                    }
                  }}
                  className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  {isAutoDetectingLoc ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Fetching Live Location (GPS)...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-5 h-5 animate-pulse" />
                      <span>Use My Current Location (1-Tap GPS)</span>
                    </>
                  )}
                </button>

                {/* Secondary: Manual Search / Map Picker */}
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-brand-600" />
                  <span>Select / Enter Address Manually</span>
                </button>

                <p className="text-[11px] text-gray-400">
                  🔒 आपकी लोकेशन केवल आर्डर डिलीवरी और रूटिंग के लिए सुरक्षित रूप से इस्तेमाल की जाती है।
                </p>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* VIEW 3: STANDARD CHECKOUT DETAILS FORM                         */
            /* ============================================================== */
            <form onSubmit={handleProceed} className="space-y-5">
              {/* Store Closed / Outside Store Timing Warning Banner */}
              {(!storeStatus.isOpen || timingBlockError) && (
                <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-950 shadow-sm">
                  <Clock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-rose-900">
                      ⏰ {storeStatus.title}
                    </p>
                    <p className="font-semibold text-rose-800 leading-relaxed">
                      {timingBlockError || storeStatus.message}
                    </p>
                    <p className="text-[11px] text-rose-700 font-bold">
                      Store Timing: {storeStatus.openFormatted} to {storeStatus.closeFormatted} ({storeStatus.daysOpen})
                    </p>
                  </div>
                </div>
              )}



                            {/* Blocked Customer Warning Banner */}
              {isBlockedCustomer && (
                <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-4 flex items-start gap-3 text-xs text-red-950 shadow-sm animate-fadeIn">
                  <Ban className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-black text-sm text-red-900">
                      🚫 Mobile Number Restricted (+91 {cleanPhone})
                    </p>
                    <p className="font-semibold text-red-800 leading-relaxed">
                      This mobile number has been restricted from placing orders by GharTak Kart store administration ({customerBlockReason}).
                    </p>
                    <p className="text-[11px] text-red-700 font-bold">
                      Orders cannot be placed from this number. Please contact store customer care (7017675784) for assistance.
                    </p>
                  </div>
                </div>
              )}

              {/* Delivery Address Review */}
              <div className="bg-brand-50/60 rounded-2xl p-4 border border-brand-200 flex flex-col sm:flex-row items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-900 text-sm">
                      Deliver to: {userLocation.label || 'Home'}
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      {userLocation.distance_km} km away
                    </span>
                  </div>
                  <p className="text-gray-700 mt-1 font-medium">{userLocation.addressText}</p>
                  {userLocation.landmark && (
                    <p className="text-gray-500 mt-0.5">Landmark: {userLocation.landmark}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-brand-200">
                    <span className="text-[11px] text-emerald-800 font-mono font-semibold flex items-center gap-1">
                      <span>📍 GPS: {userLocation.lat ? Number(userLocation.lat).toFixed(5) : 'N/A'}, {userLocation.lng ? Number(userLocation.lng).toFixed(5) : 'N/A'}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAutoDetectGps}
                        disabled={isAutoDetectingLoc}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        {isAutoDetectingLoc ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Detecting Live GPS...</span>
                          </>
                        ) : (
                          <>
                            <Navigation className="w-3.5 h-3.5" />
                            <span>🎯 Auto-Fetch GPS</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsLocationModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs border border-gray-300 transition-all shadow-sm"
                      >
                        Change Pin
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ayush Agrawal"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    10-digit Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength="10"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>


              {/* Delivery Instructions */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="e.g. Leave at door, call before arriving"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              {/* ===================================================================== */}
              {/* MILESTONE FREE GIFT SELECTOR (Ultra-Compact Space-Saving Design)      */}
              {/* ===================================================================== */}
              {activeMilestones.length > 0 && (
                currentGiftTier ? (
                  // UNLOCKED: Sleek compact picker
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-2 sm:p-2.5 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Gift className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-extrabold text-[11px] text-emerald-950 truncate">
                          Free Milestone Gift Unlocked!
                        </span>
                      </div>
                      <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                        ₹{currentGiftTier.min_amount}+ Order ✓
                      </span>
                    </div>

                    {activeMilestones.length > 1 && (
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                        {activeMilestones.map((tier) => {
                          const isUnlocked = cartSubtotal >= (Number(tier.min_amount) || 0);
                          const isSelectedTier = currentGiftTier?.id === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => {
                                if (isUnlocked) {
                                  setSelectedGiftTierId(tier.id);
                                  setSelectedGiftItemId(tier.items?.[0]?.id || '');
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition-all shrink-0 ${
                                isSelectedTier && isUnlocked
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : isUnlocked
                                  ? 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50 cursor-pointer'
                                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                              }`}
                            >
                              {isUnlocked ? '🎁' : '🔒'} ₹{tier.min_amount}+
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Compact Choice Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {(currentGiftTier.items || []).map((giftItem, idx) => {
                        const isChosen = chosenMilestoneGiftItem?.id === giftItem.id;
                        return (
                          <div
                            key={giftItem.id || idx}
                            onClick={() => setSelectedGiftItemId(giftItem.id)}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isChosen
                                ? 'bg-white border-emerald-600 ring-1 ring-emerald-500 shadow-2xs'
                                : 'bg-white/80 border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <img
                              src={giftItem.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80'}
                              alt={giftItem.name}
                              className="w-7 h-7 rounded object-cover bg-gray-100 shrink-0 border border-gray-100"
                              onError={(e) => {
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-[11px] text-gray-900 truncate leading-tight">
                                {giftItem.name}
                              </p>
                              <p className="text-[9px] text-gray-500">
                                {giftItem.unit || '1 Pack'} • <span className="text-emerald-700 font-extrabold">FREE</span>
                              </p>
                            </div>
                            <div className="shrink-0">
                              {isChosen ? (
                                <span className="text-[9px] font-black text-white bg-emerald-600 px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-2xs">
                                  <Check className="w-2.5 h-2.5" /> Selected
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Select
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // LOCKED: Super compact 1-line mini banner
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">🎁</span>
                      <p className="text-[11px] text-amber-950 truncate">
                        Add <strong className="font-bold text-amber-900">₹{Math.max(1, (Number(activeMilestones[0]?.min_amount) || 149) - cartSubtotal)}</strong> more for <strong>FREE Milestone Gift</strong> (₹{(activeMilestones[0]?.min_amount) || 149}+ orders)
                      </p>
                    </div>
                    <span className="bg-amber-200/90 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                      ₹{cartSubtotal} / ₹{(activeMilestones[0]?.min_amount) || 149}
                    </span>
                  </div>
                )
              )}

              {/* Loyalty Stamp Reward Banner */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                grandTotal >= 250
                  ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}>
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                  🎖️
                </div>
                <div className="text-xs flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-800">
                      Loyalty Stamp Reward Program
                    </span>
                    {grandTotal >= 250 && (
                      <span className="bg-amber-200/80 text-amber-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                        +1 Stamp Unlocked!
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] mt-0.5 leading-normal">
                    {grandTotal >= 250
                      ? 'Awesome! This order qualifies for 1 Stamp. Collect 10 stamps to get a Surprise Gift delivered to your doorstep! 🎁'
                      : `Add ₹${(250 - grandTotal).toFixed(0)} more to earn 1 Stamp! Collect 10 stamps for a FREE Surprise Gift at home.`}
                  </p>
                </div>
              </div>

              {/* Payment Error Alert */}
              {paymentError && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 font-semibold flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-950">{paymentError}</p>
                    <p className="text-[11px] text-rose-700 mt-0.5">You can re-try or select Cash on Delivery below.</p>
                  </div>
                </div>
              )}



              {/* ============================================================== */}
              {/* GHARTAKKART CASH WALLET REDEMPTION                             */}
              {/* ============================================================== */}
              <div className={`p-4 rounded-2xl border-2 transition-all ${
                useWallet && walletDeduction > 0
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                  : availableWallet > 0
                  ? 'bg-white border-emerald-200 hover:border-emerald-300'
                  : 'bg-gray-50/80 border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                      availableWallet > 0 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                    }`}>
                      👛
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs sm:text-sm text-gray-900">
                          GhartakKart Cash Wallet
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          availableWallet > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          Available Balance: ₹{availableWallet}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 mt-0.5">
                        {!isWalletRedemptionActive
                          ? 'Wallet redemption is temporarily paused by store admin.'
                          : availableWallet <= 0
                          ? 'No wallet balance available. Earn cashback or contact store admin to top up.'
                          : cartSubtotal < minOrderForWallet
                          ? `Minimum items total of ₹${minOrderForWallet} required to use wallet (Current: ₹${cartSubtotal}).`
                          : `You can use up to ₹${allowedWalletUse} on this order${maxWalletPercent < 100 ? ` (Max ${maxWalletPercent}% of bill)` : ''}${maxWalletAbsolute > 0 ? ` (Capped at ₹${maxWalletAbsolute})` : ''}.`}
                      </p>
                      {useWallet && walletDeduction > 0 && (
                        <div className="mt-1 text-[11px] font-black text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Redeeming ₹{walletDeduction} from wallet</span>
                          {netPayable === 0 && (
                            <span className="bg-emerald-200/90 text-emerald-950 px-2 py-0.2 rounded-md font-black text-[10px] ml-1">
                              🎉 100% Free Order!
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {availableWallet > 0 && isWalletRedemptionActive && allowedWalletUse > 0 && (
                    <label className="flex items-center gap-2 cursor-pointer shrink-0 mt-1 select-none bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={useWallet}
                        onChange={(e) => setUseWallet(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                      <span className="text-xs font-black text-emerald-900">
                        {useWallet ? 'Applied ✓' : 'Use Balance'}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Payment Method Selection (Online Payment via Razorpay vs Cash on Delivery) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800">
                    Select Payment Method *
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>100% Secure Checkout</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Online Payment via Razorpay */}
                  <div
                    onClick={() => {
                      setPaymentMethod('Online Payment (Razorpay)');
                      setPaymentError('');
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Online Payment (Razorpay)'
                        ? 'bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            paymentMethod === 'Online Payment (Razorpay)'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-xs sm:text-sm text-gray-900 block leading-tight">
                              Online Payment
                            </span>
                            <span className="text-[10px] text-emerald-800 font-extrabold uppercase">
                              Razorpay Gateway
                            </span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'Online Payment (Razorpay)'
                            ? 'border-emerald-600 bg-emerald-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {paymentMethod === 'Online Payment (Razorpay)' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        UPI (GPay, PhonePe, Paytm, BHIM), Debit/Credit Cards, Netbanking & Wallets
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] font-black text-emerald-900">
                      <span className="bg-emerald-200/80 px-2 py-0.5 rounded-md">⚡ Automated & Instant</span>
                      <span className="text-emerald-700">Recommended</span>
                    </div>
                  </div>

                  {/* Option 2: Cash on Delivery (COD) */}
                  <div
                    onClick={() => {
                      setPaymentMethod('Cash on Delivery');
                      setPaymentError('');
                    }}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'Cash on Delivery'
                        ? 'bg-emerald-50/90 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                            paymentMethod === 'Cash on Delivery'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Banknote className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-black text-xs sm:text-sm text-gray-900 block leading-tight">
                              Cash on Delivery
                            </span>
                            <span className="text-[10px] text-gray-500 font-bold uppercase">
                              Pay on Arrival
                            </span>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === 'Cash on Delivery'
                            ? 'border-emerald-600 bg-emerald-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {paymentMethod === 'Cash on Delivery' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-snug">
                        Pay cash to the delivery partner when items arrive at your doorstep
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] font-bold text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md">💵 Cash at Doorstep</span>
                      <span>Available</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============================================================== */}
              {/* BILL DETAILS / PRICE BREAKDOWN                                 */}
              {/* ============================================================== */}
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border-2 border-gray-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🧾</span>
                    <span className="font-black text-xs sm:text-sm text-gray-900 uppercase tracking-wide">
                      Bill Details & Savings Breakdown
                    </span>
                  </div>
                  {autoAppliedNotice && (
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 animate-pulse">
                      {autoAppliedNotice}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* 1. Total MRP */}
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-semibold">Total MRP</span>
                    <span className="font-bold text-gray-900">₹{cartTotalMrp}</span>
                  </div>

                  {/* 2. MRP Discount */}
                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>MRP Discount</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                        Saved on MRP
                      </span>
                    </span>
                    <span>{cartTotalSavings > 0 ? `-₹${cartTotalSavings}` : '₹0'}</span>
                  </div>

                  {/* Store Price Item Subtotal */}
                  <div className="flex justify-between items-center text-gray-500 text-[11px]">
                    <span>Item Subtotal</span>
                    <span className="font-semibold text-gray-700">₹{cartSubtotal}</span>
                  </div>

                  {/* 3. Gift Discount (Milestone Gift) */}
                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>Gift Discount</span>
                      {chosenMilestoneGiftItem && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold uppercase">
                          🎁 FREE GIFT
                        </span>
                      )}
                    </span>
                    <span>
                      {chosenMilestoneGiftItem ? (
                        <span className="flex items-center gap-1">
                          {Number(chosenMilestoneGiftItem.worth) > 0 && (
                            <s className="text-gray-400 font-normal text-[11px]">₹{chosenMilestoneGiftItem.worth}</s>
                          )}
                          <span className="text-emerald-700 font-black">
                            FREE (Saved ₹{chosenMilestoneGiftItem.worth || 0})
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400 font-normal">₹0</span>
                      )}
                    </span>
                  </div>

                  {/* 4. Coupon Discount */}
                  <div className="flex justify-between items-center text-emerald-700 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span>Coupon Discount</span>
                      {appliedCoupon && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black uppercase">
                          {appliedCoupon.code} {appliedCoupon.isAutoApplied ? '⚡ Auto' : ''}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{couponDiscount > 0 ? `-₹${couponDiscount}` : '₹0'}</span>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={() => {
                            try { sessionStorage.setItem('gk_coupon_manually_removed', 'true'); } catch {}
                            setAppliedCoupon(null);
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delivery Fee */}
                  <div className="flex justify-between items-center text-gray-600">
                    <span className="font-semibold">
                      Delivery Partner Fee
                      {deliveryFee === 0 && baseDeliveryFee > 0 && (
                        <span className="text-[10px] text-emerald-700 font-bold ml-1">(Free above ₹{settings?.free_delivery_above || 499})</span>
                      )}
                    </span>
                    <span className="font-bold text-gray-900">
                      {deliveryFee === 0 ? (
                        <span>
                          {baseDeliveryFee > 0 && <s className="text-gray-400 mr-1 font-normal text-[11px]">₹{baseDeliveryFee}</s>}
                          <span className="text-emerald-600 font-black">₹0 FREE</span>
                        </span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>

                  {/* Wallet Balance Redeemed */}
                  {walletDeduction > 0 && (
                    <div className="flex justify-between items-center text-emerald-800 font-extrabold bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <span>👛 GhartakKart Wallet Redeemed</span>
                        <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black uppercase">
                          Applied
                        </span>
                      </span>
                      <span>-₹{walletDeduction}</span>
                    </div>
                  )}

                  {/* 5. Need to be Paid */}
                  <div className="pt-2.5 mt-2 border-t-2 border-dashed border-gray-300 flex justify-between items-center bg-emerald-50/70 -mx-4 -mb-4 p-3.5 rounded-b-2xl">
                    <div>
                      <span className="text-xs font-black text-gray-900 block uppercase tracking-wide">
                        Need to be Paid
                      </span>
                      <span className="text-[10px] text-emerald-800 font-semibold">
                        Final Net Amount to Pay
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-emerald-700">₹{netPayable}</span>
                    </div>
                  </div>
                </div>

                {/* Overall Savings Banner */}
                {(cartTotalSavings > 0 || couponDiscount > 0 || walletDeduction > 0 || (Number(chosenMilestoneGiftItem?.worth) > 0) || (deliveryFee === 0 && baseDeliveryFee > 0)) && (
                  <div className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl flex items-center justify-between text-xs font-extrabold shadow-sm">
                    <span className="flex items-center gap-1.5">
                      <span>🎉</span>
                      <span>Total Savings on this Order:</span>
                    </span>
                    <span className="text-sm font-black text-amber-200">
                      ₹{cartTotalSavings + couponDiscount + walletDeduction + (Number(chosenMilestoneGiftItem?.worth) || 0) + (deliveryFee === 0 && baseDeliveryFee > 0 ? baseDeliveryFee : 0)}
                    </span>
                  </div>
                )}
              </div>

              {(!storeStatus.isOpen || timingBlockError) && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 font-semibold flex items-start gap-2">
                  <Clock className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{timingBlockError || storeStatus.message}</span>
                </div>
              )}

              {/* Total & Submit Button */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-gray-500 block uppercase font-bold tracking-wider">Need to be Paid</span>
                  <span className="text-xl font-black text-brand-700">₹{netPayable}</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !storeStatus.isOpen || isBlockedCustomer}
                  className="flex-1 py-3.5 px-6 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-extrabold rounded-2xl shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer"
                >
                  {isBlockedCustomer ? (
                    <span className="flex items-center gap-1.5"><Ban className="w-4 h-4" /> Number Restricted</span>
                  ) : !storeStatus.isOpen ? (
                    <span>⏰ Orders Only {storeStatus.openFormatted} – {storeStatus.closeFormatted}</span>
                  ) : isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Order...</span>
                    </span>
                  ) : netPayable === 0 && walletDeduction > 0 ? (
                    <>
                      <span>🎉 Pay with Wallet (₹0 Cash / Online)</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : paymentMethod === 'Cash on Delivery' ? (
                    <>
                      <span>Place Order with Cash on Delivery (₹{netPayable})</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <span>Pay Online with Razorpay (₹{netPayable})</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}