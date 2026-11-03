import React, { useState, useEffect, useRef } from 'react';
import { useStore, syncToFirebase, FIREBASE_DB_URL, DEFAULT_MILESTONE_GIFTS, DEFAULT_OFFERS } from '../context/StoreContext.jsx';
import { playChime } from '../utils/sound.js';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  testOrderNotification
} from '../utils/notifications.js';
import {
  TrendingUp,
  Package,
  Layers,
  MapPin,
  Users,
  Download,
  Plus,
  Trash2,
  Edit,
  Printer,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  Ban,
  UserX,
  Clock,
  Sparkles,
  Bike,
  Save,
  Search,
  ExternalLink,
  Navigation,
  LogOut,
  Store,
  Building2,
  Upload,
  Image as ImageIcon,
  Share2,
  Copy,
  Check,
  MessageSquare,
  BarChart3,
  FileSpreadsheet,
  DollarSign,
  Award,
  Gift,
  Star,
  Phone,
  Flame,
  Tag,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Key,
  KeyRound,
  UserCheck,
  FileText,
  Lock,
  Bell,
  BellRing,
  Smartphone,
  Sun,
  Moon,
  Receipt,
  Wallet,
  CreditCard,
  TrendingDown,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Coins,
  Percent,
  Briefcase,
  X,
  Menu,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard
} from 'lucide-react';
import InvoiceModal from './InvoiceModal.jsx';
import CreateManualOrderModal from './CreateManualOrderModal.jsx';
import { DeliveryPartnerAdminModal } from './DeliveryPartnerAdminModal.jsx';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const {
    settings,
    setSettings,
    categories,
    setCategories,
    products,
    setProducts,
    orders,
    setOrders,
    staff,
    setStaff,
    adminSoundEnabled,
    setAdminSoundEnabled,
    adminAuth,
    logoutAdmin,
    setAdminMode,
    customerUser,
    offers,
    setOffers,
    milestoneGifts,
    setMilestoneGifts,
    staffUsers,
    setStaffUsers,
    auditLogs,
    setAuditLogs,
    addAuditLog,

    // Vendor and Accounting Context
    vendors,
    setVendors,
    vendorLedger,
    setVendorLedger,
    addVendor,
    updateVendor,
    deleteVendor,
    addVendorLedgerEntry,
    deleteVendorLedgerEntry,
    resetAllVendorLedgers,
    settleVendorBalance,
    expenses,
    setExpenses,
    otherIncomes,
    setOtherIncomes,
    addExpense,
    updateExpense,
    deleteExpense,
    addOtherIncome,
    updateOtherIncome,
    deleteOtherIncome,

    // Customer Wallets
    wallets,
    setWallets,
    adjustCustomerWallet,
    revokeOrderCashback,

    // Blocked Customers Protection
    blockedCustomers,
    blockCustomer,
    unblockCustomer,
    isCustomerBlocked
  } = useStore();

  const currentRole = adminAuth?.user?.role || adminAuth?.role || 'super_admin';
  const isStaff = currentRole === 'staff';
  const isSuperAdmin = !isStaff;
  const activeStaffName = adminAuth?.user?.name || adminAuth?.user?.username || adminAuth?.username || 'Staff User';
  const activeStaffUserId = adminAuth?.user?.username || adminAuth?.username || 'staff';

  const [activeTab, setActiveTab] = useState('orders');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Enforce staff restriction: staff can ONLY access order processing
  React.useEffect(() => {
    if (isStaff && activeTab !== 'orders') {
      setActiveTab('orders');
    }
  }, [isStaff, activeTab]);

  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [isManualOrderModalOpen, setIsManualOrderModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [copiedDispatchId, setCopiedDispatchId] = useState(null);
  const [selectedRiderForAdmin, setSelectedRiderForAdmin] = useState(null);

  // Edit Order Vendor Modal State
  const [isEditOrderVendorModalOpen, setIsEditOrderVendorModalOpen] = useState(false);
  const [editingOrderForVendor, setEditingOrderForVendor] = useState(null);
  const [orderVendorId, setOrderVendorId] = useState('');
  const [orderVendorName, setOrderVendorName] = useState('');
  const [orderVendorNotes, setOrderVendorNotes] = useState('');
  const [orderSyncToLedger, setOrderSyncToLedger] = useState(false);
  const [orderWholesaleCost, setOrderWholesaleCost] = useState(0);
  const [orderItemsVendorMap, setOrderItemsVendorMap] = useState({});

  // Item Vendor Modal State (Assign / change vendor for each specific item)
  const [isItemVendorModalOpen, setIsItemVendorModalOpen] = useState(false);
  const [editingItemVendorOrder, setEditingItemVendorOrder] = useState(null);
  const [editingItemVendorIndex, setEditingItemVendorIndex] = useState(null);
  const [editingItemVendorItem, setEditingItemVendorItem] = useState(null);
  const [itemVendorId, setItemVendorId] = useState('');
  const [itemVendorName, setItemVendorName] = useState('');
  const [itemWholesaleCost, setItemWholesaleCost] = useState(0);
  const [itemVendorSyncToLedger, setItemVendorSyncToLedger] = useState(false);
  const [itemVendorApplyToAll, setItemVendorApplyToAll] = useState(false);
  const [itemVendorNotes, setItemVendorNotes] = useState('');

  // Full Edit Order Modal State (Edit order customer details, items, address & status)
  const [isFullEditOrderModalOpen, setIsFullEditOrderModalOpen] = useState(false);
  const [editingFullOrder, setEditingFullOrder] = useState(null);
  const [editOrderItems, setEditOrderItems] = useState([]);
  const [editOrderCatalogSearch, setEditOrderCatalogSearch] = useState('');
  const [editOrderCustomItemName, setEditOrderCustomItemName] = useState('');
  const [editOrderCustomItemQty, setEditOrderCustomItemQty] = useState(1);
  const [editOrderCustomItemPrice, setEditOrderCustomItemPrice] = useState('');
  const [editOrderCustomItemUnit, setEditOrderCustomItemUnit] = useState('1 unit');
  const [editOrderCustomItemVendor, setEditOrderCustomItemVendor] = useState('');

  // Staff User Management State (Super Admin Only)
  const [isStaffUserModalOpen, setIsStaffUserModalOpen] = useState(false);
  const [editingStaffUser, setEditingStaffUser] = useState(null);
  const [staffUserName, setStaffUserName] = useState('');
  const [staffUserUserId, setStaffUserUserId] = useState('');
  const [staffUserPassword, setStaffUserPassword] = useState('');
  const [staffUserPhone, setStaffUserPhone] = useState('');
  const [staffUserStatus, setStaffUserStatus] = useState('active');
  const [showStaffPasswords, setShowStaffPasswords] = useState({});

  // Store Shifts & Rider Credentials State (Admin Only)
  const DEFAULT_STORE_SHIFTS = [
    { id: 'shift-1', name: 'Morning Shift', time: '07:00 AM - 12:00 PM', zone: 'Khair Central Market & Somna Rd', surge: '1.2x' },
    { id: 'shift-2', name: 'Afternoon Shift', time: '12:00 PM - 05:00 PM', zone: 'Tehsil Road & Somna Bypass', surge: '1.0x' },
    { id: 'shift-3', name: 'Evening Peak Shift', time: '05:00 PM - 10:30 PM', zone: 'Chhota Chauraha, Hub & All Khair', surge: '1.5x 🔥' },
    { id: 'shift-4', name: 'Night Express Shift', time: '10:30 PM - 02:00 AM', zone: 'All Khair Hyperlocal Zone', surge: '1.4x ⚡' }
  ];
  const [storeShifts, setStoreShifts] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_store_shifts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_STORE_SHIFTS;
  });
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftTime, setNewShiftTime] = useState('08:00 AM - 02:00 PM');
  const [newShiftZone, setNewShiftZone] = useState('Khair Operational Zone');
  const [newShiftSurge, setNewShiftSurge] = useState('1.2x');

  // Quick Rider Credentials & Shift Edit
  const [editingRiderCredentials, setEditingRiderCredentials] = useState(null);
  const [editRiderId, setEditRiderId] = useState('');
  const [editRiderPassword, setEditRiderPassword] = useState('');
  const [editRiderShift, setEditRiderShift] = useState('');
  const [showRiderPasswords, setShowRiderPasswords] = useState({});

  // Audit Logs Filter State (Super Admin Only)
  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditUserFilter, setAuditUserFilter] = useState('all');

  // Mobile Push Notification & Screen Wake Lock State
  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);
  const wakeLockSentinelRef = useRef(null);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      alert('✅ Mobile Order Notifications & Custom Ringtone Enabled!\n\nYou will now receive instant push alerts and the new order tone whenever an order is placed.');
    } else if (res === 'denied') {
      alert('⚠️ Notifications are blocked in your browser.\n\nTo allow notifications:\n1. Tap the lock/tune icon in your browser address bar.\n2. Tap "Site settings" or "Permissions".\n3. Set "Notifications" to "Allow".');
    }
  };

  const handleTestNotification = async () => {
    await testOrderNotification();
  };

  const handleToggleWakeLock = async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      alert('Screen Wake Lock is not supported on this browser.');
      return;
    }
    if (isWakeLockActive) {
      try {
        await wakeLockSentinelRef.current?.release();
        wakeLockSentinelRef.current = null;
        setIsWakeLockActive(false);
      } catch {}
    } else {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinelRef.current = sentinel;
        setIsWakeLockActive(true);
        sentinel.addEventListener('release', () => {
          setIsWakeLockActive(false);
        });
      } catch (e) {
        alert('Could not keep screen awake: ' + e.message);
      }
    }
  };

  // Open & Audit Print Invoice
  const handleOpenPrintInvoice = (order) => {
    setSelectedOrderForInvoice(order);
    if (addAuditLog) {
      addAuditLog({
        action: 'Print Receipt / Invoice',
        details: `${isStaff ? `Staff ${activeStaffName} (${activeStaffUserId})` : 'Super Admin'} opened receipt for Order #${order.id} (Value: ₹${order.total || 0})`,
        orderId: order.id
      });
    }
  };

  // Quick 1-Click WhatsApp Order Bill Dispatch to Customer Phone
  const handleShareWhatsAppReceipt = (order) => {
    const phone = (order?.customer_phone || '').replace(/\D/g, '').slice(-10);
    if (!phone) {
      alert('No customer mobile number on this order.');
      return;
    }
    const storeName = settings?.store_name || 'GharTak Kart';
    const storePhone = settings?.store_phone || '';
    const itemsText = (order.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (${it.unit || ''}) x${it.qty} = ₹${(Number(it.price) || 0) * (Number(it.qty) || 1)}`)
      .join('\n');
    const giftText = order.milestone_gift ? `\n🎁 *Free Gift:* ${order.milestone_gift.name} (${order.milestone_gift.unit || '1 Pack'})` : '';

    const msg =
`🛍️ *${storeName.toUpperCase()} ORDER BILL*
━━━━━━━━━━━━━━━━━━━━━━
📦 *Order ID:* #${order.id}
👤 *Customer:* ${order.customer_name || 'Customer'}
📞 *Contact:* +91 ${phone}
📍 *Delivery Address:* ${order.address?.line1 || 'Khair'}${order.address?.landmark ? ' (Near ' + order.address.landmark + ')' : ''}
⏰ *Delivery Slot:* ${order.delivery_slot || 'Express (15-25 Mins)'}
━━━━━━━━━━━━━━━━━━━━━━
🛒 *ORDER ITEMS:*
${itemsText}${giftText}
━━━━━━━━━━━━━━━━━━━━━━
💵 *Subtotal:* ₹${order.subtotal || 0}
🚚 *Delivery Charges:* ₹${order.delivery_fee || 0}
🏷️ *Discount:* -₹${order.discount || 0}${order.wallet_used > 0 ? `\n👛 *Wallet Paid:* -₹${order.wallet_used}` : ''}
💰 *TOTAL AMOUNT:* ₹${order.total || 0}
💳 *Payment Mode:* ${order.payment_method || 'Cash on Delivery'} (${order.payment_status || 'Pending'})
━━━━━━━━━━━━━━━━━━━━━━
🚀 Track your order live at:
https://vertexpsbyri.web.app

${storePhone ? '📞 Support Call/WhatsApp: ' + storePhone : ''}
Thank you for shopping with ${storeName}! 🙏`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Copy full delivery details & Google Maps links for rider dispatch
  const handleCopyDispatch = (order) => {
    const lat = Number(order.address?.lat) || Number(settings?.store_lat) || 27.941887;
    const lng = Number(order.address?.lng) || Number(settings?.store_lng) || 77.843715;
    const sLat = Number(settings?.store_lat) || Number(storeLat) || 27.941887;
    const sLng = Number(settings?.store_lng) || Number(storeLng) || 77.843715;
    const mapsPinUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${lat},${lng}&travelmode=driving`;
    const itemsText = (order.items || []).map(it => `${it.qty}x ${it.name}`).join(', ');
    const freeGiftLine = order.milestone_gift ? `\n🎁 FREE Milestone Gift (₹${order.milestone_gift.tier_amount}+): 1x ${order.milestone_gift.name} (${order.milestone_gift.unit || '1 Pack'})` : '';
    const text = `🚀 GHARTAKKART DELIVERY DISPATCH
📦 Order ID: #${order.id}
👤 Customer: ${order.customer_name} (${order.customer_phone})
🏠 Address: ${order.address?.line1 || ''}${order.address?.landmark ? ' (Landmark: ' + order.address.landmark + ')' : ''}
📍 Distance: ${order.distance_km || 0} km from store
💰 Total Amount: ₹${order.total} (${order.payment_method} - ${order.payment_status})
🛍️ Items: ${itemsText}${freeGiftLine}
📍 Customer Google Maps Pin: ${mapsPinUrl}
🧭 Store-to-Customer Navigation: ${directionsUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedDispatchId(order.id);
      setTimeout(() => setCopiedDispatchId(null), 2500);
    }
  };

  // Edit / Add Product State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productImages, setProductImages] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState('all');
  const [productUnitInput, setProductUnitInput] = useState('');
  const [productCostInput, setProductCostInput] = useState('');
  const [productPriceInput, setProductPriceInput] = useState('');
  const [productMrpInput, setProductMrpInput] = useState('');
  const [productStockInput, setProductStockInput] = useState(50);
  const [productVariants, setProductVariants] = useState([]);

  const handleOpenProductModal = (prod = null) => {
    setEditingProduct(prod);
    if (prod) {
      const imgs = Array.isArray(prod.images) && prod.images.length
        ? [...prod.images]
        : (prod.image ? [prod.image] : []);
      setProductImages(imgs);

      const validVars = Array.isArray(prod.variants)
        ? prod.variants
            .filter(v => v && String(v.unit || '').trim() !== '' && String(v.unit || '').trim() !== '0' && Number(v.price) > 0)
            .map((v, i) => ({
              id: v.id || `var-${Date.now()}-${i}`,
              unit: String(v.unit).trim(),
              purchase_price: v.purchase_price ?? prod.purchase_price ?? 0,
              price: v.price ?? prod.price ?? 0,
              mrp: v.mrp ?? v.price ?? prod.mrp ?? 0,
              stock: v.stock ?? prod.stock ?? 50
            }))
        : [];

      if (validVars.length > 1) {
        // Multi-weight/rate product: show all weight & price options in Section 2
        setProductUnitInput('');
        setProductCostInput('');
        setProductPriceInput('');
        setProductMrpInput('');
        setProductStockInput(prod.stock ?? validVars[0]?.stock ?? 50);
        setProductVariants(validVars);
      } else {
        // Single primary weight/rate product: show in Section 1 (Primary)
        const primarySource = validVars[0] || prod;
        const cleanUnit = String(primarySource.unit || prod.unit || '').trim();
        setProductUnitInput(cleanUnit && cleanUnit !== '0' ? cleanUnit : '1 kg');
        setProductCostInput(primarySource.purchase_price ?? prod.purchase_price ?? '');
        setProductPriceInput(primarySource.price ?? prod.price ?? '');
        setProductMrpInput(primarySource.mrp ?? primarySource.price ?? prod.mrp ?? '');
        setProductStockInput(primarySource.stock ?? prod.stock ?? 50);
        setProductVariants([]);
      }
    } else {
      setProductImages([]);
      setProductUnitInput('');
      setProductCostInput('');
      setProductPriceInput('');
      setProductMrpInput('');
      setProductStockInput(50);
      setProductVariants([]);
    }
    setNewImageUrl('');
    setIsProductModalOpen(true);
  };

  const handleAutoGenerateWeightVariants = () => {
    const baseUnit = (productUnitInput || '1 kg').trim().toLowerCase();
    const basePrice = Number(productPriceInput) || 100;
    const baseMrp = Number(productMrpInput) || basePrice;
    const baseCost = Number(productCostInput) || 0;
    const baseStock = Number(productStockInput) || 50;

    // Determine price per 1 kg (or 1 Ltr)
    let perKgPrice = basePrice;
    let perKgMrp = baseMrp;
    let perKgCost = baseCost;
    const isLiquid = baseUnit.includes('ml') || baseUnit.includes('ltr') || baseUnit.includes('l');

    if (baseUnit.includes('250')) {
      perKgPrice = basePrice * 4;
      perKgMrp = baseMrp * 4;
      perKgCost = baseCost * 4;
    } else if (baseUnit.includes('500')) {
      perKgPrice = basePrice * 2;
      perKgMrp = baseMrp * 2;
      perKgCost = baseCost * 2;
    } else if (baseUnit.includes('100')) {
      perKgPrice = basePrice * 10;
      perKgMrp = baseMrp * 10;
      perKgCost = baseCost * 10;
    } else if (baseUnit.includes('200')) {
      perKgPrice = basePrice * 5;
      perKgMrp = baseMrp * 5;
      perKgCost = baseCost * 5;
    }

    const tiers = isLiquid
      ? [
          { unit: '250 ML', mult: 0.25 },
          { unit: '500 ML', mult: 0.5 },
          { unit: '1 Ltr', mult: 1 },
          { unit: '2 Ltr', mult: 2 }
        ]
      : [
          { unit: '100 Gram', mult: 0.1 },
          { unit: '250 Gram', mult: 0.25 },
          { unit: '500 Gram', mult: 0.5 },
          { unit: '1 kg', mult: 1 },
          { unit: '2 kg', mult: 2 },
          { unit: '5 kg', mult: 5 }
        ];

    setProductVariants(
      tiers.map((t, idx) => ({
        id: `var-${Date.now()}-${idx}`,
        unit: t.unit,
        purchase_price: Math.round(perKgCost * t.mult),
        price: Math.max(1, Math.ceil(perKgPrice * t.mult)),
        mrp: Math.max(1, Math.ceil(perKgMrp * t.mult)),
        stock: baseStock
      }))
    );
  };

  // Edit / Add Category State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryImagePreview, setCategoryImagePreview] = useState('');
  const [isUploadingCategoryImage, setIsUploadingCategoryImage] = useState(false);

  // Add Staff State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffVehicle, setNewStaffVehicle] = useState('Bike');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [newStaffShift, setNewStaffShift] = useState('Morning Shift (07:00 AM - 12:00 PM)');

  // Offer Zone Management State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerSubtitle, setOfferSubtitle] = useState('');
  const [offerCode, setOfferCode] = useState('');
  const [offerDiscountTag, setOfferDiscountTag] = useState('FLAT ₹50 OFF');
  const [offerDiscountType, setOfferDiscountType] = useState('flat');
  const [offerDiscountVal, setOfferDiscountVal] = useState(50);
  const [offerMinOrder, setOfferMinOrder] = useState(250);
  const [offerCategoryId, setOfferCategoryId] = useState('all');
  const [offerImage, setOfferImage] = useState('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80');
  const [offerIsActive, setOfferIsActive] = useState(true);
  const [isUploadingOfferImage, setIsUploadingOfferImage] = useState(false);
  const [offerSearch, setOfferSearch] = useState('');
  const [offerFilter, setOfferFilter] = useState('all'); // 'all' | 'live' | 'paused'

  // Reports Module State
  const [reportModuleFilter, setReportModuleFilter] = useState('sales'); // 'sales' | 'daily_pnl' | 'inventory' | 'margin' | 'loyalty' | 'riders'
  const [pnlPeriodFilter, setPnlPeriodFilter] = useState('all'); // 'all' | 'today' | '7days' | '30days' | 'custom'
  const [pnlStartDate, setPnlStartDate] = useState('');
  const [pnlEndDate, setPnlEndDate] = useState('');
  const [selectedPnlDay, setSelectedPnlDay] = useState(null);

  // Stamp Customers Module State
  const [stampCustomerSearch, setStampCustomerSearch] = useState('');
  const [stampCustomerFilter, setStampCustomerFilter] = useState('all'); // 'all' | 'gift_eligible' | 'active' | 'fulfilled'
  const [giftFulfillments, setGiftFulfillments] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_gift_fulfillments');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load gift fulfillments from Firebase on initial render
  React.useEffect(() => {
    fetch('https://vertexpsbyri-default-rtdb.asia-southeast1.firebasedatabase.app/gift_fulfillments.json')
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setGiftFulfillments(data);
          try { localStorage.setItem('gk_gift_fulfillments', JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Customer Wallet Modal State
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletTargetCustomer, setWalletTargetCustomer] = useState(null); // { name, phone, cleanPhone, balance }
  const [walletAdjustType, setWalletAdjustType] = useState('credit'); // 'credit' | 'debit'
  const [walletAdjustAmount, setWalletAdjustAmount] = useState('');
  const [walletAdjustReason, setWalletAdjustReason] = useState('');
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);

  const handleOpenWalletModal = (customer) => {
    const cleanPhone = String(customer?.phone || customer?.cleanPhone || '').replace(/\D/g, '').slice(-10);
    const currWallet = wallets?.[cleanPhone] || { balance: customer?.walletBalance || 0, history: [] };
    setWalletTargetCustomer({
      name: customer.name || 'Customer',
      phone: customer.phone || cleanPhone,
      cleanPhone: cleanPhone,
      balance: currWallet.balance || 0
    });
    setWalletAdjustType('credit');
    setWalletAdjustAmount('');
    setWalletAdjustReason('');
    setIsWalletModalOpen(true);
  };

  const handleSaveWalletAdjustment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!walletTargetCustomer || !walletTargetCustomer.cleanPhone) return;
    const numAmt = Number(walletAdjustAmount);

    if (walletAdjustType === 'set') {
      if (isNaN(numAmt) || numAmt < 0) {
        alert('Please enter a valid amount (₹0 or greater)');
        return;
      }
    } else {
      if (!numAmt || numAmt <= 0) {
        alert('Please enter a valid amount greater than ₹0');
        return;
      }
    }

    if (walletAdjustType === 'debit' && numAmt > (walletTargetCustomer.balance || 0)) {
      if (!window.confirm(`Deducting ₹${numAmt} is greater than current balance (₹${walletTargetCustomer.balance}). Set balance to ₹0?`)) {
        return;
      }
    }

    setIsSubmittingWallet(true);
    try {
      const defaultReason = walletAdjustType === 'credit'
        ? (walletAdjustReason.trim() || 'Store promotional balance added by Admin')
        : walletAdjustType === 'debit'
        ? (walletAdjustReason.trim() || 'Balance deduction by Admin')
        : (walletAdjustReason.trim() || 'Wallet balance amount adjusted by Admin');

      const res = await adjustCustomerWallet(walletTargetCustomer.cleanPhone, numAmt, {
        type: walletAdjustType,
        reason: defaultReason,
        by: activeStaffName || 'Admin'
      });

      if (addAuditLog) {
        addAuditLog({
          action: walletAdjustType === 'credit' ? 'Wallet Credit' : walletAdjustType === 'debit' ? 'Wallet Debit' : 'Wallet Balance Changed',
          details: `${walletAdjustType === 'credit' ? 'Added' : walletAdjustType === 'debit' ? 'Deducted' : 'Set to'} ₹${numAmt} for ${walletTargetCustomer.name} (${walletTargetCustomer.cleanPhone}). Reason: ${defaultReason}. New Balance: ₹${res?.newBalance ?? 'N/A'}`
        });
      }

      alert(`✅ Successfully ${walletAdjustType === 'credit' ? `added ₹${numAmt} to` : walletAdjustType === 'debit' ? `deducted ₹${numAmt} from` : `changed balance to ₹${numAmt} for`} ${walletTargetCustomer.name}'s wallet! New balance: ₹${res?.newBalance ?? 0}`);
      setIsWalletModalOpen(false);
    } catch (err) {
      console.error('Wallet adjustment failed:', err);
      alert('Failed to update wallet: ' + err.message);
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  // 1-Click Clear / Delete Entire Wallet Balance to ₹0
  const handleDeleteWalletBalance = async () => {
    if (!walletTargetCustomer || !walletTargetCustomer.cleanPhone) return;
    const currentBalance = walletTargetCustomer.balance || 0;
    if (!window.confirm(`⚠️ Are you sure you want to delete and reset the entire wallet balance of ₹${currentBalance} to ₹0 for ${walletTargetCustomer.name} (${walletTargetCustomer.cleanPhone})? This will permanently erase their balance.`)) {
      return;
    }

    setIsSubmittingWallet(true);
    try {
      const clearReason = walletAdjustReason.trim() || 'Entire wallet balance deleted/reset to ₹0 by Admin';
      const res = await adjustCustomerWallet(walletTargetCustomer.cleanPhone, 0, {
        type: 'clear',
        reason: clearReason,
        by: activeStaffName || 'Admin'
      });

      if (addAuditLog) {
        addAuditLog({
          action: 'Wallet Balance Deleted',
          details: `Cleared full balance of ₹${currentBalance} to ₹0 for ${walletTargetCustomer.name} (${walletTargetCustomer.cleanPhone}). Reason: ${clearReason}`
        });
      }

      alert(`🗑️ Successfully deleted wallet balance for ${walletTargetCustomer.name}! Current balance is now ₹0.`);
      setIsWalletModalOpen(false);
    } catch (err) {
      console.error('Failed to delete wallet balance:', err);
      alert('Error deleting wallet balance: ' + err.message);
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  // Block Customer State & Handlers
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockTargetPhone, setBlockTargetPhone] = useState('');
  const [blockTargetName, setBlockTargetName] = useState('');
  const [blockReason, setBlockReason] = useState('Fake / suspicious orders');
  const [isSubmittingBlock, setIsSubmittingBlock] = useState(false);
  const [isBlocklistModalOpen, setIsBlocklistModalOpen] = useState(false);
  const [newBlockPhoneInput, setNewBlockPhoneInput] = useState('');
  const [newBlockReasonInput, setNewBlockReasonInput] = useState('');

  const handlePromptBlockCustomer = (phone, name = '') => {
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please select a valid 10-digit mobile number');
      return;
    }
    setBlockTargetPhone(cleanPhone);
    setBlockTargetName(name || 'Customer');
    setBlockReason('Fake order / suspicious activity');
    setIsBlockModalOpen(true);
  };

  const handleConfirmBlockCustomer = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!blockTargetPhone) return;
    setIsSubmittingBlock(true);
    try {
      await blockCustomer(blockTargetPhone, {
        reason: blockReason.trim() || 'Fake order / abusive behavior',
        name: blockTargetName,
        by: activeStaffName || 'Admin'
      });
      alert(`🚫 Customer ${blockTargetPhone} (${blockTargetName}) has been blocked! They will not be able to place any orders.`);
      setIsBlockModalOpen(false);
    } catch (err) {
      alert('Error blocking customer: ' + err.message);
    } finally {
      setIsSubmittingBlock(false);
    }
  };

  const handleUnblockCustomer = async (phone) => {
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone) return;
    if (!window.confirm(`Unblock customer mobile ${cleanPhone}? They will be allowed to place orders again.`)) {
      return;
    }
    try {
      await unblockCustomer(cleanPhone, activeStaffName || 'Admin');
      alert(`✅ Customer ${cleanPhone} has been unblocked!`);
    } catch (err) {
      alert('Error unblocking customer: ' + err.message);
    }
  };

  const handleAddManualBlock = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanPhone = String(newBlockPhoneInput || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number to block');
      return;
    }
    try {
      await blockCustomer(cleanPhone, {
        reason: newBlockReasonInput.trim() || 'Manual block by Admin',
        name: 'Blocked User',
        by: activeStaffName || 'Admin'
      });
      alert(`🚫 Customer ${cleanPhone} added to blocklist!`);
      setNewBlockPhoneInput('');
      setNewBlockReasonInput('');
    } catch (err) {
      alert('Error blocking customer: ' + err.message);
    }
  };

  // Company Details & Delivery Settings Form State
  const [storeName, setStoreName] = useState(settings?.store_name || 'GhartakKart Khair Store');
  const [storeTagline, setStoreTagline] = useState(settings?.store_tagline || 'Fresh to Home, Fast to You.');
  const [storeAddress, setStoreAddress] = useState(settings?.store_address || 'Somna Road, Main Market, Khair, Aligarh, Uttar Pradesh - 202138');
  const [storeLogo, setStoreLogo] = useState(settings?.store_logo || '/logo.jpg');
  const [isUploadingStoreLogo, setIsUploadingStoreLogo] = useState(false);
  const [gstin, setGstin] = useState(settings?.gstin || '');
  const [fssaiLicense, setFssaiLicense] = useState(settings?.fssai_license || '');
  const [supportPhone, setSupportPhone] = useState(settings?.support_phone || '+91 98765 43210');
  const [supportEmail, setSupportEmail] = useState(settings?.support_email || 'support@ghartakkart.com');
  const [receiptFooterMsg, setReceiptFooterMsg] = useState(settings?.receipt_footer_msg || '*** THANK YOU FOR SHOPPING LOCAL ***');
  const [upiId, setUpiId] = useState(settings?.upi_id || '9058564391@ptsbi');
  const [upiMerchantName, setUpiMerchantName] = useState(settings?.upi_merchant_name || 'GhartakKart Khair Store');
  const [razorpayKeyId, setRazorpayKeyId] = useState(settings?.razorpay_key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_To2EZDjW6D4GZW');

  // Store Operating Hours & Status
  const [storeIsOpen, setStoreIsOpen] = useState(settings?.delivery_hours?.is_open ?? true);
  const [openingTime, setOpeningTime] = useState(settings?.delivery_hours?.open || '07:00');
  const [closingTime, setClosingTime] = useState(settings?.delivery_hours?.close || '23:00');
  const [closedNotice, setClosedNotice] = useState(
    settings?.delivery_hours?.closed_message || 'Store is currently closed for deliveries. Operating hours are 07:00 AM to 11:00 PM.'
  );
  const [daysOpen, setDaysOpen] = useState(
    settings?.delivery_hours?.days_open || 'All 7 Days (Mon - Sun)'
  );

  const [storeLat, setStoreLat] = useState(settings?.store_lat || 27.941887);
  const [storeLng, setStoreLng] = useState(settings?.store_lng || 77.843715);
  const [maxRadiusKm, setMaxRadiusKm] = useState(settings?.max_radius_km || 10);
  const [slabs, setSlabs] = useState(settings?.fee_slabs || []);
  const [settingsSavedNotice, setSettingsSavedNotice] = useState(false);
  const [isCapturingStoreGps, setIsCapturingStoreGps] = useState(false);
  const [storeGpsMsg, setStoreGpsMsg] = useState('');
  const settingsInitializedRef = React.useRef(false);

  // Cashback Offer & Customer Wallet Controls State
  const [cashbackActive, setCashbackActive] = useState(settings?.cashback_active !== false);
  const [cashbackPercentage, setCashbackPercentage] = useState(settings?.cashback_percentage ?? 1);
  const [cashbackMinOrder, setCashbackMinOrder] = useState(settings?.cashback_min_order ?? 500);
  const [cashbackMaxPerOrder, setCashbackMaxPerOrder] = useState(settings?.cashback_max_per_order ?? 50);

  const [walletRedemptionActive, setWalletRedemptionActive] = useState(settings?.wallet_redemption_active !== false);
  const [walletMaxUsePercent, setWalletMaxUsePercent] = useState(settings?.wallet_max_use_percent ?? 100);
  const [walletMaxUseAmount, setWalletMaxUseAmount] = useState(settings?.wallet_max_use_amount ?? 0);
  const [walletMinOrderForUse, setWalletMinOrderForUse] = useState(settings?.wallet_min_order_for_use ?? 0);
  const [isSavingCashbackSettings, setIsSavingCashbackSettings] = useState(false);
  const [cashbackSettingsSavedMsg, setCashbackSettingsSavedMsg] = useState('');

  // Initialize form state when settings load from Firebase
  React.useEffect(() => {
    if (settings) {
      if (settings.store_lat) setStoreLat(settings.store_lat);
      if (settings.store_lng) setStoreLng(settings.store_lng);
      if (!settingsInitializedRef.current) {
        settingsInitializedRef.current = true;
        if (settings.store_name) setStoreName(settings.store_name);
        if (settings.store_tagline) setStoreTagline(settings.store_tagline);
        if (settings.store_address) setStoreAddress(settings.store_address);
        if (settings.store_logo) setStoreLogo(settings.store_logo);
        if (settings.gstin) setGstin(settings.gstin);
        if (settings.fssai_license) setFssaiLicense(settings.fssai_license);
        if (settings.support_phone) setSupportPhone(settings.support_phone);
        if (settings.support_email) setSupportEmail(settings.support_email);
        if (settings.receipt_footer_msg) setReceiptFooterMsg(settings.receipt_footer_msg);
        if (settings.upi_id) setUpiId(settings.upi_id);
        if (settings.upi_merchant_name) setUpiMerchantName(settings.upi_merchant_name);
        if (settings.razorpay_key_id) setRazorpayKeyId(settings.razorpay_key_id);
        if (settings.max_radius_km) setMaxRadiusKm(settings.max_radius_km);
        if (settings.fee_slabs) setSlabs(settings.fee_slabs);
        if (settings.cashback_active !== undefined) setCashbackActive(settings.cashback_active !== false);
        if (settings.cashback_percentage !== undefined) setCashbackPercentage(settings.cashback_percentage);
        if (settings.cashback_min_order !== undefined) setCashbackMinOrder(settings.cashback_min_order);
        if (settings.cashback_max_per_order !== undefined) setCashbackMaxPerOrder(settings.cashback_max_per_order);
        if (settings.wallet_redemption_active !== undefined) setWalletRedemptionActive(settings.wallet_redemption_active !== false);
        if (settings.wallet_max_use_percent !== undefined) setWalletMaxUsePercent(settings.wallet_max_use_percent);
        if (settings.wallet_max_use_amount !== undefined) setWalletMaxUseAmount(settings.wallet_max_use_amount);
        if (settings.wallet_min_order_for_use !== undefined) setWalletMinOrderForUse(settings.wallet_min_order_for_use);
        if (settings.delivery_hours) {
          if (settings.delivery_hours.is_open !== undefined) setStoreIsOpen(settings.delivery_hours.is_open);
          if (settings.delivery_hours.open) setOpeningTime(settings.delivery_hours.open);
          if (settings.delivery_hours.close) setClosingTime(settings.delivery_hours.close);
          if (settings.delivery_hours.closed_message) setClosedNotice(settings.delivery_hours.closed_message);
          if (settings.delivery_hours.days_open) setDaysOpen(settings.delivery_hours.days_open);
        }
      }
    }
  }, [settings]);

  // Dashboard Stats Calculations
  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled', 'Rejected'].includes(o.order_status));
  const deliveredOrders = orders.filter(o => o.order_status === 'Delivered');
  const totalRevenue = orders
    .filter(o => o.order_status !== 'Cancelled' && o.order_status !== 'Rejected')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const lowStockProducts = products.filter(p => p.stock <= 15);

  const statusOptions = ['Placed', 'Accepted', 'Packing', 'Out for Delivery', 'Delivered', 'Cancelled'];

  // Helper: Resolve exact unit purchase cost for any order item (supports primary & variant items)
  const getOrderItemUnitCost = React.useCallback((item) => {
    if (!item) return 0;
    const savedCost = Number(item.purchase_price);
    if (savedCost > 0) return savedCost;

    const rawId = String(item.product_id || '');
    const baseId = item.base_product_id || rawId.split('__')[0];
    const itemUnit = String(item.unit || '').trim().toLowerCase();

    const prod = products.find(
      p => p && (
        String(p.id) === baseId ||
        String(p.id) === rawId ||
        (p.name && item.name && p.name.trim().toLowerCase() === item.name.trim().toLowerCase())
      )
    );
    if (!prod) return 0;

    if (Array.isArray(prod.variants) && prod.variants.length > 0 && itemUnit) {
      const matchedVar = prod.variants.find(
        v => v && String(v.unit || '').trim().toLowerCase() === itemUnit
      );
      if (matchedVar && Number(matchedVar.purchase_price) > 0) {
        return Number(matchedVar.purchase_price);
      }
    }
    return Number(prod.purchase_price) || 0;
  }, [products]);

  // Helper: Compute full P&L metrics for a single order
  const getOrderPnlBreakdown = React.useCallback((order) => {
    const isCancelled = order?.order_status === 'Cancelled' || order?.order_status === 'Rejected';
    const items = Array.isArray(order?.items) ? order.items : [];
    const totalUnits = items.reduce((s, it) => s + (Number(it?.qty) || 0), 0);
    const itemsCost = items.reduce((s, it) => s + getOrderItemUnitCost(it) * (Number(it?.qty) || 0), 0);
    const itemsSell = Number(order?.subtotal) || items.reduce((s, it) => s + (Number(it?.price) || 0) * (Number(it?.qty) || 0), 0);
    const deliveryFee = Number(order?.delivery_fee) || 0;
    const discount = Number(order?.discount) || 0;
    const freeGiftCost = Number(order?.milestone_gift?.worth) || 0;
    const grossRevenue = Number(order?.total) || Math.max(0, itemsSell + deliveryFee - discount);
    const grossItemProfit = itemsSell - itemsCost;
    const netProfit = isCancelled ? 0 : (grossItemProfit + deliveryFee - discount - freeGiftCost);
    const marginPct = (!isCancelled && itemsCost > 0) ? Math.round((netProfit / itemsCost) * 100) : 0;

    return {
      isCancelled,
      totalUnits,
      itemsCost: isCancelled ? 0 : itemsCost,
      itemsSell: isCancelled ? 0 : itemsSell,
      deliveryFee: isCancelled ? 0 : deliveryFee,
      discount: isCancelled ? 0 : discount,
      freeGiftCost: isCancelled ? 0 : freeGiftCost,
      grossRevenue: isCancelled ? 0 : grossRevenue,
      grossItemProfit: isCancelled ? 0 : grossItemProfit,
      netProfit,
      marginPct
    };
  }, [getOrderItemUnitCost]);

  // Day-to-Day P&L Aggregation (Grouped by Local Date YYYY-MM-DD)
  const dailyPnlData = React.useMemo(() => {
    const dayMap = new Map();

    const toLocalDateKey = (isoStr) => {
      try {
        const d = isoStr ? new Date(isoStr) : new Date();
        if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      } catch {
        return new Date().toISOString().slice(0, 10);
      }
    };

    orders.forEach(order => {
      if (!order) return;
      const dateKey = toLocalDateKey(order.created_at);
      if (!dayMap.has(dateKey)) {
        const dObj = new Date(`${dateKey}T00:00:00`);
        dayMap.set(dateKey, {
          dateKey,
          displayDate: dObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          dayName: dObj.toLocaleDateString('en-IN', { weekday: 'short' }),
          totalOrders: 0,
          validOrders: 0,
          deliveredOrders: 0,
          cancelledOrders: 0,
          unitsSold: 0,
          itemsSell: 0,
          itemsCost: 0,
          deliveryFee: 0,
          discount: 0,
          freeGiftCost: 0,
          grossRevenue: 0,
          grossItemProfit: 0,
          netProfit: 0,
          ordersList: []
        });
      }

      const dayEntry = dayMap.get(dateKey);
      const pnl = getOrderPnlBreakdown(order);
      dayEntry.totalOrders += 1;
      dayEntry.ordersList.push({ ...order, _pnl: pnl });

      if (pnl.isCancelled) {
        dayEntry.cancelledOrders += 1;
      } else {
        dayEntry.validOrders += 1;
        if (order.order_status === 'Delivered') {
          dayEntry.deliveredOrders += 1;
        }
        dayEntry.unitsSold += pnl.totalUnits;
        dayEntry.itemsSell += pnl.itemsSell;
        dayEntry.itemsCost += pnl.itemsCost;
        dayEntry.deliveryFee += pnl.deliveryFee;
        dayEntry.discount += pnl.discount;
        dayEntry.freeGiftCost += pnl.freeGiftCost;
        dayEntry.grossRevenue += pnl.grossRevenue;
        dayEntry.grossItemProfit += pnl.grossItemProfit;
        dayEntry.netProfit += pnl.netProfit;
      }
    });

    const allDays = Array.from(dayMap.values())
      .map(d => ({
        ...d,
        marginPct: d.itemsCost > 0 ? Math.round((d.netProfit / d.itemsCost) * 100) : (d.grossRevenue > 0 ? 100 : 0)
      }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    // Apply Date Period Filter
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const filteredDays = allDays.filter(d => {
      if (pnlPeriodFilter === 'today') {
        return d.dateKey === todayKey;
      }
      if (pnlPeriodFilter === '7days') {
        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
        return d.dateKey >= cutoffKey && d.dateKey <= todayKey;
      }
      if (pnlPeriodFilter === '30days') {
        const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
        const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
        return d.dateKey >= cutoffKey && d.dateKey <= todayKey;
      }
      if (pnlPeriodFilter === 'custom') {
        if (pnlStartDate && d.dateKey < pnlStartDate) return false;
        if (pnlEndDate && d.dateKey > pnlEndDate) return false;
        return true;
      }
      return true;
    });

    const summary = filteredDays.reduce(
      (acc, d) => {
        acc.totalOrders += d.totalOrders;
        acc.validOrders += d.validOrders;
        acc.deliveredOrders += d.deliveredOrders;
        acc.cancelledOrders += d.cancelledOrders;
        acc.unitsSold += d.unitsSold;
        acc.itemsSell += d.itemsSell;
        acc.itemsCost += d.itemsCost;
        acc.deliveryFee += d.deliveryFee;
        acc.discount += d.discount;
        acc.freeGiftCost += d.freeGiftCost;
        acc.grossRevenue += d.grossRevenue;
        acc.grossItemProfit += d.grossItemProfit;
        acc.netProfit += d.netProfit;
        return acc;
      },
      {
        totalOrders: 0,
        validOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        unitsSold: 0,
        itemsSell: 0,
        itemsCost: 0,
        deliveryFee: 0,
        discount: 0,
        freeGiftCost: 0,
        grossRevenue: 0,
        grossItemProfit: 0,
        netProfit: 0
      }
    );
    summary.marginPct = summary.itemsCost > 0 ? Math.round((summary.netProfit / summary.itemsCost) * 100) : 0;

    return { allDays, filteredDays, summary, todayKey };
  }, [orders, getOrderPnlBreakdown, pnlPeriodFilter, pnlStartDate, pnlEndDate]);

  // ================= VENDORS & ACCOUNTING MODULE CONSTANTS & STATE =================
  const EXPENSE_CATEGORIES = [
    { id: 'goods_purchase', label: 'Inventory / Goods Purchase', icon: Package, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'delivery_fuel', label: 'Delivery Boy Fuel & Payouts', icon: Bike, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'rent_store', label: 'Store / Warehouse Rent', icon: Building2, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'electricity_bills', label: 'Electricity & Utilities', icon: Sun, color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { id: 'packaging', label: 'Packaging Bags & Boxes', icon: Layers, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'staff_wages', label: 'Staff Salaries & Wages', icon: Users, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { id: 'marketing', label: 'Marketing & Promotions', icon: Sparkles, color: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'maintenance', label: 'Maintenance & Cleaning', icon: Shield, color: 'bg-teal-100 text-teal-800 border-teal-300' },
    { id: 'software_telecom', label: 'Internet & Phone Bills', icon: Smartphone, color: 'bg-sky-100 text-sky-800 border-sky-300' },
    { id: 'tea_refreshment', label: 'Staff Tea & Refreshment', icon: Store, color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { id: 'miscellaneous', label: 'Miscellaneous / Other', icon: FileText, color: 'bg-gray-100 text-gray-800 border-gray-300' }
  ];

  const OTHER_INCOME_CATEGORIES = [
    { id: 'scrap_sale', label: 'Scrap & Carton Box Sale', color: 'bg-emerald-100 text-emerald-800' },
    { id: 'delivery_collection', label: 'Delivery Fee Surcharge', color: 'bg-blue-100 text-blue-800' },
    { id: 'vendor_rebate', label: 'Supplier Cashback / Rebate', color: 'bg-amber-100 text-amber-800' },
    { id: 'capital_inflow', label: 'Owner / Partner Capital Inflow', color: 'bg-purple-100 text-purple-800' },
    { id: 'miscellaneous', label: 'Other Sundry Income', color: 'bg-gray-100 text-gray-800' }
  ];

  // Vendors & Ledger State
  const [vendorSubTab, setVendorSubTab] = useState('directory'); // 'directory' | 'ledger'
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState('all');
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [isVendorPaymentModalOpen, setIsVendorPaymentModalOpen] = useState(false);
  const [isVendorBillModalOpen, setIsVendorBillModalOpen] = useState(false);
  const [selectedVendorForAction, setSelectedVendorForAction] = useState(null);
  const [isVendorStatementModalOpen, setIsVendorStatementModalOpen] = useState(false);
  const [selectedVendorForStatement, setSelectedVendorForStatement] = useState(null);
  const [ledgerVendorFilter, setLedgerVendorFilter] = useState('all');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all');
  const [ledgerDateFilter, setLedgerDateFilter] = useState('all');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Automated Excel Sheet state & Attached Google Sheet
  const attachedGoogleSheetUrl = settings?.vendor_google_sheet_url || 'https://docs.google.com/spreadsheets/d/1UWjAKy9lqLOD_mhzD2KULs_P133WWWZZN8jLlKq8o14/edit?usp=sharing';
  const attachedGoogleSheetId = settings?.vendor_google_sheet_id || '1UWjAKy9lqLOD_mhzD2KULs_P133WWWZZN8jLlKq8o14';
  const [excelActiveSheet, setExcelActiveSheet] = useState('materials'); // 'materials' | 'payments' | 'summary' | 'journal' | 'embedded'
  const [excelVendorFilter, setExcelVendorFilter] = useState('all');
  const [excelDateFilter, setExcelDateFilter] = useState('all');
  const [excelSearch, setExcelSearch] = useState('');
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState(() => settings?.vendor_google_sheet_webhook || '');
  const [isSyncingGoogleSheet, setIsSyncingGoogleSheet] = useState(false);
  const [googleSheetSyncSuccess, setGoogleSheetSyncSuccess] = useState(false);

  // Payment modal state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRefNo, setPaymentRefNo] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Direct Bill modal state
  const [billAmount, setBillAmount] = useState('');
  const [billInvoiceNo, setBillInvoiceNo] = useState('');
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billNotes, setBillNotes] = useState('');

  // Expenses & Income / Accounting State
  const [accountingSubTab, setAccountingSubTab] = useState('pnl'); // 'pnl' | 'expenses' | 'incomes'
  const [accountingDateFilter, setAccountingDateFilter] = useState('all'); // 'all' | 'today' | 'this_week' | 'this_month' | 'last_month'
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [incomeCategoryFilter, setIncomeCategoryFilter] = useState('all');
  const [incomeSearch, setIncomeSearch] = useState('');
  const [isOtherIncomeModalOpen, setIsOtherIncomeModalOpen] = useState(false);
  const [editingOtherIncome, setEditingOtherIncome] = useState(null);

  // Expense form fields
  const [expCategory, setExpCategory] = useState('delivery_fuel');
  const [expAmount, setExpAmount] = useState('');
  const [expPaidTo, setExpPaidTo] = useState('');
  const [expPaymentMode, setExpPaymentMode] = useState('Cash');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expRefNo, setExpRefNo] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Other income form fields
  const [incCategory, setIncCategory] = useState('scrap_sale');
  const [incAmount, setIncAmount] = useState('');
  const [incSource, setIncSource] = useState('');
  const [incPaymentMode, setIncPaymentMode] = useState('Cash');
  const [incDate, setIncDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [incNotes, setIncNotes] = useState('');

  // Vendor Balances and Aggregate Statistics
  const vendorLedgerStats = React.useMemo(() => {
    const statsMap = {};
    (vendors || []).forEach(v => {
      statsMap[v.id] = {
        totalPurchases: 0,
        totalPaid: 0,
        balancePayable: Number(v.opening_balance) || 0
      };
    });

    (vendorLedger || []).forEach(entry => {
      if (!entry || entry.status === 'cancelled') return;
      const vId = entry.vendor_id;
      if (!statsMap[vId]) {
        statsMap[vId] = { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
      }
      const amt = Number(entry.amount) || 0;
      if (entry.type === 'purchase' || entry.type === 'bill') {
        statsMap[vId].totalPurchases += amt;
        statsMap[vId].balancePayable += amt;
      } else if (entry.type === 'payment' || entry.type === 'return') {
        statsMap[vId].totalPaid += amt;
        statsMap[vId].balancePayable -= amt;
      }
    });

    const overall = {
      totalPurchasesAll: 0,
      totalPaidAll: 0,
      totalPayableAll: 0
    };
    Object.values(statsMap).forEach(s => {
      overall.totalPurchasesAll += s.totalPurchases;
      overall.totalPaidAll += s.totalPaid;
      overall.totalPayableAll += s.balancePayable;
    });

    return { statsMap, overall };
  }, [vendors, vendorLedger]);

  // Resolve full item details for a ledger entry with resilient fallbacks to orders & products
  const resolveEntryItems = React.useCallback((entry) => {
    if (!entry) return [];
    if (Array.isArray(entry.items) && entry.items.length > 0) {
      return entry.items.map(it => {
        const q = Number(it.qty || it.quantity || 1);
        const uCost = Number(it.unit_cost != null ? it.unit_cost : (it.wholesale_price || it.purchase_price || it.price || 0));
        const tCost = Number(it.total_cost != null ? it.total_cost : (uCost * q));
        return {
          name: it.name || it.title || 'Product',
          qty: q,
          unit: it.unit || '',
          unit_cost: uCost,
          total_cost: tCost
        };
      });
    }
    if (entry.order_id) {
      const matchedOrder = (orders || []).find(o => o && String(o.id) === String(entry.order_id));
      if (matchedOrder && Array.isArray(matchedOrder.items) && matchedOrder.items.length > 0) {
        // Find items that match this vendor
        const vendorItems = matchedOrder.items.filter(it => {
          if (!it) return false;
          if (it.vendor_id && entry.vendor_id) return it.vendor_id === entry.vendor_id;
          if (it.vendor_name && entry.vendor_id) {
            const v = (vendors || []).find(x => x && x.id === entry.vendor_id);
            if (v && (
              v.name?.trim().toLowerCase() === it.vendor_name?.trim().toLowerCase() ||
              v.company_name?.trim().toLowerCase() === it.vendor_name?.trim().toLowerCase()
            )) return true;
          }
          return false;
        });
        const targetItems = vendorItems.length > 0 ? vendorItems : matchedOrder.items;
        return targetItems.map(it => {
          const rawId = String(it.product_id || it.id || '').split('__')[0];
          const prod = (products || []).find(p => p && (String(p.id) === rawId || p.name === it.name));
          let unitCost = Number(it.purchase_price || it.wholesale_price);
          if (!unitCost || unitCost <= 0) unitCost = Number(prod?.purchase_price);
          if (!unitCost || unitCost <= 0) unitCost = Math.round((Number(it.price) || 0) * 0.75);
          const q = Number(it.quantity || it.qty || 1);
          return {
            name: it.name || 'Product',
            qty: q,
            unit: it.unit || prod?.unit || '',
            unit_cost: unitCost,
            total_cost: unitCost * q
          };
        });
      }
    }
    return [];
  }, [orders, products, vendors]);

  // Accounting P&L and Cash Flow Metrics
  const accountingPnlMetrics = React.useMemo(() => {
    const isWithinDate = (dateStr) => {
      if (accountingDateFilter === 'all') return true;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const now = new Date();
      if (accountingDateFilter === 'today') {
        return d.toDateString() === now.toDateString();
      }
      if (accountingDateFilter === 'this_week') {
        const weekAgo = new Date(now.getTime() - 7 * 86400000);
        return d >= weekAgo;
      }
      if (accountingDateFilter === 'this_month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (accountingDateFilter === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return d.getMonth() === lastMonth && d.getFullYear() === year;
      }
      return true;
    };

    // 1. Order Sales Inflow
    const filteredOrders = (orders || []).filter(o => {
      if (!o || o.order_status === 'Cancelled' || o.order_status === 'Rejected') return false;
      return isWithinDate(o.created_at);
    });

    let totalOrderSalesRevenue = 0;
    let codSalesRevenue = 0;
    let upiSalesRevenue = 0;
    let totalCogs = 0;

    filteredOrders.forEach(o => {
      const tot = Number(o.total) || 0;
      totalOrderSalesRevenue += tot;
      const pMethod = String(o.payment_method || '').toLowerCase();
      if (pMethod.includes('cash') || pMethod.includes('cod')) {
        codSalesRevenue += tot;
      } else {
        upiSalesRevenue += tot;
      }
      const pnl = getOrderPnlBreakdown(o);
      totalCogs += (Number(pnl.itemsCost) || 0) + (Number(pnl.freeGiftCost) || 0);
    });

    // 2. Other Incomes
    const filteredOtherIncomes = (otherIncomes || []).filter(i => isWithinDate(i.date || i.created_at));
    const totalOtherIncome = filteredOtherIncomes.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalGrossRevenue = totalOrderSalesRevenue + totalOtherIncome;

    // 3. Operating Expenses
    const filteredExpenses = (expenses || []).filter(e => isWithinDate(e.date || e.created_at));
    const totalOperatingExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    // 4. Profit & Margins
    const grossProfit = totalOrderSalesRevenue - totalCogs;
    const grossMarginPct = totalOrderSalesRevenue > 0 ? Math.round((grossProfit / totalOrderSalesRevenue) * 100) : 0;
    const netProfit = grossProfit + totalOtherIncome - totalOperatingExpenses;
    const netMarginPct = totalGrossRevenue > 0 ? Math.round((netProfit / totalGrossRevenue) * 100) : 0;

    // 5. Cash Flow Summary
    let cashPaidExpenses = 0;
    let upiPaidExpenses = 0;
    filteredExpenses.forEach(e => {
      const mode = String(e.payment_mode || '').toLowerCase();
      const amt = Number(e.amount) || 0;
      if (mode.includes('cash')) cashPaidExpenses += amt;
      else upiPaidExpenses += amt;
    });

    let cashOtherIncome = 0;
    let upiOtherIncome = 0;
    filteredOtherIncomes.forEach(i => {
      const mode = String(i.payment_mode || '').toLowerCase();
      const amt = Number(i.amount) || 0;
      if (mode.includes('cash')) cashOtherIncome += amt;
      else upiOtherIncome += amt;
    });

    const netCashFlow = (codSalesRevenue + cashOtherIncome) - cashPaidExpenses;
    const netDigitalFlow = (upiSalesRevenue + upiOtherIncome) - upiPaidExpenses;

    // 6. Category breakdown for expenses
    const expenseByCategory = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'miscellaneous';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
    });

    return {
      totalOrderSalesRevenue,
      codSalesRevenue,
      upiSalesRevenue,
      totalOtherIncome,
      totalGrossRevenue,
      totalCogs,
      grossProfit,
      grossMarginPct,
      totalOperatingExpenses,
      netProfit,
      netMarginPct,
      netCashFlow,
      netDigitalFlow,
      cashPaidExpenses,
      upiPaidExpenses,
      cashOtherIncome,
      upiOtherIncome,
      expenseByCategory,
      filteredOrdersCount: filteredOrders.length,
      filteredExpensesCount: filteredExpenses.length,
      filteredIncomesCount: filteredOtherIncomes.length
    };
  }, [orders, expenses, otherIncomes, accountingDateFilter, getOrderPnlBreakdown]);

  // Vendor Action Handlers
  const handleOpenVendorModal = (v = null) => {
    setEditingVendor(v);
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: (formData.get('name') || '').trim(),
      company_name: (formData.get('company_name') || '').trim(),
      phone: (formData.get('phone') || '').trim(),
      email: (formData.get('email') || '').trim(),
      category: (formData.get('category') || 'General FMCG').trim(),
      address: (formData.get('address') || '').trim(),
      gst: (formData.get('gst') || '').trim(),
      pan: (formData.get('pan') || '').trim(),
      opening_balance: Number(formData.get('opening_balance')) || 0,
      notes: (formData.get('notes') || '').trim(),
      status: formData.get('status') || 'active'
    };
    if (editingVendor) {
      await updateVendor(editingVendor.id, data);
      if (addAuditLog) {
        addAuditLog({ action: 'Update Vendor', details: `Updated vendor details for: ${data.name}` });
      }
    } else {
      await addVendor(data);
      if (addAuditLog) {
        addAuditLog({ action: 'Create Vendor', details: `Added new vendor: ${data.name} (${data.category})` });
      }
    }
    setIsVendorModalOpen(false);
  };

  const handleDeleteVendor = async (vendorId) => {
    const v = (vendors || []).find(it => it.id === vendorId);
    if (!window.confirm(`Are you sure you want to delete vendor "${v?.name || 'Vendor'}"? This will not delete past ledger transactions.`)) return;
    await deleteVendor(vendorId);
    if (addAuditLog) {
      addAuditLog({ action: 'Delete Vendor', details: `Deleted vendor: ${v?.name}` });
    }
  };

  const handleResetAllVendorBalances = async () => {
    if (!window.confirm("Are you sure you want to reset and clear ALL vendor balances to ₹0?\n\nThis will clear past ledger balances so nothing is due, and mark all vendor balances as ₹0 (Settled).")) return;
    await resetAllVendorLedgers();
    if (addAuditLog) {
      addAuditLog({ action: 'Reset Vendor Balances', details: 'All vendor ledger balances cleared to zero (Nothing Due).' });
    }
    alert("✅ All vendor balances have been cleared and set to ₹0.00 (Nothing is due)!");
  };

  const handleSettleVendorToZero = async (vendor) => {
    const stats = vendorLedgerStats.statsMap?.[vendor.id];
    const balance = stats?.balancePayable || 0;
    if (balance === 0) {
      alert(`Vendor "${vendor.name}" already has ₹0.00 balance (Settled).`);
      return;
    }
    const balDisplay = balance > 0 ? `₹${balance.toLocaleString('en-IN')} (Due)` : `₹${Math.abs(balance).toLocaleString('en-IN')} (Advance/Negative)`;
    if (!window.confirm(`Settle and make balance ₹0 for "${vendor.name}"?\nCurrent balance is ${balDisplay}. This will clear past balance so nothing is due and balance becomes exactly ₹0.00.`)) return;
    await settleVendorBalance(vendor.id, balance, 'Settlement - Nothing is due (Amount zeroed)');
    if (addAuditLog) {
      addAuditLog({ action: 'Settle Vendor', details: `Settled balance of ${balDisplay} for vendor: ${vendor.name} to ₹0.` });
    }
    alert(`✅ "${vendor.name}" balance has been settled to ₹0.00!`);
  };

  const handleOpenVendorPayment = (vendor) => {
    setSelectedVendorForAction(vendor);
    setPaymentAmount('');
    setPaymentMode('UPI');
    setPaymentRefNo('');
    setPaymentNotes('');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setIsVendorPaymentModalOpen(true);
  };

  const handleSaveVendorPayment = async (e) => {
    e.preventDefault();
    if (!selectedVendorForAction || !paymentAmount || Number(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const amt = Number(paymentAmount);

    // Precise timestamp resolution:
    // If today, use current live ISO time so payment is ordered accurately.
    // If past date, set to end-of-day 23:59:59 so it is ordered AFTER orders of that date.
    let finalPaymentDate;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (paymentDate === todayStr) {
      finalPaymentDate = now.toISOString();
    } else {
      const d = new Date(paymentDate);
      d.setHours(23, 59, 59, 999);
      finalPaymentDate = d.toISOString();
    }

    const entry = {
      vendor_id: selectedVendorForAction.id,
      type: 'payment',
      date: finalPaymentDate,
      particulars: `Payment Made to ${selectedVendorForAction.name} via ${paymentMode}${paymentNotes ? ' (' + paymentNotes + ')' : ''}`,
      amount: amt,
      payment_mode: paymentMode,
      reference_no: paymentRefNo,
      notes: paymentNotes,
      status: 'active'
    };
    await addVendorLedgerEntry(entry);

    // Also auto-record into Expenses under goods_purchase
    await addExpense({
      date: paymentDate,
      category: 'goods_purchase',
      category_label: 'Vendor / Goods Payment',
      amount: amt,
      paid_to: selectedVendorForAction.name,
      payment_mode: paymentMode,
      reference_no: paymentRefNo,
      notes: `Vendor payment for ${selectedVendorForAction.name}: ${paymentNotes || 'Settlement'}`
    });

    if (addAuditLog) {
      addAuditLog({
        action: 'Vendor Payment',
        details: `Recorded payment of ₹${amt} to vendor ${selectedVendorForAction.name} via ${paymentMode}`
      });
    }
    setIsVendorPaymentModalOpen(false);
    alert(`✅ Payment of ₹${amt} to ${selectedVendorForAction.name} recorded successfully!`);
  };

  const handleOpenVendorBill = (vendor) => {
    setSelectedVendorForAction(vendor);
    setBillAmount('');
    setBillInvoiceNo('');
    setBillDate(new Date().toISOString().slice(0, 10));
    setBillNotes('');
    setIsVendorBillModalOpen(true);
  };

  const handleSaveVendorBill = async (e) => {
    e.preventDefault();
    if (!selectedVendorForAction || !billAmount || Number(billAmount) <= 0) {
      alert('Please enter a valid bill amount.');
      return;
    }
    const amt = Number(billAmount);

    let finalBillDate;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (billDate === todayStr) {
      finalBillDate = now.toISOString();
    } else {
      const d = new Date(billDate);
      d.setHours(12, 0, 0, 0);
      finalBillDate = d.toISOString();
    }

    const entry = {
      vendor_id: selectedVendorForAction.id,
      type: 'bill',
      date: finalBillDate,
      particulars: `Direct Purchase Bill #${billInvoiceNo || 'N/A'}${billNotes ? ' - ' + billNotes : ''}`,
      amount: amt,
      reference_no: billInvoiceNo,
      notes: billNotes,
      status: 'active'
    };
    await addVendorLedgerEntry(entry);
    if (addAuditLog) {
      addAuditLog({
        action: 'Vendor Direct Bill',
        details: `Recorded purchase bill of ₹${amt} from vendor ${selectedVendorForAction.name} (Invoice: ${billInvoiceNo || 'N/A'})`
      });
    }
    setIsVendorBillModalOpen(false);
    alert(`✅ Purchase bill of ₹${amt} from ${selectedVendorForAction.name} credited to ledger!`);
  };

  const handleOpenVendorStatement = (vendor) => {
    setSelectedVendorForStatement(vendor);
    setIsVendorStatementModalOpen(true);
  };

  // Expense Handlers
  const handleOpenExpenseModal = (exp = null) => {
    setEditingExpense(exp);
    if (exp) {
      setExpCategory(exp.category || 'delivery_fuel');
      setExpAmount(exp.amount || '');
      setExpPaidTo(exp.paid_to || '');
      setExpPaymentMode(exp.payment_mode || 'Cash');
      setExpDate(exp.date || new Date().toISOString().slice(0, 10));
      setExpRefNo(exp.reference_no || '');
      setExpNotes(exp.notes || '');
    } else {
      setExpCategory('delivery_fuel');
      setExpAmount('');
      setExpPaidTo('');
      setExpPaymentMode('Cash');
      setExpDate(new Date().toISOString().slice(0, 10));
      setExpRefNo('');
      setExpNotes('');
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }
    const catObj = EXPENSE_CATEGORIES.find(c => c.id === expCategory);
    const data = {
      date: expDate,
      category: expCategory,
      category_label: catObj?.label || 'General Expense',
      amount: Number(expAmount),
      paid_to: expPaidTo.trim(),
      payment_mode: expPaymentMode,
      reference_no: expRefNo.trim(),
      notes: expNotes.trim()
    };
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
      if (addAuditLog) addAuditLog({ action: 'Update Expense', details: `Updated expense: ₹${data.amount} for ${data.category_label}` });
    } else {
      await addExpense(data);
      if (addAuditLog) addAuditLog({ action: 'Record Expense', details: `Recorded new expense: ₹${data.amount} for ${data.category_label} (${data.paid_to})` });
    }
    setIsExpenseModalOpen(false);
  };

  const handleDeleteExpense = async (expId) => {
    const target = (expenses || []).find(e => e.id === expId);
    if (!window.confirm(`Delete expense record of ₹${target?.amount || 0}?`)) return;
    await deleteExpense(expId);
    if (addAuditLog) addAuditLog({ action: 'Delete Expense', details: `Deleted expense record: ₹${target?.amount}` });
  };

  // Other Incomes Handlers
  const handleOpenOtherIncomeModal = (inc = null) => {
    setEditingOtherIncome(inc);
    if (inc) {
      setIncCategory(inc.category || 'scrap_sale');
      setIncAmount(inc.amount || '');
      setIncSource(inc.source || '');
      setIncPaymentMode(inc.payment_mode || 'Cash');
      setIncDate(inc.date || new Date().toISOString().slice(0, 10));
      setIncNotes(inc.notes || '');
    } else {
      setIncCategory('scrap_sale');
      setIncAmount('');
      setIncSource('');
      setIncPaymentMode('Cash');
      setIncDate(new Date().toISOString().slice(0, 10));
      setIncNotes('');
    }
    setIsOtherIncomeModalOpen(true);
  };

  const handleSaveOtherIncome = async (e) => {
    e.preventDefault();
    if (!incAmount || Number(incAmount) <= 0) {
      alert('Please enter a valid income amount.');
      return;
    }
    const catObj = OTHER_INCOME_CATEGORIES.find(c => c.id === incCategory);
    const data = {
      date: incDate,
      category: incCategory,
      category_label: catObj?.label || 'Other Income',
      amount: Number(incAmount),
      source: incSource.trim(),
      payment_mode: incPaymentMode,
      notes: incNotes.trim()
    };
    if (editingOtherIncome) {
      await updateOtherIncome(editingOtherIncome.id, data);
      if (addAuditLog) addAuditLog({ action: 'Update Income', details: `Updated other income: ₹${data.amount} from ${data.source}` });
    } else {
      await addOtherIncome(data);
      if (addAuditLog) addAuditLog({ action: 'Record Income', details: `Recorded other income: ₹${data.amount} from ${data.source}` });
    }
    setIsOtherIncomeModalOpen(false);
  };

  const handleDeleteOtherIncome = async (incId) => {
    const target = (otherIncomes || []).find(i => i.id === incId);
    if (!window.confirm(`Delete income record of ₹${target?.amount || 0}?`)) return;
    await deleteOtherIncome(incId);
    if (addAuditLog) addAuditLog({ action: 'Delete Income', details: `Deleted income record: ₹${target?.amount}` });
  };

  // Aggregate customer stamp profiles and wallets from orders, customerUser, and wallets
  const stampCustomers = React.useMemo(() => {
    const map = new Map();

    if (customerUser?.phone) {
      const clean = String(customerUser.phone).replace(/\D/g, '').slice(-10);
      map.set(clean, {
        name: customerUser.name || 'Registered Customer',
        phone: customerUser.phone,
        cleanPhone: clean,
        email: customerUser.email || '',
        address: customerUser.addresses?.[0] || null,
        totalOrders: 0,
        totalSpend: 0,
        qualifyingOrders: [],
        orderIds: [],
        stamps: Number(customerUser.stamps) || 0,
        surpriseGifts: Number(customerUser.surpriseGifts) || 0,
        latestOrderDate: null
      });
    }

    orders.forEach(o => {
      const rawPhone = o.customer_phone || (o.address?.phone) || 'Customer';
      const clean = String(rawPhone).replace(/\D/g, '').slice(-10) || rawPhone;
      if (!map.has(clean)) {
        map.set(clean, {
          name: o.customer_name || 'Customer',
          phone: rawPhone,
          cleanPhone: clean,
          email: o.customer_email || '',
          address: o.address || null,
          totalOrders: 0,
          totalSpend: 0,
          qualifyingOrders: [],
          orderIds: [],
          stamps: 0,
          surpriseGifts: 0,
          latestOrderDate: null
        });
      }
      const c = map.get(clean);

      if (o.id && !c.orderIds.includes(String(o.id))) {
        c.orderIds.push(String(o.id));
      }

      const isCancelled = o.order_status === 'Cancelled' || o.order_status === 'Rejected';
      if (!isCancelled) {
        c.totalOrders += 1;
        c.totalSpend += Number(o.total) || 0;
        // Orders >= Rs 250 earn a stamp ONLY IF NOT CANCELLED
        if ((Number(o.total) || 0) >= 250 || o.earned_stamp) {
          c.qualifyingOrders.push(o);
        }
      }

      if (o.customer_name && (c.name === 'Customer' || c.name === 'Registered Customer')) {
        c.name = o.customer_name;
      }
      if (o.address && !c.address) c.address = o.address;
      if (!isCancelled && (!c.latestOrderDate || new Date(o.created_at) > new Date(c.latestOrderDate))) {
        c.latestOrderDate = o.created_at;
      }
    });

    // Also include any customer from wallets who might not have placed an order yet
    if (wallets && typeof wallets === 'object') {
      Object.keys(wallets).forEach(cleanPhone => {
        if (!map.has(cleanPhone) && cleanPhone && cleanPhone.length === 10) {
          map.set(cleanPhone, {
            name: `Customer (${cleanPhone})`,
            phone: cleanPhone,
            cleanPhone: cleanPhone,
            email: '',
            address: null,
            totalOrders: 0,
            totalSpend: 0,
            qualifyingOrders: [],
            orderIds: [],
            stamps: 0,
            surpriseGifts: 0,
            latestOrderDate: null
          });
        }
      });
    }

    return Array.from(map.values()).map(c => {
      // ONLY valid non-cancelled qualifying orders count
      const qualCount = c.qualifyingOrders.length;
      const activeStamps = qualCount % 10;
      const giftsEarned = Math.max(Math.floor(qualCount / 10), c.surpriseGifts);
      const isGiftEligible = qualCount >= 10 || giftsEarned > 0;
      const isFulfilled = !!giftFulfillments[c.phone]?.fulfilled || !!giftFulfillments[c.cleanPhone]?.fulfilled;
      const walletBalance = Number(wallets?.[c.cleanPhone]?.balance ?? 0);
      return {
        ...c,
        walletBalance,
        totalQualifying: qualCount,
        activeStamps,
        giftsEarned,
        isGiftEligible,
        isFulfilled
      };
    });
  }, [orders, customerUser, giftFulfillments, wallets, blockedCustomers]);

  const filteredStampCustomers = stampCustomers.filter(c => {
    const q = stampCustomerSearch.toLowerCase().trim();
    if (q) {
      const cleanQ = q.replace(/^#/, '');
      const addressStr = c.address ? `${c.address.line1 || ''} ${c.address.landmark || ''} ${c.address.city || ''}`.toLowerCase() : '';
      const matchesOrder = (c.orderIds || []).some(id => String(id).toLowerCase().includes(cleanQ));
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.cleanPhone.includes(q) ||
        addressStr.includes(q) ||
        matchesOrder;
      if (!matchesSearch) return false;
    }

    if (stampCustomerFilter === 'gift_eligible') {
      return c.isGiftEligible && !c.isFulfilled;
    }
    if (stampCustomerFilter === 'fulfilled') {
      return c.isFulfilled;
    }
    if (stampCustomerFilter === 'active') {
      return c.activeStamps > 0;
    }
    if (stampCustomerFilter === 'wallet') {
      return (c.walletBalance || 0) > 0;
    }
    if (stampCustomerFilter === 'blocked') {
      return isCustomerBlocked(c.phone);
    }
    return true;
  });

  const filteredOffers = (offers || []).filter(o => {
    const q = offerSearch.toLowerCase().trim();
    const matchesSearch = !q ||
      (o.title || '').toLowerCase().includes(q) ||
      (o.subtitle || '').toLowerCase().includes(q) ||
      (o.code || '').toLowerCase().includes(q) ||
      (o.discount_tag || '').toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (offerFilter === 'live') return o.active !== false;
    if (offerFilter === 'paused') return o.active === false;
    return true;
  });

  const filteredAuditLogs = (auditLogs || []).filter(l => {
    const q = auditSearch.toLowerCase().trim();
    const matchSearch = !q ||
      (l.user_name || '').toLowerCase().includes(q) ||
      (l.user_id || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q) ||
      (l.order_id || '').toLowerCase().includes(q);
    if (!matchSearch) return false;

    if (auditActionFilter === 'status') {
      return (l.action || '').toLowerCase().includes('status');
    }
    if (auditActionFilter === 'invoice') {
      return (l.action || '').toLowerCase().includes('receipt') || (l.action || '').toLowerCase().includes('invoice');
    }
    if (auditActionFilter === 'login') {
      return (l.action || '').toLowerCase().includes('login');
    }

    if (auditUserFilter !== 'all') {
      return (l.user_id || '').toLowerCase() === auditUserFilter.toLowerCase();
    }
    return true;
  });

  const handleToggleGiftFulfilled = async (customerPhone) => {
    const isCurrentlyFulfilled = !!giftFulfillments[customerPhone]?.fulfilled;
    const updated = { ...giftFulfillments };
    if (isCurrentlyFulfilled) {
      delete updated[customerPhone];
    } else {
      updated[customerPhone] = {
        fulfilled: true,
        dispatched_at: new Date().toISOString(),
        admin_remark: 'Surprise home gift dispatched'
      };
    }
    setGiftFulfillments(updated);
    try { localStorage.setItem('gk_gift_fulfillments', JSON.stringify(updated)); } catch {}
    await syncToFirebase('gift_fulfillments', updated);
  };

  const [lastUpdatedOrderId, setLastUpdatedOrderId] = useState(null);

  // Handle Order Status Change -> Syncs with Firebase RTDB in Real-Time
  const handleUpdateOrderStatus = async (orderId, newStatus, staffId = undefined, remark = null) => {
    const nowIso = new Date().toISOString();
    const targetOrder = orders.find(o => o.id === orderId);
    const oldStatus = targetOrder?.order_status || 'Unknown';

    const applyStatusUpdate = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          const isNowCancelled = newStatus === 'Cancelled';
          const currentTimeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
          currentTimeline.push({
            status: newStatus,
            time: nowIso,
            note: isNowCancelled
              ? (o.earned_stamp ? 'Order cancelled by store (Loyalty stamp revoked)' : 'Order cancelled by store')
              : `Order status updated to ${newStatus}`
          });
          const newAssignedStaffId = staffId !== undefined ? (staffId || '') : (o.assigned_staff_id || '');
          const newStaffObj = newAssignedStaffId ? staff.find(s => s.id === newAssignedStaffId) : null;
          const newStaffName = newStaffObj ? newStaffObj.name : (newAssignedStaffId ? (o.delivery_boy_name || '') : '');
          const newStaffPhone = newStaffObj ? newStaffObj.phone : (newAssignedStaffId ? (o.delivery_boy_phone || '') : '');

          return {
            ...o,
            order_status: newStatus,
            earned_stamp: isNowCancelled ? false : o.earned_stamp,
            cancel_reason: isNowCancelled ? (o.cancel_reason || 'Order cancelled by store') : o.cancel_reason,
            scratch_card: isNowCancelled && o.scratch_card ? {
              ...o.scratch_card,
              status: 'cancelled',
              isScratched: true,
              amount: 0,
              cancelled_note: 'Order was cancelled; cashback revoked'
            } : o.scratch_card,
            assigned_staff_id: newAssignedStaffId,
            assigned_partner_id: newAssignedStaffId,
            delivery_boy_id: newAssignedStaffId,
            delivery_boy_name: newStaffName,
            delivery_boy_phone: newStaffPhone,
            admin_remark: remark !== null ? remark : (isNowCancelled ? (o.admin_remark || 'Order cancelled by store') : o.admin_remark),
            updated_at: nowIso,
            timeline: currentTimeline
          };
        }
        return o;
      });

    // 1. Synchronously compute updated list and update local state immediately
    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyStatusUpdate(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    // If order is newly cancelled, restore product stock, auto-remove cashback, refund wallet and adjust customer profile stamps
    if (newStatus === 'Cancelled' && oldStatus !== 'Cancelled') {
      const orderPhone = (targetOrder?.customer_phone || targetOrder?.address?.phone || '').replace(/\D/g, '').slice(-10);
      const custPhone = (customerUser?.phone || '').replace(/\D/g, '').slice(-10);
      if (orderPhone && custPhone && orderPhone === custPhone) {
        setCustomerUser(prev => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            stamps: Math.max(0, (Number(prev.stamps) || 0) - (targetOrder?.earned_stamp ? 1 : 0))
          };
          try { localStorage.setItem('gk_customer_user', JSON.stringify(updated)); } catch {}
          return updated;
        });
      }

      // 1. AUTOMATIC CASHBACK REMOVAL:
      // If customer was credited cashback for this order, deduct it automatically from customer wallet
      if (revokeOrderCashback && targetOrder) {
        revokeOrderCashback(targetOrder, { by: activeStaffName || 'Admin' })
          .catch(err => console.warn('Auto cashback removal error:', err));
      }

      // 2. Auto-refund wallet balance if customer used wallet on this order
      if (Number(targetOrder?.wallet_used) > 0) {
        if (orderPhone && adjustCustomerWallet) {
          adjustCustomerWallet(orderPhone, targetOrder.wallet_used, {
            type: 'credit',
            reason: `Refund for Cancelled Order #${targetOrder.id}`,
            orderId: targetOrder.id,
            by: activeStaffName || 'Admin'
          }).catch(err => console.warn('Auto wallet refund error:', err));

          if (addAuditLog) {
            addAuditLog({
              action: 'Wallet Refund',
              details: `Auto-refunded ₹${targetOrder.wallet_used} to customer ${orderPhone} for cancelled order #${targetOrder.id}`,
              orderId: targetOrder.id
            });
          }
        }
      }

      if (Array.isArray(targetOrder?.items) && targetOrder.items.length > 0) {
        const restoredProducts = products.map(prod => {
          const matchedItem = targetOrder.items.find(it => it.product_id === prod.id && !it.is_custom);
          if (matchedItem) {
            return {
              ...prod,
              stock: (Number(prod.stock) || 0) + (Number(matchedItem.qty) || 0)
            };
          }
          return prod;
        });
        setProducts(restoredProducts);
        try { localStorage.setItem('gk_products', JSON.stringify(restoredProducts)); } catch {}
        if (restoredProducts.length >= 30) {
          syncToFirebase('products', restoredProducts);
        }
      }
    }

    setLastUpdatedOrderId(orderId);
    setTimeout(() => setLastUpdatedOrderId(null), 3000);

    if (addAuditLog) {
      addAuditLog({
        action: 'Update Order Status',
        details: `${isStaff ? `Staff ${activeStaffName} (${activeStaffUserId})` : 'Super Admin'} updated Order #${orderId} from "${oldStatus}" to "${newStatus}"`,
        orderId: orderId
      });
    }

    // 2. Fetch latest remote orders AND orders_inbox, merge with local orders so we never overwrite incoming orders
    try {
      const [res, inboxRes] = await Promise.all([
        fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null),
        fetch(`${FIREBASE_DB_URL}/orders_inbox.json?t=${Date.now()}`, { cache: 'no-store' }).catch(() => null)
      ]);

      const combinedMap = new Map();
      if (res && res.ok) {
        const remoteData = await res.json();
        const remoteList = normalizeFirebaseList(remoteData) || [];
        for (const ro of remoteList) {
          if (ro && ro.id) combinedMap.set(ro.id, ro);
        }
      }
      if (inboxRes && inboxRes.ok) {
        const inboxData = await inboxRes.json();
        const inboxList = normalizeFirebaseList(inboxData) || [];
        for (const io of inboxList) {
          if (io && io.id) combinedMap.set(io.id, io);
        }
      }
      for (const lo of updatedList) {
        if (lo && lo.id) {
          combinedMap.set(lo.id, lo);
        }
      }
      updatedList = applyStatusUpdate(Array.from(combinedMap.values()));
      updatedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setOrders(updatedList);
      try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}
    } catch {}

    window.__gkLastOrderWrite = Date.now();
    await syncToFirebase('orders', updatedList);

    // Direct slot update & clean processed order from orders_inbox
    const updatedOrderObj = updatedList.find(o => o.id === orderId);
    if (updatedOrderObj) {
      fetch(`${FIREBASE_DB_URL}/orders/${orderId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderObj)
      }).catch(() => {});
    }
    fetch(`${FIREBASE_DB_URL}/orders_inbox/${orderId}.json`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  // Handle Update / Save Admin Remark on Order -> Syncs with Firebase RTDB
  const [editingRemarkOrderId, setEditingRemarkOrderId] = useState(null);
  const [remarkInputText, setRemarkInputText] = useState({});
  const [remarkSavedId, setRemarkSavedId] = useState(null);

  const handleSaveOrderRemark = async (orderId) => {
    const text = (remarkInputText[orderId] || '').trim();
    const nowIso = new Date().toISOString();

    const applyRemarkUpdate = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          const currentTimeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
          currentTimeline.push({
            status: o.order_status,
            time: nowIso,
            note: text ? `Admin Remark: ${text}` : 'Remark updated'
          });
          return {
            ...o,
            admin_remark: text,
            updated_at: nowIso,
            timeline: currentTimeline
          };
        }
        return o;
      });

    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyRemarkUpdate(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    setRemarkSavedId(orderId);
    setTimeout(() => setRemarkSavedId(null), 2500);
    setEditingRemarkOrderId(null);

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        const remoteList = Array.isArray(remoteData)
          ? remoteData.filter(Boolean)
          : remoteData && typeof remoteData === 'object'
          ? Object.values(remoteData).filter(Boolean)
          : [];
        const combinedMap = new Map();
        for (const ro of remoteList) {
          if (ro && ro.id) combinedMap.set(ro.id, ro);
        }
        for (const lo of updatedList) {
          if (lo && lo.id && !combinedMap.has(lo.id)) {
            combinedMap.set(lo.id, lo);
          }
        }
        updatedList = applyRemarkUpdate(Array.from(combinedMap.values()));
        updatedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setOrders(updatedList);
        try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}
      }
    } catch {}

    window.__gkLastOrderWrite = Date.now();
    await syncToFirebase('orders', updatedList);
  };

  // Handle Edit Order Vendor Details (Manually fill or select vendor)
  const handleOpenEditOrderVendor = (order) => {
    setEditingOrderForVendor(order);
    const existingVendorId = order.vendor_id || '';
    const matchedVendor = (vendors || []).find(v => v.id === existingVendorId);
    setOrderVendorId(existingVendorId);
    setOrderVendorName(order.vendor_name || matchedVendor?.name || '');
    setOrderVendorNotes(order.vendor_notes || '');
    setOrderSyncToLedger(true);

    // Calculate wholesale purchase cost
    let totalCost = 0;
    (order.items || []).forEach(it => {
      const prod = (products || []).find(p => p && (p.id === it.product_id || p.name === it.name));
      let uCost = Number(it.purchase_price) || Number(prod?.purchase_price) || Math.round((Number(it.price) || 0) * 0.75);
      totalCost += uCost * (Number(it.qty) || 1);
    });
    setOrderWholesaleCost(totalCost);

    // Map items vendor
    const itemMap = {};
    (order.items || []).forEach((it, idx) => {
      itemMap[idx] = it.vendor_name || it.vendor_id || order.vendor_name || '';
    });
    setOrderItemsVendorMap(itemMap);

    setIsEditOrderVendorModalOpen(true);
  };

  const handleSaveOrderVendor = async (e) => {
    e.preventDefault();
    if (!editingOrderForVendor) return;
    const orderId = editingOrderForVendor.id;
    const finalVendorName = orderVendorName.trim();
    let finalVendorId = orderVendorId === 'custom' ? '' : orderVendorId;

    if (!finalVendorId && finalVendorName) {
      const match = (vendors || []).find(v =>
        v.name?.toLowerCase() === finalVendorName.toLowerCase() ||
        v.company_name?.toLowerCase() === finalVendorName.toLowerCase()
      );
      if (match) finalVendorId = match.id;
    }

    const nowIso = new Date().toISOString();

    const applyOrderVendorUpdate = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          const currentTimeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
          currentTimeline.push({
            status: o.order_status,
            time: nowIso,
            note: finalVendorName ? `Vendor assigned: ${finalVendorName}` : 'Vendor details updated'
          });

          const updatedItems = (o.items || []).map((it, idx) => ({
            ...it,
            vendor_name: orderItemsVendorMap[idx] || finalVendorName || it.vendor_name || '',
            vendor_id: finalVendorId || it.vendor_id || null
          }));

          return {
            ...o,
            vendor_id: finalVendorId || null,
            vendor_name: finalVendorName || null,
            vendor_notes: orderVendorNotes.trim() || null,
            items: updatedItems,
            updated_at: nowIso,
            timeline: currentTimeline
          };
        }
        return o;
      });

    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyOrderVendorUpdate(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    // Optionally post entry to Vendor Ledger if checked
    if (orderSyncToLedger && finalVendorId && Number(orderWholesaleCost) > 0) {
      const billedItems = (editingOrderForVendor.items || []).map(it => ({
        name: it.name || it.title || 'Product',
        qty: Number(it.quantity || it.qty || 1),
        unit: it.unit || '',
        unit_cost: Number(it.wholesale_price || it.purchase_price || it.price || 0),
        total_cost: Number(it.wholesale_price || it.purchase_price || it.price || 0) * Number(it.quantity || it.qty || 1)
      }));
      const entry = {
        vendor_id: finalVendorId,
        order_id: orderId,
        type: 'purchase',
        date: editingOrderForVendor.created_at || nowIso,
        particulars: `Order #${orderId} - Supplier: ${finalVendorName || 'Vendor'}`,
        amount: Number(orderWholesaleCost),
        items: billedItems,
        reference_no: `ORD-${orderId}`,
        notes: orderVendorNotes || `Manually assigned to ${finalVendorName}`,
        status: 'active'
      };
      await addVendorLedgerEntry(entry);
    }

    if (addAuditLog) {
      addAuditLog({
        action: 'Assign Order Vendor',
        details: `Assigned vendor "${finalVendorName || 'None'}" to Order #${orderId}${orderSyncToLedger ? ` and credited ₹${orderWholesaleCost} to ledger` : ''}`,
        orderId: orderId
      });
    }

    setIsEditOrderVendorModalOpen(false);

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        const remoteList = Array.isArray(remoteData)
          ? remoteData.filter(Boolean)
          : remoteData && typeof remoteData === 'object'
          ? Object.values(remoteData).filter(Boolean)
          : [];
        const combinedMap = new Map();
        for (const ro of remoteList) {
          if (ro && ro.id) combinedMap.set(ro.id, ro);
        }
        for (const lo of updatedList) {
          if (lo && lo.id && !combinedMap.has(lo.id)) {
            combinedMap.set(lo.id, lo);
          }
        }
        updatedList = applyOrderVendorUpdate(Array.from(combinedMap.values()));
        updatedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setOrders(updatedList);
        try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}
      }
    } catch {}

    window.__gkLastOrderWrite = Date.now();
    await syncToFirebase('orders', updatedList);
    alert(`✅ Vendor "${finalVendorName || 'Cleared'}" saved for Order #${orderId}!`);
  };

  const handleQuickAssignVendor = async (orderId, vendorId) => {
    const matchedVendor = (vendors || []).find(v => v.id === vendorId);
    const vendorName = matchedVendor ? matchedVendor.name : '';
    const nowIso = new Date().toISOString();

    const applyQuickVendor = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            vendor_id: vendorId || null,
            vendor_name: vendorName || null,
            updated_at: nowIso
          };
        }
        return o;
      });

    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyQuickVendor(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    if (addAuditLog) {
      addAuditLog({
        action: 'Quick Assign Vendor',
        details: vendorName ? `Quick assigned vendor "${vendorName}" to Order #${orderId}` : `Cleared vendor from Order #${orderId}`,
        orderId: orderId
      });
    }

    await syncToFirebase('orders', updatedList);
  };

  // =========================================================================
  // ITEM-LEVEL VENDOR ASSIGNMENT HANDLERS
  // =========================================================================
  const handleOpenItemVendorModal = (order, itemIdx, item) => {
    setEditingItemVendorOrder(order);
    setEditingItemVendorIndex(itemIdx);
    setEditingItemVendorItem(item);

    const existingVendorId = item.vendor_id || order.vendor_id || '';
    const matchedVendor = (vendors || []).find(v => v.id === existingVendorId);
    setItemVendorId(existingVendorId);
    setItemVendorName(item.vendor_name || matchedVendor?.name || order.vendor_name || '');

    const prod = (products || []).find(p => p && (p.id === item.product_id || p.name === item.name));
    const uCost = Number(item.purchase_price) || Number(prod?.purchase_price) || Math.round((Number(item.price) || 0) * 0.75);
    setItemWholesaleCost(uCost * (Number(item.qty) || 1));
    setItemVendorSyncToLedger(true);
    setItemVendorApplyToAll(false);
    setItemVendorNotes('');
    setIsItemVendorModalOpen(true);
  };

  const handleSaveItemVendor = async (e) => {
    e.preventDefault();
    if (!editingItemVendorOrder || editingItemVendorIndex === null || !editingItemVendorItem) return;

    const orderId = editingItemVendorOrder.id;
    const finalVendorName = itemVendorName.trim();
    let finalVendorId = itemVendorId === 'custom' ? '' : itemVendorId;

    if (!finalVendorId && finalVendorName) {
      const match = (vendors || []).find(v =>
        v.name?.toLowerCase() === finalVendorName.toLowerCase() ||
        v.company_name?.toLowerCase() === finalVendorName.toLowerCase()
      );
      if (match) finalVendorId = match.id;
    }

    const nowIso = new Date().toISOString();

    const applyItemVendorUpdate = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          const currentTimeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
          currentTimeline.push({
            status: o.order_status,
            time: nowIso,
            note: finalVendorName
              ? `Item "${editingItemVendorItem.name}" vendor set to: ${finalVendorName}`
              : `Item "${editingItemVendorItem.name}" vendor cleared`
          });

          const updatedItems = (o.items || []).map((it, idx) => {
            if (itemVendorApplyToAll || idx === editingItemVendorIndex) {
              return {
                ...it,
                vendor_name: finalVendorName || null,
                vendor_id: finalVendorId || null
              };
            }
            return it;
          });

          return {
            ...o,
            vendor_id: itemVendorApplyToAll ? (finalVendorId || o.vendor_id || null) : (o.vendor_id || finalVendorId || null),
            vendor_name: itemVendorApplyToAll ? (finalVendorName || o.vendor_name || null) : (o.vendor_name || finalVendorName || null),
            items: updatedItems,
            updated_at: nowIso,
            timeline: currentTimeline
          };
        }
        return o;
      });

    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyItemVendorUpdate(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    // Post to Vendor Ledger if checked
    if (itemVendorSyncToLedger && finalVendorId && Number(itemWholesaleCost) > 0) {
      const entry = {
        vendor_id: finalVendorId,
        order_id: orderId,
        type: 'purchase',
        date: editingItemVendorOrder.created_at || nowIso,
        particulars: `Order #${orderId} - Item: ${editingItemVendorItem.name} (${editingItemVendorItem.qty}x)`,
        amount: Number(itemWholesaleCost),
        items: [{
          name: editingItemVendorItem.name,
          qty: Number(editingItemVendorItem.qty || 1),
          unit: editingItemVendorItem.unit || '',
          unit_cost: Number(itemWholesaleCost) / Math.max(1, Number(editingItemVendorItem.qty || 1)),
          total_cost: Number(itemWholesaleCost)
        }],
        reference_no: `ORD-${orderId}-ITM${editingItemVendorIndex + 1}`,
        notes: itemVendorNotes || `Vendor assigned for ${editingItemVendorItem.name}`,
        status: 'active'
      };
      await addVendorLedgerEntry(entry);
    }

    if (addAuditLog) {
      addAuditLog({
        action: 'Assign Item Vendor',
        details: `Assigned vendor "${finalVendorName || 'None'}" to item "${editingItemVendorItem.name}" in Order #${orderId}${itemVendorSyncToLedger ? ` and credited ₹${itemWholesaleCost} to ledger` : ''}`,
        orderId: orderId
      });
    }

    setIsItemVendorModalOpen(false);

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        const remoteList = Array.isArray(remoteData)
          ? remoteData.filter(Boolean)
          : remoteData && typeof remoteData === 'object'
          ? Object.values(remoteData).filter(Boolean)
          : [];
        const combinedMap = new Map();
        for (const ro of remoteList) {
          if (ro && ro.id) combinedMap.set(ro.id, ro);
        }
        for (const lo of updatedList) {
          if (lo && lo.id && !combinedMap.has(lo.id)) {
            combinedMap.set(lo.id, lo);
          }
        }
        updatedList = applyItemVendorUpdate(Array.from(combinedMap.values()));
        updatedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setOrders(updatedList);
        try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}
      }
    } catch {}

    window.__gkLastOrderWrite = Date.now();
    await syncToFirebase('orders', updatedList);

    const updatedOrderObj = updatedList.find(o => o.id === orderId);
    if (updatedOrderObj) {
      fetch(`${FIREBASE_DB_URL}/orders/${orderId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderObj)
      }).catch(() => {});
    }
  };

  // =========================================================================
  // FULL EDIT ORDER HANDLERS (Customer, Address, Items, Quantities, Vendor, Status)
  // =========================================================================
  const handleOpenFullEditOrderModal = (order) => {
    setEditingFullOrder({
      ...order,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      delivery_address: order.address?.line1 || '',
      landmark: order.address?.landmark || '',
      pincode: order.address?.pincode || '202138',
      city: order.address?.city || 'Khair',
      delivery_slot: order.delivery_slot || 'ASAP (25-35 mins)',
      order_status: order.order_status || 'Pending',
      payment_method: order.payment_method || 'UPI',
      payment_status: order.payment_status || 'Paid',
      admin_remark: order.admin_remark || '',
      vendor_id: order.vendor_id || '',
      vendor_name: order.vendor_name || ''
    });

    setEditOrderItems(
      Array.isArray(order.items)
        ? order.items.map(it => ({
            ...it,
            qty: Number(it.qty) || 1,
            price: Number(it.price) || 0,
            unit: it.unit || '1 unit',
            vendor_name: it.vendor_name || '',
            vendor_id: it.vendor_id || ''
          }))
        : []
    );

    setEditOrderCatalogSearch('');
    setEditOrderCustomItemName('');
    setEditOrderCustomItemQty(1);
    setEditOrderCustomItemPrice('');
    setEditOrderCustomItemUnit('1 unit');
    setEditOrderCustomItemVendor('');
    setIsFullEditOrderModalOpen(true);
  };

  const handleUpdateEditOrderItemQty = (idx, newQty) => {
    if (newQty <= 0) {
      handleRemoveEditOrderItem(idx);
      return;
    }
    setEditOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: newQty } : item));
  };

  const handleUpdateEditOrderItemPrice = (idx, newPrice) => {
    setEditOrderItems(prev => prev.map((item, i) => i === idx ? { ...item, price: Number(newPrice) || 0 } : item));
  };

  const handleUpdateEditOrderItemVendor = (idx, vendorVal) => {
    setEditOrderItems(prev => prev.map((item, i) => {
      if (i === idx) {
        const matched = (vendors || []).find(v => v.id === vendorVal || v.name === vendorVal);
        return {
          ...item,
          vendor_id: matched ? matched.id : (vendorVal === '' ? null : item.vendor_id),
          vendor_name: matched ? matched.name : (vendorVal || null)
        };
      }
      return item;
    }));
  };

  const handleRemoveEditOrderItem = (idx) => {
    setEditOrderItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddProductToEditOrder = (product) => {
    if (!product) return;
    const existingIdx = editOrderItems.findIndex(it => (it.product_id && it.product_id === product.id) || it.name === product.name);
    if (existingIdx >= 0) {
      handleUpdateEditOrderItemQty(existingIdx, (Number(editOrderItems[existingIdx].qty) || 1) + 1);
    } else {
      const primaryVariant = Array.isArray(product.variants) && product.variants.length > 0 ? product.variants[0] : null;
      const price = Number(primaryVariant?.price ?? product.price ?? 0);
      const unit = primaryVariant?.unit || product.unit || '1 unit';
      const purchase_price = Number(primaryVariant?.purchase_price ?? product.purchase_price ?? 0);

      setEditOrderItems(prev => [
        ...prev,
        {
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          product_id: product.id,
          name: product.name,
          price: price,
          unit: unit,
          qty: 1,
          purchase_price: purchase_price,
          vendor_name: editingFullOrder?.vendor_name || '',
          vendor_id: editingFullOrder?.vendor_id || ''
        }
      ]);
    }
    setEditOrderCatalogSearch('');
  };

  const handleAddCustomItemToEditOrder = () => {
    if (!editOrderCustomItemName.trim()) return;
    const price = Number(editOrderCustomItemPrice) || 0;
    const qty = Number(editOrderCustomItemQty) || 1;
    setEditOrderItems(prev => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        name: editOrderCustomItemName.trim(),
        price: price,
        qty: qty,
        unit: editOrderCustomItemUnit.trim() || '1 unit',
        vendor_name: editOrderCustomItemVendor.trim() || editingFullOrder?.vendor_name || '',
        vendor_id: editingFullOrder?.vendor_id || ''
      }
    ]);
    setEditOrderCustomItemName('');
    setEditOrderCustomItemPrice('');
    setEditOrderCustomItemQty(1);
    setEditOrderCustomItemUnit('1 unit');
    setEditOrderCustomItemVendor('');
  };

  const handleSaveFullOrder = async (e) => {
    e.preventDefault();
    if (!editingFullOrder) return;
    if (editOrderItems.length === 0) {
      alert('Order must contain at least one item.');
      return;
    }

    const orderId = editingFullOrder.id;
    const nowIso = new Date().toISOString();

    const itemsSubtotal = editOrderItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    const deliveryFee = Number(editingFullOrder.delivery_fee) || 0;
    const discount = Number(editingFullOrder.discount) || 0;
    const grandTotal = Math.max(0, itemsSubtotal + deliveryFee - discount);

    const applyOrderFullUpdate = (list) =>
      (list || []).map(o => {
        if (o.id === orderId) {
          const currentTimeline = Array.isArray(o.timeline) ? [...o.timeline] : [];
          currentTimeline.push({
            status: editingFullOrder.order_status,
            time: nowIso,
            note: 'Order details & items edited by Admin'
          });

          return {
            ...o,
            customer_name: (editingFullOrder.customer_name || '').trim() || o.customer_name,
            customer_phone: (editingFullOrder.customer_phone || '').trim() || o.customer_phone,
            address: {
              ...(o.address || {}),
              line1: (editingFullOrder.delivery_address || '').trim() || o.address?.line1,
              landmark: (editingFullOrder.landmark || '').trim() || o.address?.landmark,
              pincode: (editingFullOrder.pincode || '').trim() || o.address?.pincode,
              city: (editingFullOrder.city || '').trim() || o.address?.city
            },
            delivery_slot: editingFullOrder.delivery_slot,
            order_status: editingFullOrder.order_status,
            payment_method: editingFullOrder.payment_method,
            payment_status: editingFullOrder.payment_status,
            admin_remark: (editingFullOrder.admin_remark || '').trim(),
            vendor_id: editingFullOrder.vendor_id || null,
            vendor_name: editingFullOrder.vendor_name || null,
            items: editOrderItems,
            subtotal: itemsSubtotal,
            total: grandTotal,
            updated_at: nowIso,
            timeline: currentTimeline
          };
        }
        return o;
      });

    window.__gkLastOrderWrite = Date.now();
    let updatedList = applyOrderFullUpdate(orders);
    setOrders(updatedList);
    try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}

    if (addAuditLog) {
      addAuditLog({
        action: 'Edit Order Details',
        details: `Edited Order #${orderId} (${editingFullOrder.customer_name}): Total ₹${grandTotal}, ${editOrderItems.length} items, Status: ${editingFullOrder.order_status}`,
        orderId: orderId
      });
    }

    setIsFullEditOrderModalOpen(false);

    try {
      const res = await fetch(`${FIREBASE_DB_URL}/orders.json?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const remoteData = await res.json();
        const remoteList = Array.isArray(remoteData)
          ? remoteData.filter(Boolean)
          : remoteData && typeof remoteData === 'object'
          ? Object.values(remoteData).filter(Boolean)
          : [];
        const combinedMap = new Map();
        for (const ro of remoteList) {
          if (ro && ro.id) combinedMap.set(ro.id, ro);
        }
        for (const lo of updatedList) {
          if (lo && lo.id && !combinedMap.has(lo.id)) {
            combinedMap.set(lo.id, lo);
          }
        }
        updatedList = applyOrderFullUpdate(Array.from(combinedMap.values()));
        updatedList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        setOrders(updatedList);
        try { localStorage.setItem('gk_orders', JSON.stringify(updatedList)); } catch {}
      }
    } catch {}

    window.__gkLastOrderWrite = Date.now();
    await syncToFirebase('orders', updatedList);

    const updatedOrderObj = updatedList.find(o => o.id === orderId);
    if (updatedOrderObj) {
      fetch(`${FIREBASE_DB_URL}/orders/${orderId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedOrderObj)
      }).catch(() => {});
    }

    alert(`✅ Order #${orderId} successfully updated!`);
  };

  // Handle Save Company & Delivery Settings -> Syncs with Firebase RTDB
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const payload = {
      ...settings,
      store_name: storeName,
      store_tagline: storeTagline,
      store_address: storeAddress,
      store_logo: storeLogo,
      support_phone: supportPhone,
      support_email: supportEmail,
      receipt_footer_msg: receiptFooterMsg,
      upi_id: upiId,
      upi_merchant_name: upiMerchantName,
      razorpay_key_id: razorpayKeyId,
      store_lat: Number(storeLat),
      store_lng: Number(storeLng),
      max_radius_km: Number(maxRadiusKm),
      fee_slabs: slabs,
      delivery_hours: {
        open: openingTime,
        close: closingTime,
        is_open: storeIsOpen,
        closed_message: closedNotice,
        days_open: daysOpen
      }
    };

    setSettings(payload);
    try { localStorage.setItem('gk_settings', JSON.stringify(payload)); } catch {}
    setSettingsSavedNotice(true);
    setTimeout(() => setSettingsSavedNotice(false), 3000);

    await syncToFirebase('settings', payload);
  };

  // Quick 1-Click Store Open / Close Toggle -> Syncs with Firebase RTDB
  const handleQuickToggleStoreOpen = async () => {
    const nextState = !storeIsOpen;
    setStoreIsOpen(nextState);
    const updatedSettings = {
      ...settings,
      delivery_hours: {
        ...(settings?.delivery_hours || {}),
        open: openingTime,
        close: closingTime,
        is_open: nextState,
        closed_message: closedNotice,
        days_open: daysOpen
      }
    };
    setSettings(updatedSettings);
    try { localStorage.setItem('gk_settings', JSON.stringify(updatedSettings)); } catch {}
    await syncToFirebase('settings', updatedSettings);
  };

  // Save Cashback Offer & Customer Wallet Usage Configuration -> Syncs to Firebase RTDB
  const handleSaveCashbackSettings = async (overrides = {}) => {
    setIsSavingCashbackSettings(true);
    const updatedSettings = {
      ...settings,
      cashback_active: overrides.cashback_active !== undefined ? overrides.cashback_active : cashbackActive,
      cashback_percentage: Number(overrides.cashback_percentage !== undefined ? overrides.cashback_percentage : cashbackPercentage),
      cashback_min_order: Number(overrides.cashback_min_order !== undefined ? overrides.cashback_min_order : cashbackMinOrder),
      cashback_max_per_order: Number(overrides.cashback_max_per_order !== undefined ? overrides.cashback_max_per_order : cashbackMaxPerOrder),
      wallet_redemption_active: overrides.wallet_redemption_active !== undefined ? overrides.wallet_redemption_active : walletRedemptionActive,
      wallet_max_use_percent: Number(overrides.wallet_max_use_percent !== undefined ? overrides.wallet_max_use_percent : walletMaxUsePercent),
      wallet_max_use_amount: Number(overrides.wallet_max_use_amount !== undefined ? overrides.wallet_max_use_amount : walletMaxUseAmount),
      wallet_min_order_for_use: Number(overrides.wallet_min_order_for_use !== undefined ? overrides.wallet_min_order_for_use : walletMinOrderForUse)
    };
    setSettings(updatedSettings);
    try { localStorage.setItem('gk_settings', JSON.stringify(updatedSettings)); } catch {}
    await syncToFirebase('settings', updatedSettings);
    setIsSavingCashbackSettings(false);
    setCashbackSettingsSavedMsg('✅ Cashback & Customer Wallet rules saved and live!');
    setTimeout(() => setCashbackSettingsSavedMsg(''), 4000);
  };

  const handleToggleCashbackActive = async () => {
    const nextVal = !cashbackActive;
    setCashbackActive(nextVal);
    await handleSaveCashbackSettings({ cashback_active: nextVal });
  };

  const handleToggleWalletActive = async () => {
    const nextVal = !walletRedemptionActive;
    setWalletRedemptionActive(nextVal);
    await handleSaveCashbackSettings({ wallet_redemption_active: nextVal });
  };

  // Image Helper: Automatically resize & compress to crisp ~20KB JPEG so Firebase RTDB stays fast
  const fileToDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawUrl = ev.target.result;
        const img = new window.Image();
        img.onload = () => {
          try {
            const maxDim = 360;
            let w = img.width || 360;
            let h = img.height || 360;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL('image/jpeg', 0.74);
            resolve(compressed);
          } catch {
            resolve(rawUrl);
          }
        };
        img.onerror = () => resolve(rawUrl);
        img.src = rawUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCategoryImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Selected image exceeds 10MB limit.');
      return;
    }
    setIsUploadingCategoryImage(true);
    const base64Data = await fileToDataUrl(file);
    setCategoryImagePreview(base64Data);
    setIsUploadingCategoryImage(false);
  };

  const handleStoreLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Selected image exceeds 10MB limit.');
      return;
    }
    setIsUploadingStoreLogo(true);
    const base64Data = await fileToDataUrl(file);
    setStoreLogo(base64Data);
    setIsUploadingStoreLogo(false);
  };

  const handleMultipleImageFilesChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (productImages.length + files.length > 8) {
      alert('You can upload up to 8 images per product.');
    }

    const availableSlots = Math.max(0, 8 - productImages.length);
    const filesToUpload = files.slice(0, availableSlots);

    setIsUploadingImage(true);
    for (const file of filesToUpload) {
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 10MB limit.`);
        continue;
      }
      const base64Data = await fileToDataUrl(file);
      setProductImages(prev => [...prev, base64Data]);
    }
    setIsUploadingImage(false);
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    if (productImages.length >= 8) {
      alert('Maximum 8 images allowed per product.');
      return;
    }
    setProductImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleSetMainImage = (index) => {
    setProductImages(prev => {
      const copy = [...prev];
      const [selected] = copy.splice(index, 1);
      return [selected, ...copy];
    });
  };

  const handleRemoveProductImage = (index) => {
    setProductImages(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle Save Product -> Syncs with Firebase RTDB
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const defaultPlaceholder = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80';
    const primaryImage = productImages[0] || formData.get('image') || defaultPlaceholder;
    const finalImagesList = productImages.length ? productImages : [primaryImage];

    const rawUnit = String(productUnitInput || formData.get('unit') || '').trim();
    const rawCost = Number(productCostInput || formData.get('purchase_price')) || 0;
    const rawPrice = Number(productPriceInput || formData.get('price')) || 0;
    const rawMrp = Number(productMrpInput || formData.get('mrp') || rawPrice) || rawPrice;
    const rawStock = productStockInput !== '' && productStockInput !== undefined
      ? Number(productStockInput)
      : (Number(formData.get('stock')) || 50);

    const hasPrimary = rawUnit !== '' && rawUnit !== '0' && rawPrice > 0;

    // Clean and validate weight/price variants from Section 2
    let cleanedVariants = (productVariants || [])
      .filter(v => {
        const u = String(v?.unit || '').trim();
        return u !== '' && u !== '0' && (Number(v?.price) || 0) > 0;
      })
      .map((v, idx) => {
        const vPrice = Number(v.price) || 0;
        const vMrp = Number(v.mrp) || vPrice;
        const vCost = Number(v.purchase_price) || 0;
        const vStock = v.stock !== undefined && v.stock !== '' ? Number(v.stock) : rawStock;
        return {
          id: v.id || `var-${Date.now()}-${idx}`,
          unit: String(v.unit).trim(),
          purchase_price: vCost,
          price: vPrice,
          mrp: vMrp,
          stock: vStock
        };
      });

    if (!hasPrimary && cleanedVariants.length === 0) {
      alert('Please enter Weight & Price in either "1. Primary / Default Weight & Price" OR "2. Multiple Weight & Price Categories".');
      return;
    }

    if (hasPrimary) {
      const primaryVariant = {
        id: `var-primary-${Date.now()}`,
        unit: rawUnit,
        purchase_price: rawCost,
        price: rawPrice,
        mrp: rawMrp,
        stock: rawStock
      };
      if (cleanedVariants.length === 0) {
        cleanedVariants = [primaryVariant];
      } else {
        const existingIdx = cleanedVariants.findIndex(
          v => v.unit.toLowerCase() === rawUnit.toLowerCase()
        );
        if (existingIdx >= 0) {
          cleanedVariants[existingIdx] = {
            ...cleanedVariants[existingIdx],
            unit: rawUnit,
            purchase_price: rawCost || cleanedVariants[existingIdx].purchase_price,
            price: rawPrice,
            mrp: rawMrp,
            stock: rawStock
          };
        } else {
          cleanedVariants = [primaryVariant, ...cleanedVariants];
        }
      }
    }

    const firstVar = cleanedVariants[0];
    const finalUnit = hasPrimary ? rawUnit : firstVar.unit;
    const finalCost = hasPrimary ? rawCost : (Number(firstVar.purchase_price) || 0);
    const finalPrice = hasPrimary ? rawPrice : (Number(firstVar.price) || 0);
    const finalMrp = hasPrimary ? rawMrp : (Number(firstVar.mrp) || finalPrice);
    const finalStock = hasPrimary ? rawStock : (Number(firstVar.stock) || rawStock || 50);

    const prodData = {
      id: editingProduct?.id || `prod-${Date.now()}`,
      name: (formData.get('name') || 'Product').trim(),
      vendor_id: formData.get('vendor_id') || editingProduct?.vendor_id || '',
      category_id: formData.get('category_id') || (categories[0]?.id || 'cat-1'),
      subcategory: (formData.get('subcategory') || '').trim(),
      brand: (formData.get('brand') || 'GhartakKart').trim(),
      unit: finalUnit,
      purchase_price: finalCost,
      price: finalPrice,
      mrp: finalMrp,
      stock: finalStock,
      variants: cleanedVariants,
      veg_flag: formData.get('veg_flag') === 'true',
      prep_time_mins: formData.get('prep_time_mins') ? Number(formData.get('prep_time_mins')) : null,
      gst_rate: Number(formData.get('gst_rate') || 5),
      fssai: formData.get('fssai') || settings?.fssai_license || '',
      hsn_code: formData.get('hsn_code') || '',
      description: formData.get('description') || '',
      image: primaryImage,
      images: finalImagesList,
      active: true
    };

    let nextProducts = [];
    if (editingProduct) {
      nextProducts = products.map(p => p.id === editingProduct.id ? { ...p, ...prodData } : p);
    } else {
      nextProducts = [prodData, ...products];
    }

    setProducts(nextProducts);
    try { localStorage.setItem('gk_products', JSON.stringify(nextProducts)); } catch {}

    setIsProductModalOpen(false);
    setEditingProduct(null);
    setProductImages([]);
    setNewImageUrl('');

    await syncToFirebase('products', nextProducts);
  };

  // Handle Delete Product -> Syncs with Firebase RTDB
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Delete this product from catalog?')) return;
    const nextProducts = products.filter(p => p.id !== id);
    setProducts(nextProducts);
    try { localStorage.setItem('gk_products', JSON.stringify(nextProducts)); } catch {}
    await syncToFirebase('products', nextProducts);
  };

  // Handle Save Category -> Syncs with Firebase RTDB
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const catImage = categoryImagePreview || formData.get('image') || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=500&q=80';
    const catData = {
      id: editingCategory?.id || `cat-${Date.now()}`,
      name: formData.get('name') || 'New Category',
      image: catImage,
      max_radius_km: formData.get('max_radius_km') ? Number(formData.get('max_radius_km')) : null,
      subcategories: (formData.get('subcategories') || '').split(',').map(s => s.trim()).filter(Boolean)
    };

    let nextCategories = [];
    if (editingCategory) {
      nextCategories = categories.map(c => c.id === editingCategory.id ? { ...c, ...catData } : c);
    } else {
      nextCategories = [...categories, catData];
    }

    setCategories(nextCategories);
    try { localStorage.setItem('gk_categories', JSON.stringify(nextCategories)); } catch {}

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCategoryImagePreview('');

    await syncToFirebase('categories', nextCategories);
  };

  // Handle Add Staff -> Syncs with Firebase RTDB
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffName || !newStaffPhone) return;
    const cleanPhone = newStaffPhone.replace(/\D/g, '').slice(-10);
    const riderId = `staff-${Date.now()}`;
    const newRider = {
      id: riderId,
      name: newStaffName.trim(),
      phone: cleanPhone,
      vehicle: newStaffVehicle.trim() || 'Bike',
      username: (newStaffUsername.trim() || cleanPhone).toLowerCase(),
      password: newStaffPassword.trim() || '123456',
      shift: newStaffShift || 'Morning Shift (07:00 AM - 12:00 PM)',
      active: true,
      kyc_status: 'verified'
    };
    const nextStaff = [...staff, newRider];
    setStaff(nextStaff);
    try { localStorage.setItem('gk_staff', JSON.stringify(nextStaff)); } catch {}

    setIsStaffModalOpen(false);
    setNewStaffName('');
    setNewStaffPhone('');
    setNewStaffUsername('');
    setNewStaffPassword('');
    setNewStaffShift('Morning Shift (07:00 AM - 12:00 PM)');

    await syncToFirebase('staff', nextStaff);
    fetch(`${FIREBASE_DB_URL}/delivery_partners/${riderId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRider)
    }).catch(() => {});
  };

  // Handle Add Shift Slot (Admin Only)
  const handleAddShift = async (e) => {
    e.preventDefault();
    if (!newShiftName) return;
    const newShiftObj = {
      id: `shift-${Date.now()}`,
      name: newShiftName.trim(),
      time: newShiftTime.trim() || '08:00 AM - 02:00 PM',
      zone: newShiftZone.trim() || 'Khair Operational Zone',
      surge: newShiftSurge.trim() || '1.0x'
    };
    const nextShifts = [...storeShifts, newShiftObj];
    setStoreShifts(nextShifts);
    try { localStorage.setItem('gk_store_shifts', JSON.stringify(nextShifts)); } catch {}
    setIsShiftModalOpen(false);
    setNewShiftName('');
    await syncToFirebase('store_shifts', nextShifts);
  };

  // Open Edit Rider Credentials & Shift
  const handleOpenEditRider = (rider) => {
    setEditingRiderCredentials(rider);
    setEditRiderId(rider.username || rider.phone || '');
    setEditRiderPassword(rider.password || '123456');
    setEditRiderShift(rider.shift || (storeShifts[0]?.name || 'Morning Shift (07:00 AM - 12:00 PM)'));
  };

  // Save Rider Credentials & Shift
  const handleSaveRiderCredentials = async (e) => {
    e.preventDefault();
    if (!editingRiderCredentials) return;
    const updated = {
      ...editingRiderCredentials,
      username: editRiderId.trim().toLowerCase(),
      password: editRiderPassword.trim(),
      shift: editRiderShift,
      active_shift: {
        name: editRiderShift,
        time: editRiderShift.includes('Morning') ? '07:00 AM - 12:00 PM' :
              editRiderShift.includes('Afternoon') ? '12:00 PM - 05:00 PM' :
              editRiderShift.includes('Evening') ? '05:00 PM - 10:30 PM' : '10:30 PM - 02:00 AM',
        zone: 'Khair Operational Zone',
        assigned_by_admin: true,
        assigned_at: new Date().toISOString()
      }
    };
    const nextStaff = staff.map(s => s.id === updated.id ? updated : s);
    setStaff(nextStaff);
    try { localStorage.setItem('gk_staff', JSON.stringify(nextStaff)); } catch {}
    setEditingRiderCredentials(null);

    await syncToFirebase('staff', nextStaff);
    fetch(`${FIREBASE_DB_URL}/delivery_partners/${updated.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Quick 1-Click ID Verification from Admin Panel
  const handleQuickVerifyKyc = async (rider, newStatus) => {
    const updated = {
      ...rider,
      kyc_status: newStatus,
      kyc_reviewed_at: new Date().toISOString()
    };
    const nextStaff = staff.map(s => s.id === updated.id ? updated : s);
    setStaff(nextStaff);
    try { localStorage.setItem('gk_staff', JSON.stringify(nextStaff)); } catch {}
    await syncToFirebase('staff', nextStaff);
    fetch(`${FIREBASE_DB_URL}/delivery_partners/${rider.id}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  };

  // Handle Open Create / Edit Offer
  const handleOpenCreateOffer = () => {
    setEditingOffer(null);
    setOfferTitle('');
    setOfferSubtitle('');
    setOfferCode('');
    setOfferDiscountTag('FLAT ₹50 OFF');
    setOfferDiscountType('flat');
    setOfferDiscountVal(50);
    setOfferMinOrder(250);
    setOfferCategoryId('all');
    setOfferImage('https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80');
    setOfferIsActive(true);
    setIsOfferModalOpen(true);
  };

  const handleOpenEditOffer = (offer) => {
    setEditingOffer(offer);
    setOfferTitle(offer.title || '');
    setOfferSubtitle(offer.subtitle || '');
    setOfferCode(offer.code || '');
    setOfferDiscountTag(offer.discount_tag || '');
    setOfferDiscountType(offer.discount_type || 'flat');
    setOfferDiscountVal(offer.discount_val || 50);
    setOfferMinOrder(offer.min_order || 0);
    setOfferCategoryId(offer.category_id || 'all');
    setOfferImage(offer.image || '');
    setOfferIsActive(offer.active !== false);
    setIsOfferModalOpen(true);
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      alert('Please enter an Offer Title');
      return;
    }

    const offerPayload = {
      id: editingOffer ? editingOffer.id : `offer-${Date.now()}`,
      title: offerTitle.trim(),
      subtitle: offerSubtitle.trim(),
      code: offerCode.trim().toUpperCase(),
      discount_tag: offerDiscountTag.trim(),
      discount_type: offerDiscountType,
      discount_val: Number(offerDiscountVal) || 0,
      min_order: Number(offerMinOrder) || 0,
      category_id: offerCategoryId,
      image: offerImage.trim() || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
      active: Boolean(offerIsActive),
      updated_at: new Date().toISOString()
    };

    let nextOffers = [];
    if (editingOffer) {
      nextOffers = (offers || []).map(o => o.id === editingOffer.id ? { ...o, ...offerPayload } : o);
    } else {
      nextOffers = [offerPayload, ...(offers || [])];
    }

    setOffers(nextOffers);
    try { localStorage.setItem('gk_offers', JSON.stringify(nextOffers)); } catch {}
    setIsOfferModalOpen(false);

    await syncToFirebase('offers', nextOffers);
  };

  const handleToggleOfferLive = async (offerId) => {
    const nextOffers = (offers || []).map(o => {
      if (o.id === offerId) {
        return { ...o, active: o.active === false ? true : false };
      }
      return o;
    });

    setOffers(nextOffers);
    try { localStorage.setItem('gk_offers', JSON.stringify(nextOffers)); } catch {}
    await syncToFirebase('offers', nextOffers);
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) return;
    const nextOffers = (offers || []).filter(o => o.id !== offerId);
    setOffers(nextOffers);
    try { localStorage.setItem('gk_offers', JSON.stringify(nextOffers)); } catch {}
    await syncToFirebase('offers', nextOffers);
  };

  const handleToggleAllOffersLive = async (makeLive) => {
    const nextOffers = (offers || []).map(o => ({ ...o, active: Boolean(makeLive) }));
    setOffers(nextOffers);
    try { localStorage.setItem('gk_offers', JSON.stringify(nextOffers)); } catch {}
    await syncToFirebase('offers', nextOffers);
    addAuditLog({
      action: makeLive ? 'Enabled All Offers' : 'Paused All Offers',
      details: `${makeLive ? 'Activated' : 'Paused'} all ${nextOffers.length} promotional offers & coupons.`
    });
  };

  const handleRestoreDefaultOffers = async () => {
    if (!window.confirm('Restore standard default offers and coupons?')) return;
    setOffers(DEFAULT_OFFERS);
    try { localStorage.setItem('gk_offers', JSON.stringify(DEFAULT_OFFERS)); } catch {}
    await syncToFirebase('offers', DEFAULT_OFFERS);
    addAuditLog({
      action: 'Restored Default Offers',
      details: 'Restored standard default welcome, veggie & fast food coupon offers.'
    });
  };

  const handleOfferImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    setIsUploadingOfferImage(true);
    try {
      const compressed = await fileToDataUrl(file);
      setOfferImage(compressed);
    } catch {
      alert('Error reading image file');
    } finally {
      setIsUploadingOfferImage(false);
    }
  };

  // ================= ORDER MILESTONE FREE GIFT TIERS (₹149, ₹249, ₹349+ — 3 ITEMS EACH) =================
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [milestoneMinAmount, setMilestoneMinAmount] = useState(149);
  const [milestoneTitle, setMilestoneTitle] = useState('₹149+ Order Free Gift');
  const [milestoneSubtitle, setMilestoneSubtitle] = useState('Choose any 1 free gift item on orders of ₹149 or more!');
  const [milestoneIsActive, setMilestoneIsActive] = useState(true);
  const [milestoneItems, setMilestoneItems] = useState([
    {
      id: 'mg-item-1',
      name: 'Fresh Green Coriander & Chilli Combo',
      category: 'Vegetable',
      unit: '100g + 50g Pack',
      worth: 20,
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'mg-item-2',
      name: 'Maggi 2-Minute Masala Noodles',
      category: 'Grocery',
      unit: '70g Single Pack',
      worth: 15,
      image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'mg-item-3',
      name: 'Crispy Hot Samosa (1 Pc)',
      category: 'Fast Food',
      unit: '1 Piece with Chutney',
      worth: 20,
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'
    }
  ]);

  const handleOpenCreateMilestone = () => {
    setEditingMilestone(null);
    const suggestedAmt = 449;
    setMilestoneMinAmount(suggestedAmt);
    setMilestoneTitle(`₹${suggestedAmt}+ Order Free Gift`);
    setMilestoneSubtitle(`Choose any 1 free gift item on orders of ₹${suggestedAmt} or more!`);
    setMilestoneIsActive(true);
    setMilestoneItems([
      {
        id: `mg-${Date.now()}-1`,
        name: 'Fresh Seasonal Vegetable Pack',
        category: 'Vegetable',
        unit: '500g Pack',
        worth: 40,
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80'
      }
    ]);
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (tier) => {
    setEditingMilestone(tier);
    setMilestoneMinAmount(Number(tier.min_amount) || 149);
    setMilestoneTitle(tier.title || `₹${tier.min_amount}+ Order Free Gift`);
    setMilestoneSubtitle(tier.subtitle || `Choose any 1 free gift item on orders of ₹${tier.min_amount} or more!`);
    setMilestoneIsActive(tier.active !== false);

    const existingItems = Array.isArray(tier.items) && tier.items.length > 0 ? tier.items : [];
    if (existingItems.length === 0) {
      setMilestoneItems([
        {
          id: `mg-${tier.id || Date.now()}-1`,
          name: 'Free Gift Option 1',
          category: 'Vegetable',
          unit: '1 Pack',
          worth: 25,
          image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'
        }
      ]);
    } else {
      setMilestoneItems(existingItems.map(it => ({ ...it })));
    }
    setIsMilestoneModalOpen(true);
  };

  const handleAddMilestoneItem = () => {
    if (milestoneItems.length >= 25) {
      alert('Maximum 25 free gift choices allowed per milestone tier.');
      return;
    }
    const nextIdx = milestoneItems.length + 1;
    const sampleCats = ['Vegetable', 'Grocery', 'Fast Food', 'Fruits', 'Dairy & Bakery'];
    setMilestoneItems(prev => [
      ...prev,
      {
        id: `mg-opt-${Date.now()}-${nextIdx}`,
        name: `Free Gift Option ${nextIdx}`,
        category: sampleCats[(nextIdx - 1) % sampleCats.length],
        unit: '1 Pack',
        worth: 25,
        image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'
      }
    ]);
  };

  const handleRemoveMilestoneItem = (index) => {
    if (milestoneItems.length <= 1) {
      alert('At least 1 gift option is required for each milestone tier.');
      return;
    }
    setMilestoneItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleMilestoneItemFieldChange = (index, field, value) => {
    setMilestoneItems(prev => prev.map((it, idx) => idx === index ? { ...it, [field]: value } : it));
  };

  const handleMilestoneItemImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }
    try {
      const compressed = await fileToDataUrl(file);
      handleMilestoneItemFieldChange(index, 'image', compressed);
    } catch {
      alert('Error reading image file');
    }
  };

  const handlePickProductForMilestoneItem = (index, productId) => {
    if (!productId) return;
    const prod = (products || []).find(p => String(p.id) === String(productId));
    if (!prod) return;
    const catObj = (categories || []).find(c => String(c.id) === String(prod.category_id));
    let mappedCat = 'Grocery';
    const catName = (catObj?.name || '').toLowerCase();
    if (catName.includes('veg')) mappedCat = 'Vegetable';
    else if (catName.includes('fast') || catName.includes('food') || catName.includes('snack') || catName.includes('street')) mappedCat = 'Fast Food';
    else if (catName.includes('fruit')) mappedCat = 'Fruits';
    else if (catName.includes('dairy') || catName.includes('milk') || catName.includes('bakery')) mappedCat = 'Dairy & Bakery';

    setMilestoneItems(prev => prev.map((it, idx) => idx === index ? {
      ...it,
      name: prod.name || it.name,
      category: mappedCat,
      unit: prod.unit || '1 Pack',
      worth: Number(prod.mrp || prod.price) || 25,
      image: (Array.isArray(prod.images) && prod.images[0]) ? prod.images[0] : (prod.image || it.image)
    } : it));
  };

  const handleSaveMilestone = async (e) => {
    e.preventDefault();
    const minAmt = Number(milestoneMinAmount) || 0;
    if (minAmt <= 0) {
      alert('Please enter a valid minimum order amount (e.g. 149, 249, 349).');
      return;
    }
    if (milestoneItems.length === 0) {
      alert('Please configure at least 1 gift option for this tier.');
      return;
    }
    const cleanedItems = milestoneItems.map((it, idx) => ({
      id: it.id || `mg-${Date.now()}-${idx + 1}`,
      name: (it.name || `Gift Option ${idx + 1}`).trim(),
      category: (it.category || 'Grocery').trim(),
      unit: (it.unit || '1 Pack').trim(),
      worth: Number(it.worth) || 20,
      image: (it.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80').trim()
    }));

    const tierPayload = {
      id: editingMilestone ? editingMilestone.id : `milestone-${minAmt}-${Date.now()}`,
      min_amount: minAmt,
      title: milestoneTitle.trim() || `₹${minAmt}+ Order Free Gift`,
      subtitle: milestoneSubtitle.trim() || `Choose any 1 free gift item on orders of ₹${minAmt} or more!`,
      active: Boolean(milestoneIsActive),
      items: cleanedItems,
      updated_at: new Date().toISOString()
    };

    let nextMilestones = [];
    if (editingMilestone) {
      nextMilestones = (milestoneGifts || []).map(m => m.id === editingMilestone.id ? { ...m, ...tierPayload } : m);
    } else {
      nextMilestones = [...(milestoneGifts || []), tierPayload];
    }
    nextMilestones.sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0));

    setMilestoneGifts(nextMilestones);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(nextMilestones)); } catch {}
    setIsMilestoneModalOpen(false);
    await syncToFirebase('milestone_gifts', nextMilestones);
  };

  const handleToggleMilestoneLive = async (tierId) => {
    const nextMilestones = (milestoneGifts || []).map(m =>
      m.id === tierId ? { ...m, active: m.active === false ? true : false, updated_at: new Date().toISOString() } : m
    );
    setMilestoneGifts(nextMilestones);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(nextMilestones)); } catch {}
    await syncToFirebase('milestone_gifts', nextMilestones);
  };

  const handleToggleAllMilestonesLive = async (makeActive) => {
    const nextMilestones = (milestoneGifts || []).map(m => ({
      ...m,
      active: Boolean(makeActive),
      updated_at: new Date().toISOString()
    }));
    setMilestoneGifts(nextMilestones);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(nextMilestones)); } catch {}
    await syncToFirebase('milestone_gifts', nextMilestones);
  };

  const handleRestoreDefaultMilestones = async () => {
    const restored = DEFAULT_MILESTONE_GIFTS.map(m => ({
      ...m,
      active: true,
      updated_at: new Date().toISOString()
    }));
    setMilestoneGifts(restored);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(restored)); } catch {}
    await syncToFirebase('milestone_gifts', restored);
  };

  const handleDeleteMilestone = async (tierId) => {
    if (!window.confirm('Are you sure you want to delete this order milestone gift tier?')) return;
    const nextMilestones = (milestoneGifts || []).filter(m => m.id !== tierId);
    setMilestoneGifts(nextMilestones);
    try { localStorage.setItem('gk_milestone_gifts', JSON.stringify(nextMilestones)); } catch {}
    await syncToFirebase('milestone_gifts', nextMilestones);
  };

  // Staff User Handlers (Super Admin Only)
  const handleOpenCreateStaffUser = () => {
    setEditingStaffUser(null);
    setStaffUserName('');
    setStaffUserUserId(`staff${String((staffUsers || []).length + 1).padStart(2, '0')}`);
    setStaffUserPassword('staff123');
    setStaffUserPhone('');
    setStaffUserStatus('active');
    setIsStaffUserModalOpen(true);
  };

  const handleOpenEditStaffUser = (st) => {
    setEditingStaffUser(st);
    setStaffUserName(st.name || '');
    setStaffUserUserId(st.user_id || st.username || '');
    setStaffUserPassword(st.password || '');
    setStaffUserPhone(st.phone || '');
    setStaffUserStatus(st.status || 'active');
    setIsStaffUserModalOpen(true);
  };

  const handleSaveStaffUser = async (e) => {
    e.preventDefault();
    if (!staffUserUserId.trim() || !staffUserPassword.trim() || !staffUserName.trim()) {
      alert('Please fill Staff Name, User ID, and Password');
      return;
    }

    const payload = {
      id: editingStaffUser ? editingStaffUser.id : `staff-user-${Date.now()}`,
      user_id: staffUserUserId.trim().toLowerCase(),
      username: staffUserUserId.trim().toLowerCase(),
      name: staffUserName.trim(),
      password: staffUserPassword.trim(),
      phone: staffUserPhone.trim(),
      role: 'staff',
      status: staffUserStatus,
      updated_at: new Date().toISOString(),
      created_at: editingStaffUser ? editingStaffUser.created_at : new Date().toISOString()
    };

    let updated = [];
    if (editingStaffUser) {
      updated = (staffUsers || []).map(s => s.id === editingStaffUser.id ? { ...s, ...payload } : s);
    } else {
      updated = [payload, ...(staffUsers || [])];
    }

    setStaffUsers(updated);
    try { localStorage.setItem('gk_staff_users', JSON.stringify(updated)); } catch {}
    await syncToFirebase('staff_users', updated);

    if (addAuditLog) {
      addAuditLog({
        action: editingStaffUser ? 'Edit Staff User' : 'Create Staff User',
        details: `${editingStaffUser ? 'Updated' : 'Created'} staff account: ${payload.name} (User ID: ${payload.user_id})`
      });
    }

    setIsStaffUserModalOpen(false);
  };

  const handleToggleStaffUserStatus = async (staffId) => {
    const updated = (staffUsers || []).map(s => {
      if (s.id === staffId) {
        const nextStatus = s.status === 'disabled' ? 'active' : 'disabled';
        if (addAuditLog) {
          addAuditLog({
            action: 'Toggle Staff Status',
            details: `Changed staff ${s.name} (${s.user_id || s.username}) status to ${nextStatus}`
          });
        }
        return { ...s, status: nextStatus };
      }
      return s;
    });

    setStaffUsers(updated);
    try { localStorage.setItem('gk_staff_users', JSON.stringify(updated)); } catch {}
    await syncToFirebase('staff_users', updated);
  };

  const handleDeleteStaffUser = async (staffId) => {
    const target = (staffUsers || []).find(s => s.id === staffId);
    if (!window.confirm(`Are you sure you want to delete staff account for ${target?.name || 'this user'}?`)) return;

    const updated = (staffUsers || []).filter(s => s.id !== staffId);
    setStaffUsers(updated);
    try { localStorage.setItem('gk_staff_users', JSON.stringify(updated)); } catch {}
    await syncToFirebase('staff_users', updated);

    if (addAuditLog) {
      addAuditLog({
        action: 'Delete Staff User',
        details: `Deleted staff login account: ${target?.name} (User ID: ${target?.user_id || target?.username})`
      });
    }
  };

  // Universal Excel-Compatible (.csv with UTF-8 BOM) Exporter for All Modules
  const handleExportExcel = (moduleType = reportModuleFilter) => {
    let headers = [];
    let rows = [];
    let filename = '';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (moduleType === 'sales') {
      filename = `GhartakKart_Sales_And_Order_PnL_${dateStr}.csv`;
      headers = [
        'Order ID',
        'Date & Time',
        'Customer Name',
        'Phone Number',
        'Delivery Address',
        'Distance (km)',
        'Items Count',
        'Items List',
        'Items Purchase Cost / COGS (Rs)',
        'Subtotal Selling (Rs)',
        'Delivery Fee (Rs)',
        'Coupon Discount (Rs)',
        'Free Milestone Gift Worth (Rs)',
        'Gross Order Total (Rs)',
        'Net Order Profit / P&L (Rs)',
        'Margin %',
        'Payment Mode',
        'Payment Status',
        'Order Status',
        'Stamp Awarded (>= Rs 250)'
      ];
      rows = orders.map(o => {
        const pnl = getOrderPnlBreakdown(o);
        return [
          `#${o.id}`,
          o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '',
          o.customer_name || 'Customer',
          o.customer_phone || '',
          `${o.address?.line1 || ''} ${o.address?.landmark ? '(' + o.address.landmark + ')' : ''} ${o.address?.city || ''}`,
          o.distance_km || 0,
          (o.items || []).length,
          (o.items || []).map(i => `${i.qty}x ${i.name} (${i.unit || '1 unit'})`).join('; '),
          pnl.itemsCost,
          o.subtotal || 0,
          o.delivery_fee || 0,
          o.discount || 0,
          pnl.freeGiftCost,
          o.total || 0,
          pnl.netProfit,
          `${pnl.marginPct}%`,
          o.payment_method || 'Cash on Delivery',
          o.payment_status || 'Pending',
          o.order_status || 'Pending',
          o.order_status === 'Cancelled' || o.order_status === 'Rejected'
            ? 'Cancelled (0 Stamps)'
            : ((Number(o.total) || 0) >= 250 || o.earned_stamp ? 'Yes (+1 Stamp)' : 'No')
        ];
      });
    } else if (moduleType === 'delivered_orders') {
      const deliveredList = (orders || []).filter(o => {
        if (!o) return false;
        const st = String(o.order_status || '').trim().toLowerCase();
        return st === 'delivered' || st === 'completed';
      });

      if (deliveredList.length === 0) {
        alert('No delivered orders found in system yet to export.');
        return;
      }

      deliveredList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      filename = `GhartakKart_Delivered_Orders_With_Contacts_${dateStr}.csv`;
      headers = [
        'Order ID',
        'Order Date & Time',
        'Customer Name',
        'Customer Mobile (+91)',
        'Alternate Phone',
        'Delivery Address',
        'Landmark',
        'City',
        'Pincode',
        'GPS Coordinates',
        'Distance (km)',
        'Delivery Slot',
        'Items Detail (Qty x Item @ Price)',
        'Total Items Units',
        'Free Milestone Gift',
        'Subtotal (Rs)',
        'Delivery Fee (Rs)',
        'Coupon Discount (Rs)',
        'Coupon Code',
        'Wallet Cash Used (Rs)',
        'Net Total Paid (Rs)',
        'Payment Mode',
        'Payment Status',
        'UPI / Payment Ref ID',
        'Delivered By (Rider)',
        'Rider Phone',
        'Delivery Instructions',
        'Admin Remarks',
        'Order Status'
      ];
      rows = deliveredList.map(o => {
        const cleanPhone = String(o.customer_phone || o.address?.phone || '').replace(/\D/g, '').slice(-10);
        const altPhone = String(o.address?.phone && o.address.phone !== o.customer_phone ? o.address.phone : '').replace(/\D/g, '').slice(-10);
        const riderObj = (staff || []).find(s => s && (s.id === o.assigned_delivery_boy || s.id === o.delivery_boy_id || s.name === o.delivery_boy_name || s.id === o.assigned_staff_id));
        const riderName = riderObj?.name || o.delivery_boy_name || o.assigned_delivery_boy || (o.assigned_staff_id ? 'Rider Assigned' : 'Store Dispatch');
        const riderPhone = riderObj?.phone ? String(riderObj.phone).replace(/\D/g, '').slice(-10) : '';

        const itemsSummary = (o.items || [])
          .map(it => `${it.qty}x ${it.name}${it.unit ? ` (${it.unit})` : ''} @ Rs ${it.price} = Rs ${((Number(it.qty) || 1) * (Number(it.price) || 0))}`)
          .join(' | ');
        const totalUnits = (o.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
        const gpsCoords = (o.address?.lat && o.address?.lng)
          ? `${o.address.lat}, ${o.address.lng}`
          : (o.userLocation?.lat && o.userLocation?.lng ? `${o.userLocation.lat}, ${o.userLocation.lng}` : '');
        const giftDesc = o.milestone_gift ? `${o.milestone_gift.name} (${o.milestone_gift.unit || 'Free'})` : 'None';

        return [
          `#${o.id}`,
          o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '',
          o.customer_name || o.address?.name || 'Customer',
          cleanPhone ? `+91 ${cleanPhone}` : (o.customer_phone || ''),
          altPhone ? `+91 ${altPhone}` : '',
          o.address?.line1 || o.delivery_address || '',
          o.address?.landmark || '',
          o.address?.city || 'Khair',
          o.address?.pincode || '202138',
          gpsCoords,
          o.distance_km || 0,
          o.delivery_slot || 'Express',
          itemsSummary,
          totalUnits,
          giftDesc,
          Number(o.subtotal) || 0,
          Number(o.delivery_fee) || 0,
          Number(o.discount) || 0,
          o.coupon_code || 'None',
          Number(o.wallet_used) || 0,
          Number(o.total) || 0,
          o.payment_method || 'Cash on Delivery',
          o.payment_status || 'Paid',
          o.razorpay_payment_id || o.upi_ref || '',
          riderName,
          riderPhone ? `+91 ${riderPhone}` : '',
          o.delivery_instructions || '',
          o.admin_remark || '',
          o.order_status || 'Delivered'
        ];
      });
    } else if (moduleType === 'daily_pnl') {
      filename = `GhartakKart_Day_To_Day_PnL_Report_${dateStr}.csv`;
      headers = [
        'Date (YYYY-MM-DD)',
        'Display Date',
        'Day',
        'Total Orders',
        'Valid Orders',
        'Delivered Orders',
        'Cancelled Orders',
        'Units Sold',
        'Items Selling Subtotal (Rs)',
        'Purchase Cost / COGS (Rs)',
        'Gross Item Profit (Rs)',
        'Delivery Fee Collected (Rs)',
        'Coupon Discounts Given (Rs)',
        'Free Gift Cost (Rs)',
        'Total Gross Sales Revenue (Rs)',
        'Net Profit / Loss P&L (Rs)',
        'Net Margin (%)',
        'P&L Status'
      ];
      rows = (dailyPnlData?.filteredDays || []).map(d => [
        d.dateKey,
        d.displayDate,
        d.dayName,
        d.totalOrders,
        d.validOrders,
        d.deliveredOrders,
        d.cancelledOrders,
        d.unitsSold,
        d.itemsSell,
        d.itemsCost,
        d.grossItemProfit,
        d.deliveryFee,
        d.discount,
        d.freeGiftCost,
        d.grossRevenue,
        d.netProfit,
        `${d.marginPct}%`,
        d.netProfit > 0 ? 'PROFIT' : d.netProfit < 0 ? 'LOSS' : 'BREAK-EVEN'
      ]);
    } else if (moduleType === 'margin') {
      filename = `GhartakKart_Price_Margins_Report_${dateStr}.csv`;
      headers = [
        'Product ID',
        'Product Name',
        'Category',
        'Brand',
        'Unit',
        'Purchase Price / Cost (Rs)',
        'Selling Price (Rs)',
        'Printed MRP (Rs)',
        'Customer Discount (Rs)',
        'Profit per Unit (Rs)',
        'Profit Margin (%)',
        'Current Stock Quantity',
        'Total Purchase Investment (Rs)',
        'Total Retail Valuation (Rs)',
        'Potential Gross Margin (Rs)'
      ];
      rows = products.map(p => {
        const cost = Number(p.purchase_price) || 0;
        const sell = Number(p.price) || 0;
        const mrp = Number(p.mrp) || sell;
        const profit = cost > 0 ? sell - cost : 0;
        const marginPct = cost > 0 ? Math.round((profit / cost) * 100) : 0;
        const discount = mrp > sell ? mrp - sell : 0;
        const stock = Number(p.stock) || 0;
        return [
          p.id,
          p.name,
          p.category_id || '',
          p.brand || '',
          p.unit || '',
          cost,
          sell,
          mrp,
          discount,
          profit,
          `${marginPct}%`,
          stock,
          cost * stock,
          sell * stock,
          profit * stock
        ];
      });
    } else if (moduleType === 'inventory') {
      filename = `GhartakKart_Inventory_Valuation_${dateStr}.csv`;
      headers = [
        'Product ID',
        'Product Name',
        'Category',
        'Unit',
        'Current Stock Units',
        'Stock Status',
        'Unit Purchase Cost (Rs)',
        'Unit Selling Price (Rs)',
        'Total Inventory Cost Value (Rs)',
        'Total Inventory Retail Value (Rs)',
        'Restock Alert'
      ];
      rows = products.map(p => {
        const stock = Number(p.stock) || 0;
        const cost = Number(p.purchase_price) || 0;
        const sell = Number(p.price) || 0;
        const status = stock <= 0 ? 'Out of Stock' : stock <= 15 ? 'Low Stock' : 'Healthy Stock';
        return [
          p.id,
          p.name,
          p.category_id || '',
          p.unit || '',
          stock,
          status,
          cost,
          sell,
          stock * cost,
          stock * sell,
          stock <= 15 ? 'YES - REORDER REQUIRED' : 'Normal'
        ];
      });
    } else if (moduleType === 'loyalty' || moduleType === 'stamps') {
      filename = `GhartakKart_Stamp_Collect_Customers_${dateStr}.csv`;
      headers = [
        'Customer Name',
        'Phone Number',
        'Delivery Address',
        'Total Orders Placed',
        'Total Spend (Rs)',
        'Qualifying Orders (>= Rs 250)',
        'Active Stamps (Out of 10)',
        'Stamp Progress %',
        'Surprise Gifts Earned',
        'Surprise Gift Status',
        'Last Order Date'
      ];
      rows = stampCustomers.map(c => {
        const statusStr = c.isFulfilled
          ? `Dispatched / Delivered (${giftFulfillments[c.phone]?.dispatched_at?.slice(0, 10) || 'Yes'})`
          : c.isGiftEligible
            ? 'ELIGIBLE - Deliver Surprise Gift to Home 🎁'
            : `${c.activeStamps}/10 Stamps`;

        return [
          c.name,
          c.phone,
          c.address ? `${c.address.line1 || ''} ${c.address.landmark ? '(' + c.address.landmark + ')' : ''} ${c.address.city || ''}` : 'On file',
          c.totalOrders,
          c.totalSpend,
          c.totalQualifying,
          `${c.activeStamps} / 10`,
          `${Math.round((c.activeStamps / 10) * 100)}%`,
          c.giftsEarned,
          statusStr,
          c.latestOrderDate ? new Date(c.latestOrderDate).toLocaleString('en-IN') : 'N/A'
        ];
      });
    } else if (moduleType === 'riders') {
      filename = `GhartakKart_Rider_Performance_${dateStr}.csv`;
      headers = [
        'Rider ID',
        'Rider Name',
        'Phone Number',
        'Vehicle Type',
        'Total Assigned Orders',
        'Delivered Orders',
        'On Route Orders',
        'Total Delivered Value (Rs)'
      ];
      rows = staff.map(st => {
        const riderOrders = orders.filter(o => o.assigned_staff_id === st.id);
        const delivered = riderOrders.filter(o => o.order_status === 'Delivered');
        const onRoute = riderOrders.filter(o => o.order_status === 'Out for Delivery');
        const totalVal = delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        return [
          st.id,
          st.name,
          st.phone,
          st.vehicle,
          riderOrders.length,
          delivered.length,
          onRoute.length,
          totalVal
        ];
      });
    } else if (moduleType === 'offers') {
      filename = `GhartakKart_Offer_Zone_${dateStr}.csv`;
      headers = [
        'Offer ID',
        'Title',
        'Subtitle',
        'Coupon Code',
        'Discount Badge',
        'Discount Type',
        'Discount Value',
        'Min Order (Rs)',
        'Target Category',
        'Live Status',
        'Image URL'
      ];
      rows = (offers || []).map(o => [
        o.id,
        o.title,
        o.subtitle,
        o.code || 'None',
        o.discount_tag || '',
        o.discount_type || 'flat',
        o.discount_val || 0,
        o.min_order || 0,
        o.category_id || 'All',
        o.active !== false ? 'LIVE NOW 🔥' : 'PAUSED',
        o.image || ''
      ]);
    } else if (moduleType === 'audit') {
      filename = `GhartakKart_Security_Audit_Logs_${dateStr}.csv`;
      headers = [
        'Log ID',
        'Date & Time',
        'Staff / Admin Name',
        'User ID',
        'Role',
        'Action Type',
        'Associated Order ID',
        'Activity Details'
      ];
      rows = (auditLogs || []).map(l => [
        l.id,
        new Date(l.timestamp).toLocaleString('en-IN'),
        l.user_name || '',
        l.user_id || '',
        l.role || '',
        l.action || '',
        l.order_id || 'N/A',
        l.details || ''
      ]);
    } else if (moduleType === 'staff_users') {
      filename = `GhartakKart_Staff_User_Logins_${dateStr}.csv`;
      headers = [
        'Staff ID',
        'Full Name',
        'User ID',
        'Phone',
        'Role',
        'Status',
        'Created Date'
      ];
      rows = (staffUsers || []).map(s => [
        s.id,
        s.name,
        s.user_id || s.username,
        s.phone || '',
        s.role || 'staff',
        s.status || 'active',
        new Date(s.created_at).toLocaleString('en-IN')
      ]);
    } else if (moduleType === 'vendors') {
      filename = `GhartakKart_Vendor_Directory_${dateStr}.csv`;
      headers = [
        'Vendor ID',
        'Vendor / Contact Name',
        'Company / Shop Name',
        'Category / Supplied Goods',
        'Phone Number',
        'Email',
        'Address',
        'GSTIN',
        'PAN',
        'Opening Balance (Rs)',
        'Total Purchases Billed (Rs)',
        'Total Payments Made (Rs)',
        'Net Outstanding Balance Payable (Rs)',
        'Account Status',
        'Notes'
      ];
      rows = (vendors || []).map(v => {
        const stats = vendorLedgerStats.statsMap[v.id] || { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
        return [
          v.id,
          v.name || '',
          v.company_name || '',
          v.category || 'General',
          v.phone || '',
          v.email || '',
          v.address || '',
          v.gst || '',
          v.pan || '',
          Number(v.opening_balance) || 0,
          stats.totalPurchases,
          stats.totalPaid,
          stats.balancePayable,
          v.status || 'active',
          v.notes || ''
        ];
      });
    } else if (moduleType === 'vendor_ledger') {
      filename = `GhartakKart_Vendor_Ledger_Statement_${dateStr}.csv`;
      headers = [
        'Ledger Entry ID',
        'Date & Time',
        'Vendor Name',
        'Transaction Type',
        'Order / Bill Ref No',
        'Particulars / Items Detail',
        'Purchase Credit - Owed to Vendor (Rs)',
        'Payment Debit - Paid to Vendor (Rs)',
        'Status'
      ];
      rows = (vendorLedger || []).map(l => {
        const ven = (vendors || []).find(v => v.id === l.vendor_id);
        const isPurchase = l.type === 'purchase' || l.type === 'bill';
        const items = resolveEntryItems(l);
        const itemsText = items.length > 0
          ? `${l.particulars ? l.particulars + ' :: ' : ''}` + items.map(i => `${i.qty}x ${i.name}${i.unit ? ` (${i.unit})` : ''} @ Rs ${i.unit_cost} = Rs ${i.total_cost}`).join(' | ')
          : (l.particulars || '');
        return [
          l.id,
          l.date ? new Date(l.date).toLocaleString('en-IN') : '',
          ven?.name || l.vendor_id || 'Vendor',
          l.type === 'purchase' ? 'Order Purchase (Auto)' : (l.type === 'payment' ? 'Payment to Vendor' : (l.type === 'bill' ? 'Direct Purchase Bill' : l.type)),
          l.order_id || l.reference_no || 'N/A',
          itemsText,
          isPurchase ? Number(l.amount) || 0 : 0,
          !isPurchase ? Number(l.amount) || 0 : 0,
          l.status || 'active'
        ];
      });
    } else if (moduleType === 'expenses') {
      filename = `GhartakKart_Operational_Expenses_${dateStr}.csv`;
      headers = [
        'Expense ID',
        'Date',
        'Category Code',
        'Category Label',
        'Description / Notes',
        'Paid To / Vendor / Staff',
        'Payment Mode',
        'Reference No',
        'Amount (Rs)'
      ];
      rows = (expenses || []).map(e => [
        e.id,
        e.date || '',
        e.category || '',
        e.category_label || e.category || 'General',
        e.notes || '',
        e.paid_to || '',
        e.payment_mode || 'Cash',
        e.reference_no || '',
        Number(e.amount) || 0
      ]);
    } else if (moduleType === 'incomes') {
      filename = `GhartakKart_Other_Income_Register_${dateStr}.csv`;
      headers = [
        'Income Record ID',
        'Date',
        'Category',
        'Source / Received From',
        'Payment Mode',
        'Notes',
        'Amount (Rs)'
      ];
      rows = (otherIncomes || []).map(i => [
        i.id,
        i.date || '',
        i.category_label || i.category || 'Other',
        i.source || '',
        i.payment_mode || 'Cash',
        i.notes || '',
        Number(i.amount) || 0
      ]);
    } else if (moduleType === 'pnl') {
      filename = `GhartakKart_Accounting_Profit_And_Loss_${dateStr}.csv`;
      headers = ['Financial Accounting Line Item', 'Amount (Rs)', 'Notes / Breakdown'];
      rows = [
        ['Customer Orders Gross Sales', accountingPnlMetrics.totalOrderSalesRevenue, `From ${accountingPnlMetrics.filteredOrdersCount} non-cancelled orders`],
        [' - Cash on Delivery (COD) Sales', accountingPnlMetrics.codSalesRevenue, 'Cash received from door deliveries'],
        [' - Online / UPI Payments Sales', accountingPnlMetrics.upiSalesRevenue, 'Prepaid / UPI on delivery'],
        ['Other Store Income Collections', accountingPnlMetrics.totalOtherIncome, `From ${accountingPnlMetrics.filteredIncomesCount} income entries (Scrap/Rebates)`],
        ['TOTAL GROSS INFLOW (REVENUE)', accountingPnlMetrics.totalGrossRevenue, 'Total business income inflow'],
        ['', '', ''],
        ['Cost of Goods Sold (COGS / Vendor Purchases)', accountingPnlMetrics.totalCogs, 'Wholesale cost of goods sold in customer orders'],
        ['GROSS BUSINESS PROFIT', accountingPnlMetrics.grossProfit, `Gross Margin: ${accountingPnlMetrics.grossMarginPct}%`],
        ['', '', ''],
        ['STORE OPERATING EXPENSES (Itemized Below):', accountingPnlMetrics.totalOperatingExpenses, `From ${accountingPnlMetrics.filteredExpensesCount} recorded expenses`],
        ...Object.keys(accountingPnlMetrics.expenseByCategory).map(catKey => {
          const catObj = EXPENSE_CATEGORIES.find(c => c.id === catKey);
          return [` - ${catObj?.label || catKey}`, accountingPnlMetrics.expenseByCategory[catKey], 'Operational overhead'];
        }),
        ['', '', ''],
        ['NET PROFIT / (NET LOSS)', accountingPnlMetrics.netProfit, `Net Margin: ${accountingPnlMetrics.netMarginPct}% (Gross Profit + Other Income - Operating Expenses)`],
        ['', '', ''],
        ['CASH FLOW POSITION:', '', ''],
        ['Net Physical Cash in Hand', accountingPnlMetrics.netCashFlow, `Cash In (Rs ${accountingPnlMetrics.codSalesRevenue + accountingPnlMetrics.cashOtherIncome}) - Cash Out (Rs ${accountingPnlMetrics.cashPaidExpenses})`],
        ['Net Digital (UPI / Bank) Flow', accountingPnlMetrics.netDigitalFlow, `UPI In (Rs ${accountingPnlMetrics.upiSalesRevenue + accountingPnlMetrics.upiOtherIncome}) - UPI Out (Rs ${accountingPnlMetrics.upiPaidExpenses})`]
      ];
    }

    // Build Excel-compatible CSV with UTF-8 BOM
    const csvContent = '\uFEFF' + [
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Automated Multi-Sheet Vendor Material and Payment Excel Workbook (.xlsx)
  const handleDownloadMultiSheetVendorExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Vendor Balances Summary
      const summaryHeaders = [
        ['GHARTAKKART QUICK COMMERCE - VENDOR ACCOUNTS SUMMARY'],
        [`Generated On: ${new Date().toLocaleString('en-IN')}`],
        [],
        ['S.No', 'Vendor Name', 'Category', 'Contact Phone', 'GSTIN', 'Opening Balance (Rs)', 'Total Materials Inward (Rs)', 'Total Payments Made (Rs)', 'Net Balance Due (Rs)', 'Payment Status']
      ];
      const summaryRows = (vendors || []).map((v, idx) => {
        const stats = vendorLedgerStats.statsMap[v.id] || { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
        return [
          idx + 1,
          v.name || 'Vendor',
          v.category || 'General',
          v.phone || '-',
          v.gst || '-',
          Number(v.opening_balance) || 0,
          stats.totalPurchases,
          stats.totalPaid,
          stats.balancePayable,
          stats.balancePayable > 0 ? 'PAYMENT DUE' : 'SETTLED'
        ];
      });
      summaryRows.push([
        '',
        'TOTALS',
        '',
        '',
        '',
        (vendors || []).reduce((s, v) => s + (Number(v.opening_balance) || 0), 0),
        vendorLedgerStats.overall.totalPurchasesAll,
        vendorLedgerStats.overall.totalPaidAll,
        vendorLedgerStats.overall.totalPayableAll,
        ''
      ]);
      const wsSummary = XLSX.utils.aoa_to_sheet([...summaryHeaders, ...summaryRows]);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Vendor Summary');

      // Sheet 2: Material Inward & Purchases Register
      const materialHeaders = [
        ['GHARTAKKART - VENDOR MATERIAL INWARD & PURCHASES REGISTER'],
        [`Generated On: ${new Date().toLocaleString('en-IN')}`],
        [],
        ['Entry Ref', 'Date & Time', 'Vendor Name', 'Order / Bill Ref', 'Material / Product Name', 'Quantity', 'Unit / Pack', 'Wholesale Unit Rate (Rs)', 'Line Total Amount (Rs)', 'Billing Source', 'Status']
      ];
      const materialRows = [];
      let totalMaterialVal = 0;
      let totalMaterialUnits = 0;

      (vendorLedger || [])
        .filter(e => e && (e.type === 'purchase' || e.type === 'bill') && e.status !== 'cancelled')
        .forEach(entry => {
          const ven = (vendors || []).find(v => v.id === entry.vendor_id);
          const items = resolveEntryItems(entry);
          const vName = ven?.name || entry.vendor_id || 'Vendor';
          const ref = entry.order_id ? `ORD-${entry.order_id}` : (entry.reference_no || 'N/A');
          const dStr = entry.date ? new Date(entry.date).toLocaleString('en-IN') : '';

          if (items.length > 0) {
            items.forEach((it, iIdx) => {
              const lineCost = Number(it.total_cost || ((it.unit_cost || 0) * (it.qty || 1)));
              totalMaterialVal += lineCost;
              totalMaterialUnits += Number(it.qty || 1);
              materialRows.push([
                `${entry.id}-${iIdx + 1}`,
                dStr,
                vName,
                ref,
                it.name || 'Product',
                Number(it.qty || 1),
                it.unit || 'unit',
                Number(it.unit_cost || 0),
                lineCost,
                entry.type === 'purchase' ? 'Customer Order (Auto)' : 'Direct Purchase Bill',
                entry.status || 'active'
              ]);
            });
          } else {
            const amt = Number(entry.amount || 0);
            totalMaterialVal += amt;
            totalMaterialUnits += 1;
            materialRows.push([
              entry.id,
              dStr,
              vName,
              ref,
              entry.particulars || 'Material Inward',
              1,
              'lot',
              amt,
              amt,
              entry.type === 'purchase' ? 'Customer Order (Auto)' : 'Direct Purchase Bill',
              entry.status || 'active'
            ]);
          }
        });
      materialRows.push([
        '',
        'TOTALS',
        '',
        '',
        `${materialRows.length} Line Items`,
        totalMaterialUnits,
        '',
        '',
        totalMaterialVal,
        '',
        ''
      ]);
      const wsMaterial = XLSX.utils.aoa_to_sheet([...materialHeaders, ...materialRows]);
      XLSX.utils.book_append_sheet(wb, wsMaterial, 'Material Inward');

      // Sheet 3: Vendor Payments Register
      const paymentHeaders = [
        ['GHARTAKKART - VENDOR PAYMENTS REGISTER (DEBITS)'],
        [`Generated On: ${new Date().toLocaleString('en-IN')}`],
        [],
        ['Payment ID', 'Date & Time', 'Vendor Name', 'Payment Mode', 'Reference / UTR No', 'Amount Paid (Rs)', 'Notes / Particulars', 'Status']
      ];
      let totalPaymentsVal = 0;
      const paymentRows = (vendorLedger || [])
        .filter(e => e && e.type === 'payment' && e.status !== 'cancelled')
        .map(entry => {
          const ven = (vendors || []).find(v => v.id === entry.vendor_id);
          const amt = Number(entry.amount || 0);
          totalPaymentsVal += amt;
          return [
            entry.id,
            entry.date ? new Date(entry.date).toLocaleString('en-IN') : '',
            ven?.name || entry.vendor_id || 'Vendor',
            entry.payment_mode || 'Cash / Online',
            entry.reference_no || entry.utr || 'N/A',
            amt,
            entry.particulars || entry.notes || 'Settlement Payment',
            entry.status || 'active'
          ];
        });
      paymentRows.push([
        '',
        'TOTALS',
        '',
        '',
        `${paymentRows.length} Payments`,
        totalPaymentsVal,
        '',
        ''
      ]);
      const wsPayments = XLSX.utils.aoa_to_sheet([...paymentHeaders, ...paymentRows]);
      XLSX.utils.book_append_sheet(wb, wsPayments, 'Vendor Payments');

      // Sheet 4: Complete Master Journal
      const journalHeaders = [
        ['GHARTAKKART - VENDOR MASTER TRANSACTION JOURNAL'],
        [`Generated On: ${new Date().toLocaleString('en-IN')}`],
        [],
        ['Txn ID', 'Date & Time', 'Vendor Name', 'Type', 'Order / Ref', 'Item Details & Particulars', 'Purchase Credit (Rs)', 'Payment Debit (Rs)', 'Status']
      ];
      const journalRows = (vendorLedger || [])
        .filter(e => e && e.status !== 'cancelled')
        .map(e => {
          const ven = (vendors || []).find(v => v.id === e.vendor_id);
          const isPur = e.type === 'purchase' || e.type === 'bill';
          const items = resolveEntryItems(e);
          const itemsStr = items.length > 0
            ? items.map(i => `${i.qty}x ${i.name} @ Rs ${i.unit_cost} = Rs ${i.total_cost}`).join(' | ')
            : (e.particulars || '');
          return [
            e.id,
            e.date ? new Date(e.date).toLocaleString('en-IN') : '',
            ven?.name || e.vendor_id || 'Vendor',
            isPur ? 'MATERIAL INWARD' : 'PAYMENT TO VENDOR',
            e.order_id || e.reference_no || '-',
            itemsStr,
            isPur ? Number(e.amount || 0) : 0,
            !isPur ? Number(e.amount || 0) : 0,
            e.status || 'active'
          ];
        });
      const wsJournal = XLSX.utils.aoa_to_sheet([...journalHeaders, ...journalRows]);
      XLSX.utils.book_append_sheet(wb, wsJournal, 'Master Journal');

      // Trigger multi-sheet file download
      const filename = `GhartakKart_Vendor_Material_And_Payments_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error('Error generating Excel file:', err);
      alert('Could not generate Excel file: ' + err.message);
    }
  };

  // Automated Excel (.xlsx) Exporter for All Successfully Delivered Orders with Contact Details
  const handleDownloadDeliveredOrdersExcel = () => {
    try {
      const deliveredList = (orders || []).filter(o => {
        if (!o) return false;
        const st = String(o.order_status || '').trim().toLowerCase();
        return st === 'delivered' || st === 'completed';
      });

      if (deliveredList.length === 0) {
        alert('No delivered orders found in system yet to export.');
        return;
      }

      deliveredList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      const wb = XLSX.utils.book_new();

      const headers = [
        ['GHARTAKKART QUICK COMMERCE - DELIVERED ORDERS & CUSTOMER CONTACTS REGISTER'],
        [`Generated On: ${new Date().toLocaleString('en-IN')} | Total Successfully Delivered Orders: ${deliveredList.length}`],
        [],
        [
          'S.No',
          'Order ID',
          'Order Date & Time',
          'Customer Name',
          'Customer Mobile (+91)',
          'Alternate Phone',
          'Delivery Address',
          'Landmark',
          'City',
          'Pincode',
          'GPS Coordinates (Lat, Long)',
          'Distance (km)',
          'Delivery Slot',
          'Ordered Items (Qty x Item @ Price)',
          'Total Items Units',
          'Free Milestone Gift',
          'Subtotal (Rs)',
          'Delivery Fee (Rs)',
          'Coupon Discount (Rs)',
          'Coupon Code',
          'Wallet Cash Used (Rs)',
          'Net Total Paid (Rs)',
          'Payment Mode',
          'Payment Status',
          'Transaction / UPI Ref ID',
          'Delivered By (Rider)',
          'Rider Contact Phone',
          'Delivery Instructions',
          'Admin Remarks',
          'Order Status'
        ]
      ];

      let totalRevenue = 0;
      let totalDeliveryFees = 0;
      let totalDiscounts = 0;
      let totalWalletUsed = 0;
      let totalUnitsDelivered = 0;

      const rows = deliveredList.map((o, idx) => {
        const cleanPhone = String(o.customer_phone || o.address?.phone || '').replace(/\D/g, '').slice(-10);
        const altPhone = String(o.address?.phone && o.address.phone !== o.customer_phone ? o.address.phone : '').replace(/\D/g, '').slice(-10);
        const riderObj = (staff || []).find(s => s && (s.id === o.assigned_delivery_boy || s.id === o.delivery_boy_id || s.name === o.delivery_boy_name || s.id === o.assigned_staff_id));
        const riderName = riderObj?.name || o.delivery_boy_name || o.assigned_delivery_boy || (o.assigned_staff_id ? 'Rider Assigned' : 'Store Dispatch');
        const riderPhone = riderObj?.phone ? String(riderObj.phone).replace(/\D/g, '').slice(-10) : '';

        const itemsSummary = (o.items || [])
          .map(it => `${it.qty}x ${it.name}${it.unit ? ` (${it.unit})` : ''} @ Rs ${it.price} = Rs ${((Number(it.qty) || 1) * (Number(it.price) || 0))}`)
          .join(' | ');
        const totalUnits = (o.items || []).reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
        const gpsCoords = (o.address?.lat && o.address?.lng)
          ? `${o.address.lat}, ${o.address.lng}`
          : (o.userLocation?.lat && o.userLocation?.lng ? `${o.userLocation.lat}, ${o.userLocation.lng}` : '');
        const giftDesc = o.milestone_gift ? `${o.milestone_gift.name} (${o.milestone_gift.unit || 'Free'})` : 'None';

        const subtotal = Number(o.subtotal) || 0;
        const deliveryFee = Number(o.delivery_fee) || 0;
        const discount = Number(o.discount) || 0;
        const walletUsed = Number(o.wallet_used) || 0;
        const totalPaid = Number(o.total) || 0;

        totalRevenue += totalPaid;
        totalDeliveryFees += deliveryFee;
        totalDiscounts += discount;
        totalWalletUsed += walletUsed;
        totalUnitsDelivered += totalUnits;

        return [
          idx + 1,
          `#${o.id}`,
          o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '',
          o.customer_name || o.address?.name || 'Customer',
          cleanPhone ? `+91 ${cleanPhone}` : (o.customer_phone || ''),
          altPhone ? `+91 ${altPhone}` : '',
          o.address?.line1 || o.delivery_address || '',
          o.address?.landmark || '',
          o.address?.city || 'Khair',
          o.address?.pincode || '202138',
          gpsCoords,
          o.distance_km || 0,
          o.delivery_slot || 'Express',
          itemsSummary,
          totalUnits,
          giftDesc,
          subtotal,
          deliveryFee,
          discount,
          o.coupon_code || 'None',
          walletUsed,
          totalPaid,
          o.payment_method || 'Cash on Delivery',
          o.payment_status || 'Paid',
          o.razorpay_payment_id || o.upi_ref || '',
          riderName,
          riderPhone ? `+91 ${riderPhone}` : '',
          o.delivery_instructions || '',
          o.admin_remark || '',
          o.order_status || 'Delivered'
        ];
      });

      // Append Summary Row
      rows.push([
        '',
        'TOTALS',
        `${deliveredList.length} Delivered Orders`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        totalUnitsDelivered,
        '',
        '',
        totalDeliveryFees,
        totalDiscounts,
        '',
        totalWalletUsed,
        totalRevenue,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        'Completed'
      ]);

      const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);

      // Set clean column auto-widths for Excel
      ws['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 14 }, // Order ID
        { wch: 22 }, // Order Date
        { wch: 22 }, // Customer Name
        { wch: 18 }, // Mobile (+91)
        { wch: 18 }, // Alternate Phone
        { wch: 35 }, // Address
        { wch: 20 }, // Landmark
        { wch: 12 }, // City
        { wch: 10 }, // Pincode
        { wch: 24 }, // GPS
        { wch: 12 }, // Distance
        { wch: 16 }, // Slot
        { wch: 45 }, // Items Summary
        { wch: 14 }, // Total Units
        { wch: 22 }, // Milestone Gift
        { wch: 14 }, // Subtotal
        { wch: 14 }, // Delivery Fee
        { wch: 16 }, // Coupon Discount
        { wch: 14 }, // Coupon Code
        { wch: 16 }, // Wallet Used
        { wch: 18 }, // Net Total Paid
        { wch: 20 }, // Payment Mode
        { wch: 14 }, // Payment Status
        { wch: 24 }, // Transaction ID
        { wch: 20 }, // Rider Name
        { wch: 16 }, // Rider Phone
        { wch: 28 }, // Delivery Instructions
        { wch: 24 }, // Admin Remarks
        { wch: 14 }  // Order Status
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'Delivered Orders');

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `GhartakKart_Delivered_Orders_With_Contacts_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      if (addAuditLog) {
        addAuditLog({
          action: 'Export Delivered Orders',
          details: `Exported Excel (.xlsx) file with ${deliveredList.length} successfully delivered orders and customer contact details.`
        });
      }
    } catch (err) {
      console.error('Error generating Delivered Orders Excel:', err);
      // Fallback to CSV if workbook export encounters any issue
      handleExportExcel('delivered_orders');
    }
  };

  // Google Sheets Auto-Sync Helpers
  const handleSaveGoogleSheetWebhook = async (url) => {
    const updatedSettings = {
      ...(settings || {}),
      vendor_google_sheet_webhook: url.trim(),
      vendor_google_sheet_url: attachedGoogleSheetUrl,
      vendor_google_sheet_id: attachedGoogleSheetId
    };
    setSettings(updatedSettings);
    try { localStorage.setItem('gk_settings', JSON.stringify(updatedSettings)); } catch {}
    await syncToFirebase('settings', updatedSettings);
  };

  const handleSyncToGoogleSheet = async () => {
    if (!googleSheetWebhookUrl.trim()) {
      alert('Please enter your Google Apps Script Webhook URL first.');
      return;
    }
    setIsSyncingGoogleSheet(true);
    setGoogleSheetSyncSuccess(false);
    try {
      await handleSaveGoogleSheetWebhook(googleSheetWebhookUrl);
      const rowsToPush = (vendorLedger || []).map(entry => {
        const ven = (vendors || []).find(v => v.id === entry.vendor_id);
        const isPur = entry.type === 'purchase' || entry.type === 'bill';
        const items = resolveEntryItems(entry);
        const itemsStr = items.length > 0
          ? items.map(i => `${i.qty}x ${i.name} @ Rs ${i.unit_cost} = Rs ${i.total_cost}`).join(' | ')
          : (entry.particulars || '');
        return {
          date: entry.date ? new Date(entry.date).toLocaleString('en-IN') : '',
          vendor_name: ven?.name || entry.vendor_id || 'Vendor',
          type: isPur ? 'PURCHASE / INWARD' : 'PAYMENT',
          ref: entry.order_id || entry.reference_no || '-',
          items_summary: itemsStr,
          credit: isPur ? Number(entry.amount || 0) : 0,
          debit: !isPur ? Number(entry.amount || 0) : 0,
          status: entry.status || 'active'
        };
      });

      await fetch(googleSheetWebhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store: 'GhartakKart Khair',
          synced_at: new Date().toISOString(),
          entries: rowsToPush
        })
      });

      setGoogleSheetSyncSuccess(true);
      setTimeout(() => setGoogleSheetSyncSuccess(false), 5000);
    } catch (err) {
      console.error('Error syncing to Google Sheet:', err);
      alert('Sync failed: ' + err.message);
    } finally {
      setIsSyncingGoogleSheet(false);
    }
  };

  // Export Orders as CSV
  const handleExportCSV = () => {
    handleExportExcel('sales');
  };

  const filteredOrders = orders.filter(o => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'manual') return o.source === 'manual' || o.source === 'whatsapp' || o.source === 'phone' || o.source === 'walkin';
    return o.order_status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row antialiased font-sans selection:bg-amber-100 selection:text-amber-900">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Zepto / Blinkit Left Sidebar - Strictly pinned within viewport */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 xl:w-72 h-screen max-h-screen bg-white border-r border-slate-200/90 flex flex-col justify-between overflow-hidden transition-transform duration-200 ease-in-out lg:sticky lg:top-0 ${
          isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ring-2 ${isStaff ? 'bg-indigo-600 ring-indigo-100' : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 ring-amber-100'}`}>
              {isStaff ? 'ST' : 'GK'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 text-sm tracking-tight">GhartakKart</span>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${isStaff ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                  {isStaff ? 'Staff' : 'CRM'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">Khair Hub • Live</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action POS Button */}
        <div className="p-3 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsManualOrderModalOpen(true);
              setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer group"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-200 group-hover:scale-110 transition-transform" />
            <span>+ Manual / POS Order</span>
          </button>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
          {(isStaff
            ? [
                {
                  title: 'TERMINAL',
                  items: [
                    { id: 'orders', label: 'Order Processing 📦', icon: Package, badge: activeOrders.length, badgeColor: 'bg-emerald-600 text-white' }
                  ]
                }
              ]
            : [
                {
                  title: 'OPERATIONS',
                  items: [
                    { id: 'overview', label: 'Dashboard Stats', icon: TrendingUp },
                    { id: 'orders', label: 'Order Dispatch', icon: Package, badge: activeOrders.length, badgeColor: 'bg-emerald-600 text-white animate-pulse' },
                    { id: 'products', label: 'Products & Stock', icon: Layers, badge: lowStockProducts.length ? `⚠️ ${lowStockProducts.length}` : null, badgeColor: 'bg-amber-500 text-white' },
                    { id: 'categories', label: 'Categories & Mapping', icon: Sparkles }
                  ]
                },
                {
                  title: 'FINANCE & SUPPLY',
                  items: [
                    { id: 'vendors', label: 'Vendors & Ledger 🏪', icon: Store, badge: (vendors || []).length || null, badgeColor: 'bg-slate-100 text-slate-700 border border-slate-200' },
                    { id: 'vendor-sheet', label: 'Material & Payment Sheet 📑', icon: FileSpreadsheet, badge: 'Auto Excel', badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
                    { id: 'accounting', label: 'Expenses & P&L 💰', icon: DollarSign },
                    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 }
                  ]
                },
                {
                  title: 'GROWTH & REWARDS',
                  items: [
                    { id: 'offers', label: 'Offer Zone 🔥', icon: Flame, badge: (offers || []).filter(o => o.active !== false).length || null, badgeColor: 'bg-rose-500 text-white' },
                    { id: 'stamps', label: 'Customers & Wallet 👛', icon: Wallet, badge: stampCustomers.length, badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300' }
                  ]
                },
                {
                  title: 'STORE & FLEET',
                  items: [
                    { id: 'radius-settings', label: 'Delivery Radius', icon: MapPin },
                    { id: 'staff', label: 'Staff & Fleet Accounts 👥', icon: Users, badge: (staffUsers || []).length + staff.length, badgeColor: 'bg-slate-100 text-slate-700 border border-slate-200' },
                    { id: 'audit', label: 'Audit Logs 🛡️', icon: ShieldCheck, badge: (auditLogs || []).length || null, badgeColor: 'bg-slate-100 text-slate-700 border border-slate-200' }
                  ]
                }
              ]
          ).map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1">
                {group.title}
              </div>
              {group.items.map(item => {
                const Icon = item.icon;
                const isCurrent =
                  item.id === 'vendor-sheet'
                    ? (activeTab === 'vendors' && vendorSubTab === 'sheet')
                    : item.id === 'vendors'
                    ? (activeTab === 'vendors' && vendorSubTab !== 'sheet')
                    : (activeTab === item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.id === 'vendor-sheet') {
                        setActiveTab('vendors');
                        setVendorSubTab('sheet');
                      } else {
                        if (item.id === 'vendors' && vendorSubTab === 'sheet') {
                          setVendorSubTab('directory');
                        }
                        setActiveTab(item.id);
                      }
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-500/10 text-amber-900 font-bold border-l-4 border-amber-500 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-amber-600' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-700'}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer with User Card - Permanently visible at bottom */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${isStaff ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'}`}>
                {isStaff ? 'ST' : 'AD'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {isStaff ? activeStaffName : (adminAuth?.user?.username || adminAuth?.username || 'Admin')}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {isStaff ? 'Staff Operator' : 'Super Admin'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logoutAdmin}
              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">
                  {isStaff
                    ? 'Staff Order Terminal'
                    : activeTab === 'overview'
                    ? 'Operations Dashboard'
                    : activeTab === 'orders'
                    ? 'Order Dispatch Terminal'
                    : activeTab === 'products'
                    ? 'Products & Stock'
                    : activeTab === 'categories'
                    ? 'Categories & Mapping'
                    : activeTab === 'vendors'
                    ? 'Vendors & Ledger'
                    : activeTab === 'accounting'
                    ? 'Expenses & P&L Statements'
                    : activeTab === 'reports'
                    ? 'Reports & Analytics'
                    : activeTab === 'offers'
                    ? 'Offer Zone'
                    : activeTab === 'stamps'
                    ? 'Customer Accounts & Wallet 👛'
                    : activeTab === 'radius-settings'
                    ? 'Delivery Radius Settings'
                    : activeTab === 'staff'
                    ? 'Staff & Fleet Accounts'
                    : activeTab === 'audit'
                    ? 'Security Audit Log'
                    : 'Admin Center'}
                </h1>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
                {isStaff && (
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3 text-indigo-500" />
                    Orders Only
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap shrink-0">
            {/* Store Open/Close Toggle */}
            {!isStaff && (
              <button
                type="button"
                onClick={handleQuickToggleStoreOpen}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                  storeIsOpen
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 animate-pulse'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${storeIsOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="hidden sm:inline">{storeIsOpen ? 'Store: OPEN' : 'Store: CLOSED'}</span>
                <span className="sm:hidden">{storeIsOpen ? 'OPEN' : 'CLOSED'}</span>
              </button>
            )}

            {/* Quick Manual Order Button */}
            <button
              type="button"
              onClick={() => setIsManualOrderModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              title="Create Manual Order for WhatsApp or Phone call customer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">+ Manual Order</span>
              <span className="sm:hidden">+ Order</span>
            </button>

            {/* Sound Bell Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !adminSoundEnabled;
                setAdminSoundEnabled(next);
                if (next) playChime('new_order');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                adminSoundEnabled
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
              title="Toggle Order Alert Sound"
            >
              {adminSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden md:inline">{adminSoundEnabled ? 'Bell: ON' : 'Muted'}</span>
            </button>

            {/* Mobile Push Notification Status / Enable Button */}
            {notifPermission === 'granted' ? (
              <button
                type="button"
                onClick={handleTestNotification}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                title="Mobile Push is Active. Click to Test Notification."
              >
                <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                <span>Push: Active</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 transition-all cursor-pointer shadow-2xs animate-bounce"
                title="Click to Enable Mobile Notifications & Custom Ringtone"
              >
                <Bell className="w-3.5 h-3.5 text-slate-950" />
                <span>Enable Push</span>
              </button>
            )}

            {/* Screen Wake Lock Toggle */}
            {typeof navigator !== 'undefined' && 'wakeLock' in navigator && (
              <button
                type="button"
                onClick={handleToggleWakeLock}
                className={`hidden xl:flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isWakeLockActive
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                }`}
                title="Keep screen awake so mobile does not sleep and orders stay live"
              >
                {isWakeLockActive ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                <span>{isWakeLockActive ? 'Awake: ON' : 'Awake'}</span>
              </button>
            )}

            {/* Delivered Orders Excel Download */}
            <button
              type="button"
              onClick={handleDownloadDeliveredOrdersExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              title="Download all delivered orders with customer contact details in Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Delivered Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* CSV Export - Super Admin only */}
            {!isStaff && (
              <button
                type="button"
                onClick={handleExportCSV}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>CSV</span>
              </button>
            )}

            {/* Storefront Link */}
            <a
              href="https://vertexpsbyri.web.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors shrink-0 whitespace-nowrap"
            >
              <Store className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">Storefront ↗</span>
            </a>

            {/* Quick Header Logout Button */}
            <button
              type="button"
              onClick={logoutAdmin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="Log Out of Admin Panel"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Action: Create Manual / WhatsApp Order */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-500/40">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
                  💬
                </div>
                <div>
                  <h4 className="font-black text-base sm:text-lg flex items-center gap-2 flex-wrap text-white">
                    <span>Manual Order POS (WhatsApp & Phone Call)</span>
                    <span className="bg-emerald-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Offline Desk
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100 mt-0.5 max-w-xl leading-relaxed">
                    Customer ordered on WhatsApp or phone call? Click to select catalogue products, enter customer address, and place order directly into store dispatch.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsManualOrderModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs sm:text-sm rounded-xl shadow-xl cursor-pointer transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4 text-emerald-700 stroke-[3]" />
                <span>+ Create Manual Order</span>
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Today's Revenue</span>
                <span className="text-2xl font-black text-gray-900 mt-1 block">₹{totalRevenue}</span>
                <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Live Gross Volume
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Active Orders</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">{activeOrders.length}</span>
                <span className="text-[11px] text-gray-500 mt-1 block">In preparation or on route</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Completed Deliveries</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">{deliveredOrders.length}</span>
                <span className="text-[11px] text-gray-500 mt-1 block">Delivered successfully</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Low Stock Alerts</span>
                <span className="text-2xl font-black text-rose-600 mt-1 block">{lowStockProducts.length}</span>
                <span className="text-[11px] text-rose-600 font-semibold mt-1 block">Need immediate replenishment</span>
              </div>
            </div>

            {lowStockProducts.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Critical Inventory Warnings (Stock &le; 15)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-rose-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-gray-900 block truncate">{p.name}</span>
                        <span className="text-[10px] text-gray-500">{p.unit}</span>
                      </div>
                      <span className="font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg text-xs">
                        {p.stock} left
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: ORDER MANAGEMENT ================= */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Mobile Push Notification Setup / Status Banner */}
            {notifPermission !== 'granted' ? (
              <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-emerald-500/15 border-2 border-amber-400/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white shadow-md">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-gray-950 flex items-center justify-center shrink-0 shadow-sm font-black">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-amber-300 flex items-center gap-2 flex-wrap">
                      <span>🔔 Mobile Order Notifications & Alert Tone</span>
                      <span className="bg-amber-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                        Action Required
                      </span>
                    </h4>
                    <p className="text-xs text-gray-200 mt-1 leading-relaxed">
                      To receive instant mobile notifications and your custom order ringtone when your phone is locked or in your pocket, click <strong>"Enable Mobile Notifications"</strong> below and tap <strong>Allow</strong> in the browser prompt.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all transform hover:scale-105"
                  >
                    Enable Mobile Notifications
                  </button>
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 cursor-pointer transition-all"
                    title="Test Sound Tone"
                  >
                    🔊 Test Ringtone
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>✅ Mobile Push Notifications & Custom Ringtone Active for Incoming Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestNotification}
                    className="px-3 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/50 rounded-lg font-bold text-[11px] cursor-pointer"
                  >
                    🔊 Test Ringtone & Pop-up
                  </button>
                  {typeof navigator !== 'undefined' && 'wakeLock' in navigator && (
                    <button
                      type="button"
                      onClick={handleToggleWakeLock}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] border cursor-pointer ${
                        isWakeLockActive
                          ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                          : 'bg-gray-800 border-gray-700 text-gray-300'
                      }`}
                    >
                      {isWakeLockActive ? '☀️ Screen Keep Awake: ON' : '🌙 Keep Screen Awake'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Create Manual / WhatsApp Order Card Banner */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 rounded-2xl p-4 sm:p-5 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-emerald-500/40">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl shadow-inner shrink-0">
                  💬
                </div>
                <div>
                  <h4 className="font-black text-base sm:text-lg flex items-center gap-2 flex-wrap text-white">
                    <span>Manual Order POS (WhatsApp & Phone Call)</span>
                    <span className="bg-emerald-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Offline Desk
                    </span>
                  </h4>
                  <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
                    Customer called on phone or sent items list on WhatsApp? Click below to select products, add customer address, and place their order into store dispatch!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsManualOrderModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs sm:text-sm rounded-xl shadow-xl cursor-pointer transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-700 stroke-[3]" />
                  <span>+ Create Manual Order</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['all', 'Placed', 'Accepted', 'Packing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      statusFilter === st
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {st === 'all' ? 'All Orders' : st}
                    {st !== 'all' && (
                      <span className="ml-1.5 opacity-75 font-normal">
                        ({orders.filter(o => o.order_status === st).length})
                      </span>
                    )}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setStatusFilter('manual')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'manual'
                      ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Manual / WhatsApp</span>
                  <span className="opacity-80 font-normal">
                    ({orders.filter(o => o.source === 'manual' || o.source === 'whatsapp' || o.source === 'phone' || o.source === 'walkin').length})
                  </span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadDeliveredOrdersExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shrink-0"
                  title="Download all successfully delivered orders with complete customer contact details as Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                  <span>📥 Download Delivered Orders (Excel)</span>
                  <span className="bg-emerald-900/60 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black">
                    {orders.filter(o => {
                      const st = String(o?.order_status || '').toLowerCase();
                      return st === 'delivered' || st === 'completed';
                    }).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManualOrderModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4 text-emerald-200" />
                  <span>+ New Manual Order (WhatsApp / Phone)</span>
                </button>
              </div>
            </div>

            {/* Delivered Orders Highlight Banner when Delivered filter is active */}
            {statusFilter === 'Delivered' && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-xs animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
                      <span>Delivered Orders Archive</span>
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {orders.filter(o => String(o?.order_status || '').toLowerCase() === 'delivered' || String(o?.order_status || '').toLowerCase() === 'completed').length} Orders
                      </span>
                    </h4>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Export all delivered customer contact details (mobile numbers, full addresses, items, and payments) directly to Excel.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadDeliveredOrdersExcel}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>📥 Download Excel File (.xlsx)</span>
                </button>
              </div>
            )}

            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-bold">No orders found for this filter</p>
                </div>
              ) : (
                filteredOrders.map(order => {
                  const assignedRider = staff.find(s => s.id === order.assigned_staff_id);

                  return (
                    <div
                      key={order.id}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 hover:border-gray-300 shadow-sm transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-900">
                            #{order.id ? String(order.id).slice(-4) : '0000'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-extrabold text-sm text-gray-900">{order.customer_name || 'Customer'}</h3>
                              <span className="text-xs text-gray-400 font-medium">({order.customer_phone || 'N/A'})</span>
                              {isCustomerBlocked(order.customer_phone) && (
                                <span className="text-[10px] bg-rose-600 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                                  <Ban className="w-3 h-3" /> BLOCKED NUMBER
                                </span>
                              )}
                              {order.source && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  {order.source === 'whatsapp' ? '💬 WhatsApp' : order.source === 'phone' ? '📞 Phone' : '🏪 Walk-in'}
                                </span>
                              )}
                              {order.vendor_name ? (
                                <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  🏪 {order.vendor_name}
                                </span>
                              ) : order.vendor_id ? (
                                <span className="text-[10px] bg-purple-100 text-purple-900 border border-purple-300 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                  🏪 {(vendors || []).find(v => v.id === order.vendor_id)?.name || 'Assigned'}
                                </span>
                              ) : null}
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                                {order.distance_km || 0} km away
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {order.address?.line1 || 'Delivery Address'} • {order.delivery_slot || 'ASAP (25-35 mins)'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenFullEditOrderModal(order)}
                            className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            title="Edit Order details, items, address, payment & status"
                          >
                            <Edit className="w-3.5 h-3.5 text-brand-600" />
                            <span>Edit Order ✏️</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditOrderVendor(order)}
                            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                            title="Edit Order to Fill / Change Vendor Name manually"
                          >
                            <Store className="w-3.5 h-3.5 text-purple-600" />
                            <span>{order.vendor_name || order.vendor_id ? `Edit Vendor (${order.vendor_name || 'Assigned'}) 🏪` : '+ Fill Vendor 🏪'}</span>
                          </button>

                          {order.customer_phone && (
                            <button
                              type="button"
                              onClick={() => handleShareWhatsAppReceipt(order)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                              title="Share Order Bill directly to customer via WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp Bill 💬</span>
                            </button>
                          )}

                          {order.customer_phone && (
                            isCustomerBlocked(order.customer_phone) ? (
                              <button
                                type="button"
                                onClick={() => handleUnblockCustomer(order.customer_phone)}
                                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                title="Customer phone is blocked. Click to Unblock"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Unblock Number</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePromptBlockCustomer(order.customer_phone, order.customer_name)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                                title="Block this customer phone number from placing fake orders"
                              >
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Block Number 🚫</span>
                              </button>
                            )
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenPrintInvoice(order)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5 text-brand-600" />
                            <span>Print Receipt / Slip 🖨️</span>
                          </button>
                        </div>
                      </div>

                      <div className="bg-emerald-50/80 rounded-2xl p-3.5 border border-emerald-300 text-xs space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 text-xs">Customer Shared Live Location:</span>
                              <span className="ml-2 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-emerald-300 text-emerald-950 font-bold">
                                📍 Lat: {order.address?.lat ? Number(order.address.lat).toFixed(5) : 'N/A'}, Lng: {order.address?.lng ? Number(order.address.lng).toFixed(5) : 'N/A'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {(() => {
                              const lat = Number(order.address?.lat) || Number(settings?.store_lat) || 27.941887;
                              const lng = Number(order.address?.lng) || Number(settings?.store_lng) || 77.843715;
                              const sLat = Number(settings?.store_lat) || Number(storeLat) || 27.941887;
                              const sLng = Number(settings?.store_lng) || Number(storeLng) || 77.843715;
                              const mapsPinUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
                              const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${sLat},${sLng}&destination=${lat},${lng}&travelmode=driving`;
                              const itemsText = (order.items || []).map(it => `${it.qty || 1}x ${it.name || 'Item'}`).join(', ');
                              const freeGiftLine = order.milestone_gift ? `\n🎁 *FREE Milestone Gift (₹${order.milestone_gift.tier_amount}+):* 1x ${order.milestone_gift.name} (${order.milestone_gift.unit || '1 Pack'})` : '';
                              const dispatchText = encodeURIComponent(
`🚀 *GHARTAKKART DELIVERY DISPATCH*
📦 *Order ID:* #${order.id || ''}
👤 *Customer:* ${order.customer_name || 'Customer'}
📞 *Mobile:* ${order.customer_phone || ''}
🏠 *Address:* ${order.address?.line1 || ''}${order.address?.landmark ? ' (Landmark: ' + order.address.landmark + ')' : ''}
📍 *Distance:* ${order.distance_km || 0} km from store
💰 *Total Amount:* ₹${order.total || 0} (${order.payment_method || 'UPI'} - ${order.payment_status || 'Paid'})
🛍️ *Items:* ${itemsText}${freeGiftLine}
${order.admin_remark ? `📝 *Admin Note:* ${order.admin_remark}\n` : ''}
📍 *Customer Map Location:* ${mapsPinUrl}
🧭 *Store-to-Customer Navigation:* ${directionsUrl}`
                              );

                              const targetPhone = assignedRider?.phone ? assignedRider.phone.replace(/\D/g, '').slice(-10) : null;
                              const waUrl = targetPhone
                                ? `https://api.whatsapp.com/send?phone=91${targetPhone}&text=${dispatchText}`
                                : `https://api.whatsapp.com/send?text=${dispatchText}`;

                              return (
                                <>
                                  <a
                                    href={mapsPinUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl border border-emerald-300 transition-all flex items-center gap-1.5 shadow-sm text-xs"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Customer Map Pin</span>
                                  </a>

                                  <a
                                    href={directionsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm text-xs"
                                  >
                                    <Navigation className="w-3.5 h-3.5" />
                                    <span>Store → Customer Route</span>
                                  </a>

                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/25 text-xs"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>📲 Share with Rider (WhatsApp)</span>
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => handleCopyDispatch(order)}
                                    className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 font-bold rounded-xl border border-gray-300 transition-all flex items-center gap-1.5 shadow-sm text-xs"
                                  >
                                    {copiedDispatchId === order.id ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span className="text-emerald-700">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-gray-500" />
                                        <span>Copy Info</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700 text-[11px] pt-1.5 border-t border-emerald-200">
                          <div>
                            <span className="text-gray-500 font-medium">Delivery Address: </span>
                            <strong className="text-gray-900">{order.address?.line1 || 'Main Market, Khair'}</strong>
                            {order.address?.landmark && (
                              <span className="text-gray-600 block">Landmark: {order.address.landmark}</span>
                            )}
                          </div>
                          <div className="sm:text-right">
                            <span className="text-gray-500 font-medium">Haversine Distance: </span>
                            <strong className="text-brand-700">{order.distance_km || 0} km from Store</strong>
                            <span className="text-gray-500 block">City: {order.address?.city || 'Khair'} (PIN: {order.address?.pincode || '202138'})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex-1 min-w-[280px]">
                          <span className="font-bold text-gray-400 text-[10px] uppercase block mb-1">
                            Items ({(order.items || []).length}{order.milestone_gift ? ' + 1 Free Gift' : ''}):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {(order.items || []).map((it, idx) => {
                              const hasVendor = Boolean(it.vendor_name || it.vendor_id);
                              const itemVendorLabel = it.vendor_name || (vendors || []).find(v => v.id === it.vendor_id)?.name || 'Assign';
                              return (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100/90 border border-gray-200 rounded-xl px-2.5 py-1 text-xs transition-all shadow-2xs"
                                >
                                  <span className="font-semibold text-gray-800">
                                    <strong className="text-brand-700 font-black">{it.qty}x</strong> {it.name}
                                    {it.unit ? <span className="text-[10px] text-gray-500 font-normal ml-1">({it.unit})</span> : null}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenItemVendorModal(order, idx, it)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                      hasVendor
                                        ? 'bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300'
                                        : 'bg-white hover:bg-purple-50 text-purple-700 border border-dashed border-purple-300 hover:border-purple-400'
                                    }`}
                                    title={hasVendor ? `Assigned Vendor: ${itemVendorLabel} (Click to change)` : `Assign Vendor for ${it.name}`}
                                  >
                                    <Store className="w-3 h-3 text-purple-600 shrink-0" />
                                    <span className="truncate max-w-[120px]">{hasVendor ? itemVendorLabel : '+ Vendor'}</span>
                                  </button>
                                </div>
                              );
                            })}
                            {order.milestone_gift && (
                              <span className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-xs">
                                <span>🎁 FREE GIFT (₹{order.milestone_gift.tier_amount}+):</span>
                                <strong className="text-emerald-700">1x {order.milestone_gift.name}</strong>
                                <span className="text-[10px] text-emerald-600 font-semibold">({order.milestone_gift.unit || order.milestone_gift.category})</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-gray-400 text-[10px] uppercase block">Total Amount</span>
                          <span className="text-lg font-black text-gray-900">₹{order.total || 0}</span>
                          <span className="text-[10px] text-gray-500 block">
                            {order.payment_method || 'UPI'} ({order.payment_status || 'Paid'})
                          </span>
                          {order.order_status === 'Cancelled' ? (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              ❌ Cancelled (0 Stamps)
                            </span>
                          ) : ((Number(order.total) || 0) >= 250 || order.earned_stamp) ? (
                            <span className="text-[10px] text-amber-600 font-bold block">
                              ⭐ +1 Loyalty Stamp
                            </span>
                          ) : null}
                          {order.scratch_card && (
                            <span className={`text-[10px] font-bold block ${
                              order.scratch_card.isScratched ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              🪙 1% Cashback: ₹{order.scratch_card.amount} ({order.scratch_card.isScratched ? 'Claimed in Wallet' : 'Unscratched'})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Pipeline & Rider Assignment (Real-Time Customer Sync) */}
                      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 p-3 sm:px-5 rounded-b-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">Update Status:</span>
                          <select
                            value={order.order_status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value, order.assigned_staff_id)}
                            className={`text-xs font-black rounded-xl px-3 py-1.5 border transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm ${
                              order.order_status === 'Delivered'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                : order.order_status === 'Cancelled'
                                ? 'bg-rose-50 border-rose-300 text-rose-800'
                                : order.order_status === 'Out for Delivery'
                                ? 'bg-blue-50 border-blue-300 text-blue-800'
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>

                          {lastUpdatedOrderId === order.id && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300 animate-pulse">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Live Synced to Customer</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-bold text-gray-700">Vendor:</span>
                            <select
                              value={order.vendor_id || ''}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                  handleOpenEditOrderVendor(order);
                                } else {
                                  handleQuickAssignVendor(order.id, e.target.value);
                                }
                              }}
                              className="text-xs font-semibold bg-white border border-gray-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 max-w-[150px] truncate"
                            >
                              <option value="">-- No Vendor --</option>
                              {(vendors || []).map(v => (
                                <option key={v.id} value={v.id}>
                                  {v.name}
                                </option>
                              ))}
                              <option value="__custom__">✏️ Custom / Edit Name...</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleOpenEditOrderVendor(order)}
                              className="p-1 text-purple-700 hover:bg-purple-100 rounded-lg cursor-pointer"
                              title="Edit Vendor Name Manually"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <Bike className="w-4 h-4 text-gray-500" />
                            <span className="text-xs font-bold text-gray-600">Assign Rider:</span>
                            <select
                              value={order.assigned_staff_id || ''}
                              onChange={(e) => handleUpdateOrderStatus(order.id, order.order_status, e.target.value)}
                              className="text-xs font-medium bg-white border border-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            >
                              <option value="">-- Select Rider --</option>
                              {staff.map(st => (
                                <option key={st.id} value={st.id}>
                                  {st.name} ({st.vehicle})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: PRODUCTS & INVENTORY ================= */}
        {activeTab === 'products' && (() => {
          const availableSubs = Array.from(
            new Set(
              products
                .filter(p => productCategoryFilter === 'all' || p.category_id === productCategoryFilter)
                .map(p => (p.subcategory || '').trim())
                .filter(Boolean)
            )
          );

          const adminFilteredProducts = products.filter(p => {
            if (productCategoryFilter !== 'all' && p.category_id !== productCategoryFilter) return false;
            if (
              productSubcategoryFilter !== 'all' &&
              (p.subcategory || '').trim().toLowerCase() !== productSubcategoryFilter.toLowerCase()
            ) {
              return false;
            }
            if (productSearch) {
              const q = productSearch.toLowerCase().trim();
              const matchName = (p.name || '').toLowerCase().includes(q);
              const matchSub = (p.subcategory || '').toLowerCase().includes(q);
              const matchBrand = (p.brand || '').toLowerCase().includes(q);
              const matchUnit = (p.unit || '').toLowerCase().includes(q);
              if (!matchName && !matchSub && !matchBrand && !matchUnit) return false;
            }
            return true;
          }).filter((() => {
            const seen = new Set();
            return (p) => {
              if (!p) return false;
              const key = `${p.id || ''}_${String(p.name || '').trim().toLowerCase()}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            };
          })());

          return (
            <div className="space-y-4">
              {/* Top Search, Category Filter & Add Product Bar */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px] max-w-md">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name, subcategory, brand, or weight..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={productSubcategoryFilter}
                      onChange={(e) => setProductSubcategoryFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                    >
                      <option value="all">All Subcategories ({availableSubs.length})</option>
                      {availableSubs.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleOpenProductModal(null)}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-600/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New Product (with Weights & Prices)</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setProductCategoryFilter('all');
                      setProductSubcategoryFilter('all');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
                      productCategoryFilter === 'all'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All Categories ({products.length})
                  </button>
                  {categories.map(cat => {
                    const count = products.filter(p => p.category_id === cat.id).length;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setProductCategoryFilter(cat.id);
                          setProductSubcategoryFilter('all');
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all ${
                          productCategoryFilter === cat.id
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3">Category / Sub</th>
                        <th className="p-3">Base Unit & Price</th>
                        <th className="p-3">Weight & Price Options (Variants)</th>
                        <th className="p-3">Purchase Cost</th>
                        <th className="p-3">Margin</th>
                        <th className="p-3">Stock</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {adminFilteredProducts.map(p => {
                        const catObj = categories.find(c => c.id === p.category_id);
                        const validVars = Array.isArray(p.variants)
                          ? p.variants.filter(
                              v => v && String(v.unit || '').trim() !== '' && String(v.unit || '').trim() !== '0' && Number(v.price) > 0
                            )
                          : [];
                        const vars = validVars.length > 0
                          ? validVars
                          : [
                              {
                                id: 'primary',
                                unit: (p.unit && String(p.unit).trim() !== '0') ? p.unit : '1 unit',
                                purchase_price: Number(p.purchase_price) || 0,
                                price: Number(p.price) || 0,
                                mrp: Number(p.mrp || p.price) || 0,
                                stock: Number(p.stock) || 0
                              }
                            ];

                        const displayUnit = (p.unit && String(p.unit).trim() !== '0' && Number(p.price) > 0)
                          ? p.unit
                          : (vars[0]?.unit || '1 unit');
                        const displayPrice = Number(p.price) > 0 ? Number(p.price) : (Number(vars[0]?.price) || 0);
                        const displayMrp = (Number(p.mrp) > 0 && Number(p.price) > 0)
                          ? Number(p.mrp)
                          : (Number(vars[0]?.mrp) || displayPrice);

                        const singleCost = Number(vars[0]?.purchase_price) || Number(p.purchase_price) || 0;
                        const singleSell = Number(vars[0]?.price) || displayPrice;
                        const singleMargin = singleSell > 0 && singleCost > 0 ? singleSell - singleCost : null;
                        const singleMarginPct = singleCost > 0 && singleMargin !== null ? Math.round((singleMargin / singleCost) * 100) : null;

                        return (
                          <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={p.images?.[0] || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-xl object-cover shrink-0 border"
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80';
                                  }}
                                />
                                <div>
                                  <span className="font-bold text-gray-900 block truncate max-w-[180px]">{p.name}</span>
                                  <span className="text-[10px] text-gray-400">{p.brand || 'GhartakKart'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-gray-800 block text-[11px]">
                                {catObj ? catObj.name : p.category_id}
                              </span>
                              {p.subcategory && (
                                <span className="inline-block mt-0.5 text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                  {p.subcategory}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="font-black text-brand-700 text-sm">₹{displayPrice}</span>
                              {displayMrp > displayPrice && (
                                <span className="text-[10px] text-gray-400 line-through ml-1">₹{displayMrp}</span>
                              )}
                              <span className="block text-[10px] font-semibold text-gray-500">{displayUnit}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {vars.map((v, idx) => (
                                  <span
                                    key={v.id || idx}
                                    className="px-2 py-0.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-900 font-bold text-[10px]"
                                  >
                                    {v.unit}: <strong>₹{v.price}</strong>
                                  </span>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => handleOpenProductModal(p)}
                                  className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px] cursor-pointer"
                                  title="Add or edit weights & prices"
                                >
                                  + Weights/Prices
                                </button>
                              </div>
                            </td>
                            <td className="p-3 font-mono text-gray-600">
                              {vars.length > 1 ? (
                                <div className="space-y-1">
                                  {vars.map((v, idx) => {
                                    const vCost = Number(v.purchase_price) || Number(p.purchase_price) || 0;
                                    return (
                                      <div key={v.id || idx} className="text-[10px] flex items-center gap-1 whitespace-nowrap">
                                        <span className="font-sans font-bold text-gray-500">{v.unit}:</span>
                                        {vCost > 0 ? (
                                          <span className="font-mono font-bold text-gray-800">₹{vCost}</span>
                                        ) : (
                                          <span className="text-gray-300">-</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                singleCost > 0 ? `₹${singleCost}` : <span className="text-gray-300">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {vars.length > 1 ? (
                                <div className="space-y-1">
                                  {vars.map((v, idx) => {
                                    const vCost = Number(v.purchase_price) || Number(p.purchase_price) || 0;
                                    const vSell = Number(v.price) || 0;
                                    const vMargin = vSell > 0 && vCost > 0 ? vSell - vCost : null;
                                    const vMarginPct = vCost > 0 && vMargin !== null ? Math.round((vMargin / vCost) * 100) : null;
                                    return (
                                      <div key={v.id || idx} className="flex items-center gap-1 whitespace-nowrap">
                                        <span className="text-[10px] font-bold text-gray-500">{v.unit}:</span>
                                        {vMargin !== null ? (
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                            vMargin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                          }`}>
                                            {vMargin >= 0 ? `+₹${vMargin}` : `-₹${Math.abs(vMargin)}`} ({vMarginPct}%)
                                          </span>
                                        ) : (
                                          <span className="text-gray-300 text-[10px]">-</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                singleMargin !== null ? (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    singleMargin >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}>
                                    {singleMargin >= 0 ? `+₹${singleMargin}` : `-₹${Math.abs(singleMargin)}`} ({singleMarginPct}%)
                                  </span>
                                ) : (
                                  <span className="text-gray-300 text-[10px]">-</span>
                                )
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                p.stock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {p.stock} units
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenProductModal(p)}
                                  className="p-1.5 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Product & Weight Options"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Product"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ================= TAB 3.01: VENDOR LIST & AUTOMATED ORDER LEDGER ================= */}
        {isSuperAdmin && activeTab === 'vendors' && (
          <div className="space-y-6">
            {/* Header with Title and Action Buttons */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Vendor Directory & Automated Order Ledger</span>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        ⚡ Real-Time Auto-Billing
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Customer orders automatically credit the assigned vendor ledger. Track purchases, payments, and balances.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={attachedGoogleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Open the attached Google Sheet directly in a new browser tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>📊 Open Attached Google Sheet ↗</span>
                </a>
                <button
                  type="button"
                  onClick={handleDownloadMultiSheetVendorExcel}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95"
                  title="Download Automated 4-Sheet Excel Workbook (.xlsx) with Material Inward, Payments, Summary & Master Journal"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>📥 Download Automated Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGoogleSheetModalOpen(true)}
                  className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Connect Live Google Sheet Webhook Sync"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                  <span>☁️ Google Sheets Sync</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportExcel('vendors')}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Download All Vendors CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Vendors CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportExcel('vendor_ledger')}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Download Complete Vendor Ledger Transactions"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Full Ledger Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenVendorPayment(vendors[0] || null)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>+ Record Payment</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenVendorBill(vendors[0] || null)}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>+ Record Purchase Bill</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetAllVendorBalances}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Clear all vendor dues and make balance zero"
                >
                  <Check className="w-3.5 h-3.5 text-rose-600" />
                  <span>Zero All Balances (₹0)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenVendorModal()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add New Vendor</span>
                </button>
              </div>
            </div>

            {/* Top Aggregate Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Registered Vendors</p>
                  <p className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">{(vendors || []).length}</p>
                  <p className="text-[10px] text-gray-400 truncate">{(vendors || []).filter(v => v.status === 'active').length} Active Suppliers</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Total Purchases (Billed)</p>
                  <p className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5">₹{vendorLedgerStats.overall.totalPurchasesAll.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-amber-700 truncate">Orders & wholesale stock</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">Total Paid to Vendors</p>
                  <p className="text-xl sm:text-2xl font-black text-emerald-800 mt-0.5">₹{vendorLedgerStats.overall.totalPaidAll.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-emerald-600 truncate">Debited settlements</p>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm flex items-center gap-3 ${
                vendorLedgerStats.overall.totalPayableAll > 0
                  ? 'bg-rose-50/80 border-rose-200'
                  : 'bg-emerald-50/80 border-emerald-200'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                  vendorLedgerStats.overall.totalPayableAll > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  <Coins className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider truncate">Net Payable to Vendors</p>
                  <p className={`text-xl sm:text-2xl font-black mt-0.5 ${
                    vendorLedgerStats.overall.totalPayableAll > 0 ? 'text-rose-900' : 'text-emerald-900'
                  }`}>
                    ₹{Math.max(0, vendorLedgerStats.overall.totalPayableAll).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-gray-500 truncate">
                    {vendorLedgerStats.overall.totalPayableAll > 0 ? '⚠️ Outstanding balance owed' : '✅ All vendor bills cleared'}
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Vendor Directory vs Automated Order Ledger */}
            <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setVendorSubTab('directory')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  vendorSubTab === 'directory'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Vendor Directory & Accounts</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {(vendors || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVendorSubTab('ledger')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  vendorSubTab === 'ledger'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Automated Order Ledger Stream</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {(vendorLedger || []).length} Transactions
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVendorSubTab('sheet')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  vendorSubTab === 'sheet'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl font-black'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Automated Material & Payment Excel Sheet</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-300">
                  ⚡ Live Sheet
                </span>
              </button>
            </div>

            {/* SUB-TAB 1: VENDOR DIRECTORY */}
            {vendorSubTab === 'directory' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={vendorSearch}
                      onChange={(e) => setVendorSearch(e.target.value)}
                      placeholder="Search vendor name, shop, phone, GST, category..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={vendorCategoryFilter}
                      onChange={(e) => setVendorCategoryFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-semibold focus:outline-none"
                    >
                      <option value="all">All Categories</option>
                      <option value="Fruits">Fruits & Vegetables</option>
                      <option value="Dairy">Dairy & Milk</option>
                      <option value="Grocery">Grocery & FMCG</option>
                      <option value="Packaging">Packaging Materials</option>
                    </select>
                  </div>
                </div>

                {/* Vendors Table / Cards */}
                {(() => {
                  const filteredVendors = (vendors || []).filter(v => {
                    if (vendorCategoryFilter !== 'all' && !v.category?.toLowerCase().includes(vendorCategoryFilter.toLowerCase())) return false;
                    if (vendorSearch.trim()) {
                      const q = vendorSearch.toLowerCase();
                      const matchName = v.name?.toLowerCase().includes(q);
                      const matchCompany = v.company_name?.toLowerCase().includes(q);
                      const matchPhone = v.phone?.includes(q);
                      const matchGst = v.gst?.toLowerCase().includes(q);
                      const matchCat = v.category?.toLowerCase().includes(q);
                      if (!matchName && !matchCompany && !matchPhone && !matchGst && !matchCat) return false;
                    }
                    return true;
                  });

                  if (filteredVendors.length === 0) {
                    return (
                      <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
                        <Store className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-sm text-gray-800">No vendors found</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or add your first supplier/vendor.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenVendorModal()}
                          className="mt-4 px-4 py-2 bg-brand-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                        >
                          + Add Vendor Now
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Mobile View: Clean Structured Cards */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredVendors.map(v => {
                          const stats = vendorLedgerStats.statsMap[v.id] || { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
                          const cleanPhone = (v.phone || '').replace(/\D/g, '').slice(-10);
                          return (
                            <div key={v.id} className="p-4 space-y-3">
                              {/* Header & Badges */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="font-extrabold text-sm text-gray-900 truncate">{v.name}</h4>
                                  {v.company_name && (
                                    <p className="text-xs text-gray-500 font-semibold truncate">{v.company_name}</p>
                                  )}
                                  {v.address && (
                                    <p className="text-[10px] text-gray-400 truncate mt-0.5">📍 {v.address}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                                    {v.category || 'General'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    v.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {v.status || 'active'}
                                  </span>
                                </div>
                              </div>

                              {/* Contact */}
                              {cleanPhone && (
                                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
                                  <a href={`tel:${cleanPhone}`} className="text-brand-700 font-bold flex items-center gap-1">
                                    📞 {v.phone}
                                  </a>
                                  <a
                                    href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${v.name}, regarding GhartakKart store supplier account.`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1"
                                  >
                                    WA 💬
                                  </a>
                                </div>
                              )}

                              {/* 3-Col Financial Metrics */}
                              <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100 text-center">
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 uppercase">Purchases</p>
                                  <p className="text-xs font-black text-gray-900 mt-0.5">₹{stats.totalPurchases.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 uppercase">Paid</p>
                                  <p className="text-xs font-black text-emerald-700 mt-0.5">₹{stats.totalPaid.toLocaleString('en-IN')}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-gray-500 uppercase">Balance</p>
                                  <span className={`inline-block font-black px-1.5 py-0.5 rounded-lg text-[10px] mt-0.5 ${
                                    stats.balancePayable > 0
                                      ? 'bg-rose-100 text-rose-900'
                                      : stats.balancePayable === 0
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : 'bg-blue-100 text-blue-900'
                                  }`}>
                                    ₹{Math.abs(stats.balancePayable).toLocaleString('en-IN')}
                                    {stats.balancePayable > 0 ? ' (Due)' : stats.balancePayable === 0 ? ' (0)' : ' (Adv)'}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="grid grid-cols-4 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenVendorPayment(v)}
                                  className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  💳 Pay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenVendorBill(v)}
                                  className="py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  📑 Bill
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenVendorStatement(v)}
                                  className="py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                                >
                                  📄 Ledger
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSettleVendorToZero(v)}
                                  className="py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
                                  title="Clear balance to ₹0 (Nothing Due)"
                                >
                                  ✓ Zero ₹0
                                </button>
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 text-xs">
                                <button
                                  type="button"
                                  onClick={() => handleOpenVendorModal(v)}
                                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVendor(v.id)}
                                  className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop View: Full Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100/80 text-gray-700 uppercase font-extrabold border-b border-gray-200">
                              <th className="py-3 px-4">Vendor & Shop Name</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-3">Contact (Call / WA)</th>
                              <th className="py-3 px-3 text-right">Total Purchases (Rs)</th>
                              <th className="py-3 px-3 text-right">Total Paid (Rs)</th>
                              <th className="py-3 px-4 text-right">Balance Payable</th>
                              <th className="py-3 px-3 text-center">Status</th>
                              <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredVendors.map(v => {
                              const stats = vendorLedgerStats.statsMap[v.id] || { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
                              const cleanPhone = (v.phone || '').replace(/\D/g, '').slice(-10);
                              return (
                                <tr key={v.id} className="hover:bg-amber-50/40 transition-colors">
                                  <td className="py-3.5 px-4">
                                    <div className="font-extrabold text-gray-900 text-sm">{v.name}</div>
                                    {v.company_name && (
                                      <div className="text-[11px] text-gray-500 font-semibold">{v.company_name}</div>
                                    )}
                                    {v.address && (
                                      <div className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5">
                                        📍 {v.address}
                                      </div>
                                    )}
                                    {v.gst && (
                                      <span className="inline-block bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded text-[9px] font-mono mt-0.5">
                                        GSTIN: {v.gst}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                                      {v.category || 'General'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3">
                                    {cleanPhone ? (
                                      <div className="flex items-center gap-1.5">
                                        <a
                                          href={`tel:${cleanPhone}`}
                                          className="text-gray-800 hover:text-brand-600 font-bold"
                                        >
                                          {v.phone}
                                        </a>
                                        <a
                                          href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(`Hello ${v.name}, regarding GhartakKart store supplier account.`)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold"
                                          title="Chat on WhatsApp"
                                        >
                                          WA 💬
                                        </a>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                    {v.email && <div className="text-[10px] text-gray-400">{v.email}</div>}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-bold text-gray-900">
                                    ₹{stats.totalPurchases.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                                    ₹{stats.totalPaid.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <span className={`inline-block font-black px-2.5 py-1 rounded-xl text-xs ${
                                      stats.balancePayable > 0
                                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                        : stats.balancePayable === 0
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                                    }`}>
                                      ₹{Math.abs(stats.balancePayable).toLocaleString('en-IN')}
                                      {stats.balancePayable > 0 ? ' (Owed)' : stats.balancePayable === 0 ? ' (Settled)' : ' (Advance)'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      v.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {v.status || 'active'}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVendorPayment(v)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                                        title="Record Payment to this Vendor"
                                      >
                                        💳 Pay
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVendorBill(v)}
                                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                                        title="Record Purchase Bill"
                                      >
                                        📑 Bill
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVendorStatement(v)}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold cursor-pointer"
                                        title="View Detailed Account Statement"
                                      >
                                        📄 Statement
                                      </button>
                                      {stats.balancePayable !== 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleSettleVendorToZero(v)}
                                          className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                                          title="Clear balance to ₹0 (Nothing Due)"
                                        >
                                          ✓ Zero ₹0
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenVendorModal(v)}
                                        className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                                        title="Edit Vendor"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteVendor(v.id)}
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                        title="Delete Vendor"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-TAB 3: AUTOMATED EXCEL SHEET (MATERIAL & PAYMENTS) */}
            {vendorSubTab === 'sheet' && (() => {
              // Extract all individual material inward items across orders & purchase bills
              const allMaterialItems = [];
              let totalMaterialsSum = 0;
              let totalUnitsSum = 0;

              (vendorLedger || [])
                .filter(e => e && (e.type === 'purchase' || e.type === 'bill') && e.status !== 'cancelled')
                .forEach(entry => {
                  const ven = (vendors || []).find(v => v.id === entry.vendor_id);
                  const items = resolveEntryItems(entry);
                  const vName = ven?.name || entry.vendor_id || 'Vendor';
                  const ref = entry.order_id ? `ORD-${entry.order_id}` : (entry.reference_no || 'N/A');
                  const d = entry.date ? new Date(entry.date) : new Date();

                  if (items.length > 0) {
                    items.forEach((it, idx) => {
                      const lineCost = Number(it.total_cost != null ? it.total_cost : ((it.unit_cost || 0) * (it.qty || 1)));
                      totalMaterialsSum += lineCost;
                      totalUnitsSum += Number(it.qty || 1);
                      allMaterialItems.push({
                        rowId: `${entry.id}-${idx}`,
                        date: d,
                        vendorId: entry.vendor_id,
                        vendorName: vName,
                        vendorCategory: ven?.category || 'General',
                        ref: ref,
                        orderId: entry.order_id,
                        materialName: it.name || 'Product Item',
                        qty: Number(it.qty || 1),
                        unit: it.unit || 'unit',
                        unitCost: Number(it.unit_cost || 0),
                        totalCost: lineCost,
                        source: entry.type === 'purchase' ? 'Customer Order (Auto)' : 'Direct Purchase Bill',
                        status: entry.status || 'active'
                      });
                    });
                  } else {
                    const amt = Number(entry.amount || 0);
                    totalMaterialsSum += amt;
                    totalUnitsSum += 1;
                    allMaterialItems.push({
                      rowId: entry.id,
                      date: d,
                      vendorId: entry.vendor_id,
                      vendorName: vName,
                      vendorCategory: ven?.category || 'General',
                      ref: ref,
                      orderId: entry.order_id,
                      materialName: entry.particulars || 'Wholesale Material',
                      qty: 1,
                      unit: 'lot',
                      unitCost: amt,
                      totalCost: amt,
                      source: entry.type === 'purchase' ? 'Customer Order (Auto)' : 'Direct Purchase Bill',
                      status: entry.status || 'active'
                    });
                  }
                });

              // Extract all payments made to vendors
              let totalPaymentsSum = 0;
              const allPayments = (vendorLedger || [])
                .filter(e => e && e.type === 'payment' && e.status !== 'cancelled')
                .map(entry => {
                  const ven = (vendors || []).find(v => v.id === entry.vendor_id);
                  const amt = Number(entry.amount || 0);
                  totalPaymentsSum += amt;
                  return {
                    id: entry.id,
                    date: entry.date ? new Date(entry.date) : new Date(),
                    vendorId: entry.vendor_id,
                    vendorName: ven?.name || entry.vendor_id || 'Vendor',
                    vendorCategory: ven?.category || 'General',
                    mode: entry.payment_mode || 'Cash / Online',
                    ref: entry.reference_no || entry.utr || 'N/A',
                    amount: amt,
                    notes: entry.particulars || entry.notes || 'Settlement Payment',
                    status: entry.status || 'active'
                  };
                });

              // Master Journal rows
              const allJournalRows = (vendorLedger || [])
                .filter(e => e && e.status !== 'cancelled')
                .map(e => {
                  const ven = (vendors || []).find(v => v.id === e.vendor_id);
                  const isPur = e.type === 'purchase' || e.type === 'bill';
                  const items = resolveEntryItems(e);
                  return {
                    id: e.id,
                    date: e.date ? new Date(e.date) : new Date(),
                    vendorId: e.vendor_id,
                    vendorName: ven?.name || e.vendor_id || 'Vendor',
                    type: isPur ? 'PURCHASE / INWARD' : 'PAYMENT TO VENDOR',
                    ref: e.order_id ? `#${e.order_id}` : (e.reference_no || '-'),
                    items: items,
                    particulars: e.particulars || '',
                    credit: isPur ? Number(e.amount || 0) : 0,
                    debit: !isPur ? Number(e.amount || 0) : 0,
                    status: e.status || 'active'
                  };
                });

              // Filter helper function
              const filterCommon = (dateObj, vendorId, textFields) => {
                if (excelVendorFilter !== 'all' && vendorId !== excelVendorFilter) return false;
                if (excelDateFilter !== 'all') {
                  const now = new Date();
                  if (excelDateFilter === 'today' && dateObj.toDateString() !== now.toDateString()) return false;
                  if (excelDateFilter === 'week' && dateObj < new Date(now.getTime() - 7 * 86400000)) return false;
                  if (excelDateFilter === 'month' && (dateObj.getMonth() !== now.getMonth() || dateObj.getFullYear() !== now.getFullYear())) return false;
                }
                if (excelSearch.trim()) {
                  const q = excelSearch.toLowerCase();
                  return textFields.some(tf => String(tf || '').toLowerCase().includes(q));
                }
                return true;
              };

              const filteredMaterials = allMaterialItems.filter(m =>
                filterCommon(m.date, m.vendorId, [m.vendorName, m.materialName, m.ref, m.source])
              );

              const filteredPayments = allPayments.filter(p =>
                filterCommon(p.date, p.vendorId, [p.vendorName, p.ref, p.mode, p.notes])
              );

              const filteredJournal = allJournalRows.filter(j =>
                filterCommon(j.date, j.vendorId, [j.vendorName, j.ref, j.type, j.particulars, ...(j.items || []).map(i => i.name)])
              );

              const filteredSummaryVendors = (vendors || []).filter(v => {
                if (excelVendorFilter !== 'all' && v.id !== excelVendorFilter) return false;
                if (excelSearch.trim()) {
                  const q = excelSearch.toLowerCase();
                  return v.name?.toLowerCase().includes(q) || v.company_name?.toLowerCase().includes(q) || v.phone?.includes(q) || v.gst?.toLowerCase().includes(q);
                }
                return true;
              });

              return (
                <div className="space-y-4">
                  {/* Top Automated Excel Sheet Header Card */}
                  <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg border border-emerald-500/30">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-emerald-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                            Live Automated Workbook
                          </span>
                          <span className="text-xs text-emerald-200">
                            Attached directly with GhartakKart Admin CRM
                          </span>
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                          <span>Vendor Material & Payments Automated Excel Sheet</span>
                        </h3>
                        <p className="text-xs text-emerald-100 max-w-2xl leading-relaxed">
                          Continuous synchronized spreadsheet capturing wholesale inventory materials received, quantities, unit prices, and settlement payment vouchers.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <a
                          href={attachedGoogleSheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 transform hover:scale-[1.02] active:scale-95"
                          title="Open attached Google Sheet (1UWjAKy9lqLOD_mhzD2KULs_P133WWWZZN8jLlKq8o14)"
                        >
                          <ExternalLink className="w-4 h-4 text-slate-950" />
                          <span>Open Attached Google Sheet ↗</span>
                        </a>
                        <button
                          type="button"
                          onClick={handleDownloadMultiSheetVendorExcel}
                          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 transform hover:scale-[1.02] active:scale-95"
                          title="Download official multi-sheet Excel file (.xlsx)"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                          <span>Download Excel (.xlsx)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsGoogleSheetModalOpen(true)}
                          className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-md"
                          title="Connect Google Sheet Webhook for real-time live sync"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>Google Sheets Live Sync</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="p-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition-colors cursor-pointer"
                          title="Print Current Sheet"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* KPI Quick Banner */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-emerald-600/40">
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Total Material Inward</p>
                        <p className="text-lg sm:text-xl font-black font-mono mt-0.5">₹{totalMaterialsSum.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Total Material Units</p>
                        <p className="text-lg sm:text-xl font-black font-mono mt-0.5">{totalUnitsSum.toLocaleString('en-IN')} Units</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Total Payments Paid</p>
                        <p className="text-lg sm:text-xl font-black font-mono text-emerald-300 mt-0.5">₹{totalPaymentsSum.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10">
                        <p className="text-[10px] uppercase font-bold text-emerald-200">Net Outstanding Balance</p>
                        <p className="text-lg sm:text-xl font-black font-mono text-rose-300 mt-0.5">
                          ₹{Math.max(0, vendorLedgerStats.overall.totalPayableAll).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Attached Google Sheet Info Banner */}
                  <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                        📊
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-slate-900">
                            Attached Google Sheet:
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-300 truncate max-w-[280px] sm:max-w-md">
                            {attachedGoogleSheetId}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Connected & Attached
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                          Direct Sheet URL: <a href={attachedGoogleSheetUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-mono">{attachedGoogleSheetUrl}</a>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('embedded')}
                        className={`px-3 py-1.5 text-xs font-black rounded-xl transition-colors flex items-center gap-1 cursor-pointer ${
                          excelActiveSheet === 'embedded'
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Interactive Embed</span>
                      </button>
                      <a
                        href={attachedGoogleSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in New Tab ↗</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setIsGoogleSheetModalOpen(true)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Auto-Sync Setup</span>
                      </button>
                    </div>
                  </div>

                  {/* Excel Sheet Navigation Bar (Tabs like Excel) */}
                  <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('materials')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                          excelActiveSheet === 'materials'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Sheet 1: Material Inward Register</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${excelActiveSheet === 'materials' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {allMaterialItems.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('payments')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                          excelActiveSheet === 'payments'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Sheet 2: Vendor Payments Register</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${excelActiveSheet === 'payments' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {allPayments.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('summary')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                          excelActiveSheet === 'summary'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Sheet 3: Vendor Balances & Summary</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${excelActiveSheet === 'summary' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {(vendors || []).length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('journal')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                          excelActiveSheet === 'journal'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Sheet 4: Complete Master Journal</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${excelActiveSheet === 'journal' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                          {allJournalRows.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExcelActiveSheet('embedded')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                          excelActiveSheet === 'embedded'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300'
                        }`}
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        <span>🟢 Sheet 5: Attached Google Sheet (Live View)</span>
                      </button>
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 pr-2">
                      Spreadsheet: <span className="font-mono text-slate-800">GhartakKart_Workbook.xlsx</span>
                    </div>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                      {/* Vendor Filter */}
                      <select
                        value={excelVendorFilter}
                        onChange={(e) => setExcelVendorFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold focus:outline-none"
                      >
                        <option value="all">All Vendors ({vendors.length})</option>
                        {(vendors || []).map(v => (
                          <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                        ))}
                      </select>

                      {/* Date Filter */}
                      <select
                        value={excelDateFilter}
                        onChange={(e) => setExcelDateFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold focus:outline-none"
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">Past 7 Days</option>
                        <option value="month">This Month</option>
                      </select>
                    </div>

                    <div className="relative min-w-[240px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={excelSearch}
                        onChange={(e) => setExcelSearch(e.target.value)}
                        placeholder="Search material item, vendor, ref..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  {/* SPREADSHEET TABLE CONTENT */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* SHEET 1: MATERIAL INWARD REGISTER */}
                    {excelActiveSheet === 'materials' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b border-slate-200 text-[11px]">
                              <th className="py-3 px-3">Date & Time</th>
                              <th className="py-3 px-3">Vendor Name</th>
                              <th className="py-3 px-3">Order / Bill Ref</th>
                              <th className="py-3 px-4">Material / Product Name</th>
                              <th className="py-3 px-2 text-center">Qty</th>
                              <th className="py-3 px-2">Unit</th>
                              <th className="py-3 px-3 text-right">Wholesale Rate</th>
                              <th className="py-3 px-3 text-right">Line Total (₹)</th>
                              <th className="py-3 px-3">Billing Source</th>
                              <th className="py-3 px-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredMaterials.length === 0 ? (
                              <tr>
                                <td colSpan={10} className="py-12 text-center text-slate-400">
                                  No material inward records found matching the current filters.
                                </td>
                              </tr>
                            ) : (
                              filteredMaterials.map(m => (
                                <tr key={m.rowId} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 text-[11px] font-mono">
                                    {m.date ? m.date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                    {m.vendorName}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                    {m.ref}
                                  </td>
                                  <td className="py-2.5 px-4 font-semibold text-slate-900">
                                    {m.materialName}
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className="bg-amber-100 text-amber-900 font-black text-xs px-2 py-0.5 rounded-md">
                                      {m.qty}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-slate-500 font-medium">
                                    {m.unit}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    ₹{m.unitCost.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                    ₹{m.totalCost.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-3 text-[11px] text-slate-500">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.source.includes('Auto') ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-purple-50 text-purple-800 border border-purple-200'}`}>
                                      {m.source}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {m.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {filteredMaterials.length > 0 && (
                            <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                              <tr>
                                <td colSpan={4} className="py-3 px-4">
                                  TOTAL MATERIAL INWARD ({filteredMaterials.length} rows)
                                </td>
                                <td className="py-3 px-2 text-center font-mono">
                                  {filteredMaterials.reduce((sum, m) => sum + m.qty, 0)} Units
                                </td>
                                <td colSpan={2}></td>
                                <td className="py-3 px-3 text-right font-mono text-sm text-emerald-900">
                                  ₹{filteredMaterials.reduce((sum, m) => sum + m.totalCost, 0).toLocaleString('en-IN')}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}

                    {/* SHEET 2: VENDOR PAYMENTS REGISTER */}
                    {excelActiveSheet === 'payments' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b border-slate-200 text-[11px]">
                              <th className="py-3 px-3">Date & Time</th>
                              <th className="py-3 px-3">Vendor Name</th>
                              <th className="py-3 px-3">Payment Mode</th>
                              <th className="py-3 px-3">Reference / UTR</th>
                              <th className="py-3 px-3 text-right">Amount Paid (₹)</th>
                              <th className="py-3 px-4">Notes / Particulars</th>
                              <th className="py-3 px-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredPayments.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                  No payment vouchers found matching the current filters.
                                </td>
                              </tr>
                            ) : (
                              filteredPayments.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 text-[11px] font-mono">
                                    {p.date ? p.date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                                    {p.vendorName}
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                                      {p.mode}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                    {p.ref}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm whitespace-nowrap">
                                    ₹{p.amount.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-700 text-xs">
                                    {p.notes}
                                  </td>
                                  <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {p.status}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                          {filteredPayments.length > 0 && (
                            <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                              <tr>
                                <td colSpan={4} className="py-3 px-4">
                                  TOTAL VENDOR PAYMENTS ({filteredPayments.length} vouchers)
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-sm text-emerald-700">
                                  ₹{filteredPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}

                    {/* SHEET 3: VENDOR BALANCES & SUMMARY */}
                    {excelActiveSheet === 'summary' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b border-slate-200 text-[11px]">
                              <th className="py-3 px-3">#</th>
                              <th className="py-3 px-4">Vendor Name</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-3">Phone</th>
                              <th className="py-3 px-3">GSTIN</th>
                              <th className="py-3 px-3 text-right">Opening (₹)</th>
                              <th className="py-3 px-3 text-right">Materials Inward (₹)</th>
                              <th className="py-3 px-3 text-right">Payments Made (₹)</th>
                              <th className="py-3 px-3 text-right">Balance Due (₹)</th>
                              <th className="py-3 px-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredSummaryVendors.map((v, idx) => {
                              const stats = vendorLedgerStats.statsMap[v.id] || { totalPurchases: 0, totalPaid: 0, balancePayable: 0 };
                              return (
                                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                                  <td className="py-2.5 px-4 font-bold text-slate-900">{v.name}</td>
                                  <td className="py-2.5 px-3 text-slate-600">{v.category || 'General'}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">{v.phone || '-'}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">{v.gst || '-'}</td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    ₹{Number(v.opening_balance || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                                    ₹{stats.totalPurchases.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                    ₹{stats.totalPaid.toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">
                                    {stats.balancePayable > 0 ? (
                                      <span className="text-rose-700 font-bold">₹{stats.balancePayable.toLocaleString('en-IN')} (Due)</span>
                                    ) : (
                                      <span className="text-emerald-700">₹0.00 (Settled)</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-2 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stats.balancePayable > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {stats.balancePayable > 0 ? 'Due' : 'Cleared'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SHEET 4: MASTER CHRONOLOGICAL JOURNAL */}
                    {excelActiveSheet === 'journal' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 uppercase font-black border-b border-slate-200 text-[11px]">
                              <th className="py-3 px-3">Date & Time</th>
                              <th className="py-3 px-3">Vendor Name</th>
                              <th className="py-3 px-3">Type</th>
                              <th className="py-3 px-3">Ref</th>
                              <th className="py-3 px-4">Items / Description</th>
                              <th className="py-3 px-3 text-right">Credit / Inward (₹)</th>
                              <th className="py-3 px-3 text-right">Debit / Paid (₹)</th>
                              <th className="py-3 px-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {filteredJournal.map(j => (
                              <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                                  {j.date ? j.date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">{j.vendorName}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${j.type.includes('PURCHASE') ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'}`}>
                                    {j.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{j.ref}</td>
                                <td className="py-2.5 px-4 text-slate-800 text-xs">
                                  <div className="font-semibold">{j.particulars}</div>
                                  {Array.isArray(j.items) && j.items.length > 0 && (
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      {j.items.map(it => `${it.qty}x ${it.name} (₹${it.unit_cost})`).join(', ')}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-900">
                                  {j.credit > 0 ? `₹${j.credit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                  {j.debit > 0 ? `₹${j.debit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="py-2.5 px-2 text-center">
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {j.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* SHEET 5: ATTACHED GOOGLE SHEET EMBEDDED VIEW */}
                    {excelActiveSheet === 'embedded' && (
                      <div className="bg-white rounded-2xl overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-extrabold text-xs text-slate-800">
                              Attached Google Sheet Interactive Viewer
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-md">
                              ID: {attachedGoogleSheetId}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={attachedGoogleSheetUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in Full Google Sheets ↗</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                const ifr = document.getElementById('attached-gsheet-iframe');
                                if (ifr) ifr.src = ifr.src;
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              🔄 Reload Embed
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-50 min-h-[680px] p-2 flex flex-col items-center">
                          <iframe
                            id="attached-gsheet-iframe"
                            src={`https://docs.google.com/spreadsheets/d/${attachedGoogleSheetId}/htmlembed?widget=true&headers=false`}
                            className="w-full h-[720px] rounded-xl border border-slate-200 bg-white shadow-inner"
                            title="Attached Google Sheet"
                          />
                          <div className="mt-3 text-center text-[11px] text-slate-500 max-w-xl pb-2">
                            💡 If the interactive viewer doesn't load above due to Google sign-in cookies or iframe security, click <a href={attachedGoogleSheetUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-bold underline">Open in Full Google Sheets ↗</a> to edit directly with your Google account.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SUB-TAB 2: AUTOMATED ORDER LEDGER */}
            {vendorSubTab === 'ledger' && (
              <div className="space-y-4">
                {/* Filter Controls */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {/* Vendor Selector */}
                    <select
                      value={ledgerVendorFilter}
                      onChange={(e) => setLedgerVendorFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                    >
                      <option value="all">All Vendors ({vendors.length})</option>
                      {(vendors || []).map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                      ))}
                    </select>

                    {/* Transaction Type Filter */}
                    <select
                      value={ledgerTypeFilter}
                      onChange={(e) => setLedgerTypeFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                    >
                      <option value="all">All Transactions</option>
                      <option value="purchase">📦 Customer Order Purchases (Credit)</option>
                      <option value="payment">💳 Payments to Vendor (Debit)</option>
                      <option value="bill">📑 Direct Purchase Bills</option>
                    </select>

                    {/* Date Filter */}
                    <select
                      value={ledgerDateFilter}
                      onChange={(e) => setLedgerDateFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="week">Past 7 Days</option>
                      <option value="month">This Month</option>
                    </select>
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder="Search order ID / ref / item..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                {(() => {
                  const filteredLedger = (vendorLedger || []).filter(entry => {
                    if (ledgerVendorFilter !== 'all' && entry.vendor_id !== ledgerVendorFilter) return false;
                    if (ledgerTypeFilter !== 'all' && entry.type !== ledgerTypeFilter) return false;
                    if (ledgerDateFilter !== 'all' && entry.date) {
                      const d = new Date(entry.date);
                      const now = new Date();
                      if (ledgerDateFilter === 'today' && d.toDateString() !== now.toDateString()) return false;
                      if (ledgerDateFilter === 'week' && d < new Date(now.getTime() - 7 * 86400000)) return false;
                      if (ledgerDateFilter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
                    }
                    if (ledgerSearch.trim()) {
                      const q = ledgerSearch.toLowerCase();
                      const matchOrd = String(entry.order_id || '').toLowerCase().includes(q);
                      const matchRef = String(entry.reference_no || '').toLowerCase().includes(q);
                      const matchPart = String(entry.particulars || '').toLowerCase().includes(q);
                      if (!matchOrd && !matchRef && !matchPart) return false;
                    }
                    return true;
                  });

                  if (filteredLedger.length === 0) {
                    return (
                      <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-sm text-gray-800">No ledger transactions found</p>
                        <p className="text-xs text-gray-400 mt-1">
                          When customer orders are placed or direct vendor bills/payments are recorded, they automatically appear here.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Mobile View: Systematic Transaction Cards */}
                      <div className="md:hidden divide-y divide-gray-100">
                        {filteredLedger.map(entry => {
                          const ven = (vendors || []).find(v => v.id === entry.vendor_id);
                          const isPurchase = entry.type === 'purchase' || entry.type === 'bill';
                          const isCancelled = entry.status === 'cancelled';
                          return (
                            <div key={entry.id} className={`p-4 space-y-2.5 ${isCancelled ? 'opacity-50 bg-gray-50' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                                    <span>{ven?.name || entry.vendor_id}</span>
                                    {entry.order_id && (
                                      <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-bold">
                                        #{entry.order_id}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                    {entry.date ? new Date(entry.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black inline-block ${
                                    entry.type === 'purchase'
                                      ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                      : entry.type === 'payment'
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                      : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                  }`}>
                                    {entry.type === 'purchase' ? '📦 Auto Purchase' : entry.type === 'payment' ? '💳 Payment' : '📑 Direct Bill'}
                                  </span>
                                  <div className="mt-1 font-mono font-black text-sm">
                                    {isPurchase ? (
                                      <span className="text-amber-900">+₹{Number(entry.amount || 0).toLocaleString('en-IN')} (Cr)</span>
                                    ) : (
                                      <span className="text-emerald-700">-₹{Number(entry.amount || 0).toLocaleString('en-IN')} (Dr)</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {(() => {
                                const resolvedItems = resolveEntryItems(entry);
                                return (
                                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="font-bold text-xs text-slate-900 leading-snug">{entry.particulars}</p>
                                      {resolvedItems.length > 0 && (
                                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                                          {resolvedItems.length} {resolvedItems.length === 1 ? 'item' : 'items'}
                                        </span>
                                      )}
                                    </div>

                                    {resolvedItems.length > 0 && (
                                      <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                          <span>Item Name & Unit</span>
                                          <span>Qty & Subtotal</span>
                                        </div>
                                        {resolvedItems.map((it, idx) => (
                                          <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200/60 shadow-2xs">
                                            <div className="min-w-0">
                                              <span className="font-bold text-slate-800">
                                                <span className="font-black text-amber-700 mr-1.5">{it.qty}x</span>
                                                {it.name}
                                              </span>
                                              {it.unit && (
                                                <span className="text-slate-400 text-[10px] ml-1 font-normal">({it.unit})</span>
                                              )}
                                            </div>
                                            <div className="font-mono text-right shrink-0">
                                              {it.unit_cost > 0 && (
                                                <span className="text-slate-400 text-[10px] mr-1">@{it.unit_cost}</span>
                                              )}
                                              <strong className="text-slate-900 text-xs font-bold">₹{Number(it.total_cost || 0).toLocaleString('en-IN')}</strong>
                                            </div>
                                          </div>
                                        ))}
                                        <div className="flex items-center justify-between pt-1 text-xs font-bold text-slate-700">
                                          <span className="text-[11px] text-slate-500">Items Total:</span>
                                          <span className="font-mono text-amber-900 font-black">
                                            ₹{resolvedItems.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0).toLocaleString('en-IN')}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop View: Full Wide Table */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100/80 text-gray-700 uppercase font-extrabold border-b border-gray-200">
                              <th className="py-3 px-4">Date & Time</th>
                              <th className="py-3 px-3">Vendor</th>
                              <th className="py-3 px-3">Type</th>
                              <th className="py-3 px-3">Order / Ref</th>
                              <th className="py-3 px-4">Particulars / Items Detail</th>
                              <th className="py-3 px-3 text-right">Purchase (Credit)</th>
                              <th className="py-3 px-3 text-right">Payment (Debit)</th>
                              <th className="py-3 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {filteredLedger.map(entry => {
                              const ven = (vendors || []).find(v => v.id === entry.vendor_id);
                              const isPurchase = entry.type === 'purchase' || entry.type === 'bill';
                              const isCancelled = entry.status === 'cancelled';
                              return (
                                <tr key={entry.id} className={`hover:bg-gray-50 transition-colors ${isCancelled ? 'opacity-50 line-through' : ''}`}>
                                  <td className="py-3 px-4 whitespace-nowrap text-gray-600 text-[11px]">
                                    {entry.date ? new Date(entry.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                                    {ven?.name || entry.vendor_id}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                      entry.type === 'purchase'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                        : entry.type === 'payment'
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                        : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                    }`}>
                                      {entry.type === 'purchase' ? '📦 Auto Purchase' : entry.type === 'payment' ? '💳 Payment' : '📑 Direct Bill'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 font-mono font-bold text-gray-700 whitespace-nowrap">
                                    {entry.order_id ? `#${entry.order_id}` : (entry.reference_no || 'N/A')}
                                  </td>
                                  <td className="py-3 px-4 min-w-[280px] max-w-md text-gray-800 text-xs">
                                    <div className="font-semibold text-slate-900 text-xs mb-1">
                                      {entry.particulars}
                                    </div>
                                    {(() => {
                                      const resolvedItems = resolveEntryItems(entry);
                                      if (resolvedItems.length === 0) return null;
                                      return (
                                        <div className="mt-1.5 space-y-1 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 shadow-2xs">
                                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-200/70">
                                            <span>Full Item Details ({resolvedItems.length})</span>
                                            <span>Qty & Total Cost</span>
                                          </div>
                                          <div className="space-y-1 max-h-48 overflow-y-auto">
                                            {resolvedItems.map((it, idx) => (
                                              <div key={idx} className="flex items-center justify-between gap-3 text-[11px] bg-white px-2 py-1 rounded-lg border border-slate-200/60">
                                                <div className="min-w-0 flex items-center gap-1.5">
                                                  <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-black text-[10px] flex items-center justify-center shrink-0">
                                                    {it.qty}
                                                  </span>
                                                  <span className="font-semibold text-slate-800 truncate" title={it.name}>
                                                    {it.name} {it.unit ? <span className="text-slate-400 font-normal">({it.unit})</span> : ''}
                                                  </span>
                                                </div>
                                                <div className="font-mono text-right shrink-0 whitespace-nowrap">
                                                  {it.unit_cost > 0 && (
                                                    <span className="text-slate-400 text-[10px] mr-1">@{it.unit_cost}</span>
                                                  )}
                                                  <strong className="text-slate-900 font-bold">= ₹{Number(it.total_cost || 0).toLocaleString('en-IN')}</strong>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-[11px] font-bold text-slate-700">
                                            <span className="text-slate-500 font-semibold">Total Wholesale Cost:</span>
                                            <span className="font-mono text-amber-900 font-black">
                                              ₹{resolvedItems.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0).toLocaleString('en-IN')}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-3 px-3 text-right font-extrabold text-amber-900 whitespace-nowrap">
                                    {isPurchase ? `₹${Number(entry.amount || 0).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                                    {!isPurchase ? `₹${Number(entry.amount || 0).toLocaleString('en-IN')}` : '-'}
                                  </td>
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      isCancelled ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                    }`}>
                                      {entry.status || 'active'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3.02: EXPENSES & INCOME (ACCOUNTING P&L) ================= */}
        {isSuperAdmin && activeTab === 'accounting' && (
          <div className="space-y-6">
            {/* Header with Title and Action Buttons */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Expense, Income & Profit/Loss Accounting</span>
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        Financial P&L Module
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Monitor daily store operating expenses, customer sales inflow, and net business profitability.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={accountingDateFilter}
                  onChange={(e) => setAccountingDateFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-extrabold focus:outline-none"
                >
                  <option value="all">📅 All Time Records</option>
                  <option value="today">📅 Today</option>
                  <option value="this_week">📅 This Week (7 Days)</option>
                  <option value="this_month">📅 This Month</option>
                  <option value="last_month">📅 Last Month</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleExportExcel('pnl')}
                  className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Download Comprehensive Profit & Loss Statement"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>P&L Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExportExcel('expenses')}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  title="Download Expense Register"
                >
                  <Download className="w-3.5 h-3.5 text-rose-600" />
                  <span>Expenses Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenExpenseModal()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record Expense</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenOtherIncomeModal()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Record Other Income</span>
                </button>
              </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Total Revenue */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
                  <span>Gross Revenue</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-900 mt-1">
                  ₹{accountingPnlMetrics.totalGrossRevenue.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                  <span>Orders: ₹{accountingPnlMetrics.totalOrderSalesRevenue.toLocaleString('en-IN')}</span>
                  <span>Other: ₹{accountingPnlMetrics.totalOtherIncome.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* COGS (Cost of Goods Sold) */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
                  <span>Cost of Goods (COGS)</span>
                  <Package className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  ₹{accountingPnlMetrics.totalCogs.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-amber-700 mt-1">
                  Vendor purchase cost of goods sold
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-bold uppercase">
                  <span>Operating Expenses</span>
                  <TrendingDown className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                  ₹{accountingPnlMetrics.totalOperatingExpenses.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  {accountingPnlMetrics.filteredExpensesCount} recorded expense entries
                </div>
              </div>

              {/* Net Profit */}
              <div className={`p-4 rounded-2xl border shadow-sm ${
                accountingPnlMetrics.netProfit >= 0
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                  : 'bg-gradient-to-br from-rose-600 to-red-700 text-white'
              }`}>
                <div className="flex items-center justify-between text-white/80 text-xs font-bold uppercase">
                  <span>Net Profit (P&L)</span>
                  <Award className="w-4 h-4 text-yellow-300" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                  ₹{accountingPnlMetrics.netProfit.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-white/90 font-bold mt-1">
                  Net Margin: {accountingPnlMetrics.netMarginPct}% • Gross: ₹{accountingPnlMetrics.grossProfit.toLocaleString('en-IN')} ({accountingPnlMetrics.grossMarginPct}%)
                </div>
              </div>
            </div>

            {/* Sub-Tabs: P&L Statement, Expense Register, Income Register */}
            <div className="flex border-b border-gray-200 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAccountingSubTab('pnl')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  accountingSubTab === 'pnl'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Profit & Loss Statement (P&L)</span>
              </button>

              <button
                type="button"
                onClick={() => setAccountingSubTab('expenses')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  accountingSubTab === 'expenses'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>Expense Register</span>
                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {(expenses || []).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAccountingSubTab('incomes')}
                className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  accountingSubTab === 'incomes'
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Income & Sales Register</span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {(otherIncomes || []).length} Other Inflows
                </span>
              </button>
            </div>

            {/* SUB-TAB 1: P&L STATEMENT */}
            {accountingSubTab === 'pnl' && (
              <div className="space-y-6">
                {/* Cash Flow Status Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Physical Cash in Hand Position</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Liquid cash collected from COD orders minus cash expenses.</p>
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">Net Cash on Hand</p>
                        <p className={`text-2xl font-black ${accountingPnlMetrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          ₹{accountingPnlMetrics.netCashFlow.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-600 space-y-0.5">
                        <p>COD Inflow: <strong className="text-emerald-700">+₹{accountingPnlMetrics.codSalesRevenue.toLocaleString('en-IN')}</strong></p>
                        <p>Cash Outflow: <strong className="text-rose-700">-₹{accountingPnlMetrics.cashPaidExpenses.toLocaleString('en-IN')}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span>Digital (UPI / Bank) Flow Position</span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Online customer payments minus bank/UPI vendor & utility payouts.</p>
                    <div className="mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase">Net Digital Surplus</p>
                        <p className={`text-2xl font-black ${accountingPnlMetrics.netDigitalFlow >= 0 ? 'text-indigo-700' : 'text-rose-700'}`}>
                          ₹{accountingPnlMetrics.netDigitalFlow.toLocaleString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-gray-600 space-y-0.5">
                        <p>UPI Inflow: <strong className="text-indigo-700">+₹{accountingPnlMetrics.upiSalesRevenue.toLocaleString('en-IN')}</strong></p>
                        <p>UPI Outflow: <strong className="text-rose-700">-₹{accountingPnlMetrics.upiPaidExpenses.toLocaleString('en-IN')}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expense by Category Distribution */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
                    <span>Operating Expense Breakdown by Category</span>
                    <span className="text-xs text-gray-400 font-bold">Total: ₹{accountingPnlMetrics.totalOperatingExpenses.toLocaleString('en-IN')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                    {EXPENSE_CATEGORIES.map(cat => {
                      const amt = accountingPnlMetrics.expenseByCategory[cat.id] || 0;
                      const pct = accountingPnlMetrics.totalOperatingExpenses > 0 ? Math.round((amt / accountingPnlMetrics.totalOperatingExpenses) * 100) : 0;
                      const Icon = cat.icon || Package;
                      return (
                        <div key={cat.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-100/70 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cat.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="font-bold text-xs text-gray-800">{cat.label}</span>
                            </div>
                            <span className="font-extrabold text-xs text-gray-900">₹{amt.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                            <div className="bg-brand-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-[10px] text-gray-400 text-right mt-1 font-semibold">{pct}% of total expenses</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB 2: EXPENSE REGISTER */}
            {accountingSubTab === 'expenses' && (
              <div className="space-y-4">
                {/* Search & Category Filter */}
                <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      placeholder="Search expense description, paid to, ref no..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                    >
                      <option value="all">All Expense Categories</option>
                      {EXPENSE_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleOpenExpenseModal()}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Expense</span>
                    </button>
                  </div>
                </div>

                {/* Expenses Table */}
                {(() => {
                  const filteredExp = (expenses || []).filter(e => {
                    if (expenseCategoryFilter !== 'all' && e.category !== expenseCategoryFilter) return false;
                    if (expenseSearch.trim()) {
                      const q = expenseSearch.toLowerCase();
                      const matchNotes = String(e.notes || '').toLowerCase().includes(q);
                      const matchPaid = String(e.paid_to || '').toLowerCase().includes(q);
                      const matchRef = String(e.reference_no || '').toLowerCase().includes(q);
                      const matchCat = String(e.category_label || '').toLowerCase().includes(q);
                      if (!matchNotes && !matchPaid && !matchRef && !matchCat) return false;
                    }
                    return true;
                  });

                  if (filteredExp.length === 0) {
                    return (
                      <div className="bg-white p-10 rounded-2xl border border-gray-200 text-center text-gray-500">
                        <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="font-bold text-sm text-gray-800">No expenses recorded yet</p>
                        <p className="text-xs text-gray-400 mt-1">Record store rent, delivery fuel, staff salaries, packaging, and utilities.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenExpenseModal()}
                          className="mt-4 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow cursor-pointer"
                        >
                          + Record First Expense
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100/80 text-gray-700 uppercase font-extrabold border-b border-gray-200">
                              <th className="py-3 px-4">Date</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-4">Description / Notes</th>
                              <th className="py-3 px-3">Paid To</th>
                              <th className="py-3 px-3">Payment Mode</th>
                              <th className="py-3 px-4 text-right">Amount (Rs)</th>
                              <th className="py-3 px-3 text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            {filteredExp.map(e => {
                              const catObj = EXPENSE_CATEGORIES.find(c => c.id === e.category);
                              return (
                                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                                    {e.date || 'N/A'}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catObj?.color || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {e.category_label || catObj?.label || e.category}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 max-w-xs text-gray-800 text-[11px]">
                                    <p className="font-semibold truncate">{e.notes || 'Expense record'}</p>
                                    {e.reference_no && (
                                      <p className="text-[10px] text-gray-400 font-mono">Ref: {e.reference_no}</p>
                                    )}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-gray-900 whitespace-nowrap">
                                    {e.paid_to || 'N/A'}
                                  </td>
                                  <td className="py-3 px-3 whitespace-nowrap">
                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                      {e.payment_mode || 'Cash'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-right font-black text-rose-700 text-sm whitespace-nowrap">
                                    ₹{Number(e.amount || 0).toLocaleString('en-IN')}
                                  </td>
                                  <td className="py-3 px-3 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenExpenseModal(e)}
                                        className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteExpense(e.id)}
                                        className="p-1 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* SUB-TAB 3: INCOME REGISTER */}
            {accountingSubTab === 'incomes' && (
              <div className="space-y-6">
                {/* Section A: Customer Order Sales Summary */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <h4 className="font-extrabold text-sm text-gray-900 flex items-center justify-between">
                    <span>Customer Order Sales Revenue (Auto-Aggregated)</span>
                    <span className="text-xs font-bold text-emerald-700">Total: ₹{accountingPnlMetrics.totalOrderSalesRevenue.toLocaleString('en-IN')}</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <p className="text-[11px] font-bold text-emerald-800 uppercase">Cash on Delivery (COD) Sales</p>
                      <p className="text-xl font-black text-emerald-950 mt-1">₹{accountingPnlMetrics.codSalesRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">Physical cash collected from door deliveries</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200">
                      <p className="text-[11px] font-bold text-indigo-800 uppercase">Online & UPI Sales</p>
                      <p className="text-xl font-black text-indigo-950 mt-1">₹{accountingPnlMetrics.upiSalesRevenue.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-indigo-700 mt-0.5">Direct UPI QR & Razorpay gateway payments</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                      <p className="text-[11px] font-bold text-amber-800 uppercase">Fulfilled Orders Count</p>
                      <p className="text-xl font-black text-amber-950 mt-1">{accountingPnlMetrics.filteredOrdersCount} Orders</p>
                      <p className="text-[10px] text-amber-700 mt-0.5">Non-cancelled order dispatches</p>
                    </div>
                  </div>
                </div>

                {/* Section B: Other Incomes Register */}
                <div className="space-y-4">
                  <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={incomeSearch}
                        onChange={(e) => setIncomeSearch(e.target.value)}
                        placeholder="Search source, description, notes..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={incomeCategoryFilter}
                        onChange={(e) => setIncomeCategoryFilter(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                      >
                        <option value="all">All Other Incomes</option>
                        {OTHER_INCOME_CATEGORIES.map(c => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleOpenOtherIncomeModal()}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Record Other Income</span>
                      </button>
                    </div>
                  </div>

                  {/* Other Income Table */}
                  {(() => {
                    const filteredInc = (otherIncomes || []).filter(i => {
                      if (incomeCategoryFilter !== 'all' && i.category !== incomeCategoryFilter) return false;
                      if (incomeSearch.trim()) {
                        const q = incomeSearch.toLowerCase();
                        const matchSource = String(i.source || '').toLowerCase().includes(q);
                        const matchNotes = String(i.notes || '').toLowerCase().includes(q);
                        const matchCat = String(i.category_label || '').toLowerCase().includes(q);
                        if (!matchSource && !matchNotes && !matchCat) return false;
                      }
                      return true;
                    });

                    if (filteredInc.length === 0) {
                      return (
                        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
                          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="font-bold text-sm text-gray-800">No other income records</p>
                          <p className="text-xs text-gray-400 mt-1">Record scrap sales, supplier rebates, or delivery fee surcharges.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-gray-100/80 text-gray-700 uppercase font-extrabold border-b border-gray-200">
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-3">Category</th>
                                <th className="py-3 px-4">Source / Customer</th>
                                <th className="py-3 px-4">Notes</th>
                                <th className="py-3 px-3">Mode</th>
                                <th className="py-3 px-4 text-right">Amount (Rs)</th>
                                <th className="py-3 px-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                              {filteredInc.map(i => {
                                const catObj = OTHER_INCOME_CATEGORIES.find(c => c.id === i.category);
                                return (
                                  <tr key={i.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-gray-600">
                                      {i.date || 'N/A'}
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${catObj?.color || 'bg-gray-100 text-gray-700'}`}>
                                        {i.category_label || catObj?.label || i.category}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-gray-900">
                                      {i.source || 'Direct Inflow'}
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 text-[11px]">
                                      {i.notes || '-'}
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap">
                                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                                        {i.payment_mode || 'Cash'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                                      +₹{Number(i.amount || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="py-3 px-3 text-center whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenOtherIncomeModal(i)}
                                          className="p-1 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteOtherIncome(i.id)}
                                          className="p-1 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3.1: OFFER ZONE & PROMOTIONAL DEALS ================= */}
        {activeTab === 'offers' && (
          <div className="space-y-6">
            {/* Header with Title and Create / Excel Buttons */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <Flame className="w-5 h-5 text-rose-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Offer Zone & Promotional Banners</span>
                      <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200">
                        🔥 Live Sync with Store
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Create, update, and toggle promotional offers & banners. When you set an offer to "Live", customers can instantly see it in their Offer Zone and Home feed!
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {offers && offers.length > 0 && (
                  offers.some(o => o && o.active !== false) ? (
                    <button
                      type="button"
                      onClick={() => handleToggleAllOffersLive(false)}
                      className="px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-amber-300 shadow-xs transition-all cursor-pointer"
                    >
                      <EyeOff className="w-4 h-4 text-amber-700" />
                      <span>Pause All Offers</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleAllOffersLive(true)}
                      className="px-3.5 py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-emerald-300 shadow-xs transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-700" />
                      <span>Make All Offers Live 🔥</span>
                    </button>
                  )
                )}
                {(!offers || offers.length === 0) && (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultOffers}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-extrabold text-xs rounded-xl flex items-center gap-1.5 border border-rose-200 shadow-xs transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Restore Standard Offers</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleExportExcel('offers')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Offers Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenCreateOffer}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Create New Offer</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Offers</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{(offers || []).length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Active or draft banners</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm bg-emerald-50/20">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Live Now 🔥</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {(offers || []).filter(o => o.active !== false).length}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Visible to customers now</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm bg-amber-50/20">
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Paused / Inactive</p>
                <p className="text-2xl font-black text-amber-700 mt-1">
                  {(offers || []).filter(o => o.active === false).length}
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">Hidden from customer store</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm bg-purple-50/20">
                <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Active Coupons</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {(offers || []).filter(o => o.code && o.active !== false).length}
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5">Promo coupon codes</p>
              </div>
            </div>

            {/* ================= ORDER MILESTONE FREE GIFT TIERS (₹149, ₹249, ₹349+ — 3 ITEMS EACH) ================= */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 rounded-2xl border-2 border-emerald-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 shadow-inner">
                    <Gift className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm sm:text-base tracking-tight">
                        🎁 Order Milestone Free Gift Tiers (₹149, ₹249, ₹349+)
                      </h4>
                      <span className="bg-amber-300 text-emerald-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow-xs">
                        🎁 Total Free Products: {(milestoneGifts || []).reduce((acc, t) => acc + (Array.isArray(t?.items) ? t.items.length : 0), 0)} Listed
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-50 mt-0.5">
                      Configure order amount milestones (₹149, ₹249, ₹349, etc.) and list 1, 2, 3 or more free gift products manually (Grocery, Vegetable, Fast Food, etc.) for customers to pick from at checkout!
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {milestoneGifts && milestoneGifts.length > 0 && (
                    milestoneGifts.some(m => m && m.active !== false) ? (
                      <button
                        type="button"
                        onClick={() => handleToggleAllMilestonesLive(false)}
                        className="px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <EyeOff className="w-4 h-4" />
                        <span>Disable All Free Gifts</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleAllMilestonesLive(true)}
                        className="px-3.5 py-2.5 bg-emerald-300 hover:bg-emerald-200 text-emerald-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Enable All Free Gifts</span>
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={handleOpenCreateMilestone}
                    className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-900 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-700" />
                    <span>+ Add Milestone Amount Tier</span>
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5">
                {(!milestoneGifts || milestoneGifts.length === 0) ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-emerald-100 space-y-3">
                    <Gift className="w-8 h-8 text-emerald-500 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-gray-800">No Milestone Gift Tiers Active</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">Free item milestone gifts are currently hidden on the customer website.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleOpenCreateMilestone}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        + Create Custom Milestone Tier
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultMilestones}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Restore Default ₹149 / ₹249 / ₹349 Tiers
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {[...(milestoneGifts || [])]
                      .sort((a, b) => (Number(a.min_amount) || 0) - (Number(b.min_amount) || 0))
                      .map((tier) => {
                        const isLive = tier.active !== false;
                        return (
                          <div
                            key={tier.id}
                            className={`bg-white rounded-2xl border-2 transition-all flex flex-col justify-between overflow-hidden shadow-xs ${
                              isLive ? 'border-emerald-200 hover:border-emerald-400' : 'border-gray-200 opacity-75'
                            }`}
                          >
                            <div>
                              {/* Tier Card Header */}
                              <div className="p-3.5 bg-gradient-to-r from-emerald-50/90 to-teal-50/60 border-b border-emerald-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs shadow-xs">
                                    ₹{tier.min_amount}+
                                  </span>
                                  <div>
                                    <h5 className="font-extrabold text-xs text-gray-900 leading-tight">{tier.title}</h5>
                                    <p className="text-[10px] text-gray-500 line-clamp-1">{tier.subtitle}</p>
                                  </div>
                                </div>
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                    isLive ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  {isLive ? 'LIVE 🎁' : 'PAUSED'}
                                </span>
                              </div>

                              {/* Gift Options List */}
                              <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-extrabold text-gray-500 uppercase tracking-wider px-1">
                                  <span className="font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                    🎁 Total Free Products: {(tier.items || []).length} Listed
                                  </span>
                                  <span className="text-emerald-700">{((tier.items || []).length === 1) ? '1 FREE Gift Included' : `Pick 1 of ${(tier.items || []).length} Free`}</span>
                                </div>
                                {(tier.items || []).map((item, idx) => (
                                  <div
                                    key={item.id || idx}
                                    className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50 border border-gray-200/80 hover:bg-emerald-50/40 transition-colors"
                                  >
                                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-gray-200 shrink-0 relative">
                                      <img
                                        src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
                                        }}
                                      />
                                      <span className="absolute top-0 left-0 bg-emerald-600 text-white text-[8px] font-black px-1 rounded-br">
                                        #{idx + 1}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                                          {item.category || 'Gift'}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-semibold truncate">{item.unit}</span>
                                      </div>
                                      <p className="font-bold text-xs text-gray-900 truncate mt-0.5">{item.name}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="block text-[9px] text-gray-400 line-through">₹{item.worth || 20}</span>
                                      <span className="block text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                        FREE
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Tier Footer Actions */}
                            <div className="px-3.5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleMilestoneLive(tier.id)}
                                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  isLive
                                    ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {isLive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                <span>{isLive ? 'Pause Tier' : 'Go Live'}</span>
                              </button>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditMilestone(tier)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>Customize Options ({(tier.items || []).length})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMilestone(tier.id)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete Tier"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={offerSearch}
                  onChange={(e) => setOfferSearch(e.target.value)}
                  placeholder="Search offers by title, code, discount tag..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                {[
                  { id: 'all', label: `All (${(offers || []).length})` },
                  { id: 'live', label: `Live Now 🔥 (${(offers || []).filter(o => o.active !== false).length})` },
                  { id: 'paused', label: `Paused (${(offers || []).filter(o => o.active === false).length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOfferFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      offerFilter === f.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Offers Cards Grid */}
            {filteredOffers.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-500 flex items-center justify-center font-bold">
                  <Flame className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">No Offers Found</h4>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  {offerSearch || offerFilter !== 'all'
                    ? 'No offers match your current filter or search query.'
                    : 'You have not created any promotional offers or banners yet.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenCreateOffer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Offer</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreDefaultOffers}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-rose-600" />
                    <span>Restore Standard Offers</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredOffers.map(offer => {
                  const isLive = offer.active !== false;
                  const targetCat = categories.find(c => c.id === offer.category_id);
                  return (
                    <div
                      key={offer.id}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col ${
                        isLive ? 'border-gray-200' : 'border-gray-200 opacity-80'
                      }`}
                    >
                      {/* Card Banner Image Preview */}
                      <div className="relative h-44 w-full bg-gray-100 overflow-hidden group">
                        <img
                          src={offer.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'}
                          alt={offer.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          {offer.discount_tag ? (
                            <span className="bg-rose-600 text-white text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full uppercase shadow-md flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {offer.discount_tag}
                            </span>
                          ) : <span />}

                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 ${
                              isLive
                                ? 'bg-emerald-500 text-white animate-pulse'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-white' : 'bg-gray-400'}`} />
                            {isLive ? 'LIVE NOW 🔥' : 'PAUSED'}
                          </span>
                        </div>

                        {/* Bottom image overlay details */}
                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <p className="font-black text-base drop-shadow-md line-clamp-1">{offer.title}</p>
                          {offer.subtitle && (
                            <p className="text-xs text-white/90 drop-shadow-md line-clamp-1 font-medium">{offer.subtitle}</p>
                          )}
                        </div>
                      </div>

                      {/* Card Body Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {offer.code && (
                              <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold px-2 py-0.5 rounded-md">
                                <Tag className="w-3 h-3 text-amber-600" />
                                <span>Code: <strong>{offer.code}</strong></span>
                              </div>
                            )}

                            <span className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                              {targetCat ? `Category: ${targetCat.name}` : 'All Categories'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600 space-y-1">
                            {offer.min_order > 0 ? (
                              <p className="text-gray-500">
                                🛒 Min order value: <strong className="text-gray-800">₹{offer.min_order}</strong>
                              </p>
                            ) : (
                              <p className="text-emerald-700 font-medium">🛒 Applicable on any order value</p>
                            )}
                          </div>
                        </div>

                        {/* Card Action Controls */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          {/* Live Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleOfferLive(offer.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              isLive
                                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                            title={isLive ? 'Pause this offer' : 'Go live with this offer'}
                          >
                            {isLive ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-emerald-700" />}
                            <span>{isLive ? 'Pause Offer' : 'Go Live 🔥'}</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditOffer(offer)}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-brand-600 hover:bg-gray-100 transition-colors"
                              title="Edit Offer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOffer(offer.id)}
                              className="p-1.5 rounded-lg text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Offer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3.2: CUSTOMER ACCOUNTS, CASH WALLETS & STAMP REWARDS ================= */}
        {activeTab === 'stamps' && (
          <div className="space-y-6">
            {/* Header with Title and Excel Download */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xl">
                    👛
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Customer Accounts & Cash Wallets</span>
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        ⚡ Live Customer CRM
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Add wallet balance to customer accounts, search customers by Order ID, and track loyalty stamps & surprise gifts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleExportExcel('stamps')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Customers Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Customer Accounts</span>
                <span className="text-2xl font-black text-gray-900 mt-1 block">{stampCustomers.length}</span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Unique shopper profiles</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Wallet Balances 👛</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">
                  ₹{stampCustomers.reduce((acc, c) => acc + (c.walletBalance || 0), 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-800 font-semibold mt-0.5 block">
                  {stampCustomers.filter(c => (c.walletBalance || 0) > 0).length} customers with balance
                </span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-sm">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Surprise Gift Eligible 🎁</span>
                <span className="text-2xl font-black text-amber-700 mt-1 block">
                  {stampCustomers.filter(c => c.isGiftEligible && !c.isFulfilled).length}
                </span>
                <span className="text-[10px] text-amber-800 font-semibold mt-0.5 block">Reached 10 stamps (Pending Gift)</span>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Qualifying Orders</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">
                  {stampCustomers.reduce((acc, c) => acc + c.totalQualifying, 0)}
                </span>
                <span className="text-[10px] text-gray-500 mt-0.5 block">Orders ≥ ₹250 storewide</span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CASHBACK OFFER & WALLET USAGE CONTROLS CARD                */}
            {/* ========================================================= */}
            <div className="bg-gradient-to-br from-white via-amber-50/20 to-emerald-50/30 rounded-3xl border border-amber-200 shadow-sm p-5 md:p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-100 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-xl shadow-sm shrink-0">
                    🪙
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-gray-900 text-base">
                        Cashback Offer & Customer Wallet Usage Controls
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        cashbackActive
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {cashbackActive ? '● Cashback Active' : '○ Cashback Inactive'}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                        walletRedemptionActive
                          ? 'bg-teal-100 text-teal-800 border-teal-300'
                          : 'bg-gray-100 text-gray-700 border-gray-300'
                      }`}>
                        {walletRedemptionActive ? '● Wallet Pay Enabled' : '○ Wallet Pay Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Turn the customer cashback offer ON or OFF, change the minimum qualifying order & percentage, and control how much wallet balance customers can claim/use on checkout orders.
                    </p>
                  </div>
                </div>

                {/* Instant Quick Toggles */}
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={handleToggleCashbackActive}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border ${
                      cashbackActive
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                  >
                    <span>{cashbackActive ? '✓ Offer is Active' : '✕ Offer is Inactive'}</span>
                    <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-normal">
                      Click to {cashbackActive ? 'Pause' : 'Activate'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleWalletActive}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs border ${
                      walletRedemptionActive
                        ? 'bg-teal-600 hover:bg-teal-700 text-white border-teal-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
                    }`}
                  >
                    <span>{walletRedemptionActive ? '👛 Wallet Pay: ON' : '👛 Wallet Pay: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Order Cashback Rules */}
                <div className="bg-white/90 p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-50 pb-2">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🎁</span> Order Cashback Program Rules
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">Customer Scratch Cards</span>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 mb-1">
                        Cashback Offer Status
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCashbackActive(true)}
                          className={`py-2 px-3 text-xs font-black rounded-xl border text-center transition-all ${
                            cashbackActive
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          🟢 Active (Give Scratch Cards)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCashbackActive(false)}
                          className={`py-2 px-3 text-xs font-black rounded-xl border text-center transition-all ${
                            !cashbackActive
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          🔴 Inactive (Disable Offer)
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        When inactive, banners in cart are hidden and no new scratch cards are issued on checkout.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Min Order Subtotal (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={cashbackMinOrder}
                          onChange={(e) => setCashbackMinOrder(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">Default: ₹500</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Cashback Rate (%)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.5"
                          value={cashbackPercentage}
                          onChange={(e) => setCashbackPercentage(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">e.g. 1% or 2%</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Max Cap / Order (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={cashbackMaxPerOrder}
                          onChange={(e) => setCashbackMaxPerOrder(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">0 = No limit</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Customer Wallet Claim / Redemption Limits at Checkout */}
                <div className="bg-white/90 p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-50 pb-2">
                    <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>👛</span> Customer Wallet Claim & Redemption Limits
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">Checkout Restrictions</span>
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-extrabold text-gray-700 mb-1">
                        Allow Customers to Pay with Wallet at Checkout
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWalletRedemptionActive(true)}
                          className={`py-2 px-3 text-xs font-black rounded-xl border text-center transition-all ${
                            walletRedemptionActive
                              ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          🟢 Allowed (Customer can use)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWalletRedemptionActive(false)}
                          className={`py-2 px-3 text-xs font-black rounded-xl border text-center transition-all ${
                            !walletRedemptionActive
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          🔴 Paused (Hold Redemption)
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        When paused, customers cannot deduct wallet balance during checkout until you re-enable it.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Max Usable % of Order
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          step="5"
                          value={walletMaxUsePercent}
                          onChange={(e) => setWalletMaxUsePercent(Math.min(100, Math.max(1, Number(e.target.value) || 100)))}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">100% = Full bill</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Max Usable ₹ / Order
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={walletMaxUseAmount}
                          onChange={(e) => setWalletMaxUseAmount(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">0 = Unlimited</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Min Order to Use (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="50"
                          value={walletMinOrderForUse}
                          onChange={(e) => setWalletMinOrderForUse(Number(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-xs font-extrabold rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-gray-400 mt-0.5 block">0 = Any order</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Save Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-amber-100">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Settings sync in real-time to customer mobile web and checkout.
                  </span>
                  {cashbackSettingsSavedMsg && (
                    <span className="ml-2 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg font-black text-xs animate-fadeIn">
                      {cashbackSettingsSavedMsg}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveCashbackSettings()}
                  disabled={isSavingCashbackSettings}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCashbackSettings ? 'Saving Settings...' : 'Save Cashback & Wallet Rules'}</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={stampCustomerSearch}
                  onChange={(e) => setStampCustomerSearch(e.target.value)}
                  placeholder="🔍 Search customer by Name, Phone, Order ID (e.g. #1024), or Address..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {[
                  { id: 'all', label: `All (${stampCustomers.length})` },
                  { id: 'wallet', label: `👛 With Wallet (${stampCustomers.filter(c => (c.walletBalance || 0) > 0).length})` },
                  { id: 'gift_eligible', label: `🎁 Gift Eligible (${stampCustomers.filter(c => c.isGiftEligible && !c.isFulfilled).length})` },
                  { id: 'active', label: `⭐ Active Stamps (${stampCustomers.filter(c => c.activeStamps > 0).length})` },
                  { id: 'fulfilled', label: `✅ Gift Handed Over (${stampCustomers.filter(c => c.isFulfilled).length})` },
                  { id: 'blocked', label: `🚫 Blocked (${stampCustomers.filter(c => isCustomerBlocked(c.phone)).length})` }
                ].map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStampCustomerFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      stampCustomerFilter === f.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsBlocklistModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Manage Blocked Phone Numbers & Fake Order Protection"
                >
                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                  <span>Blocklist Protection ({Object.keys(blockedCustomers || {}).length})</span>
                </button>
              </div>
            </div>

            {/* Customer Stamp Cards List */}
            {filteredStampCustomers.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h4 className="font-bold text-gray-700 text-sm">No customers matching this filter</h4>
                <p className="text-xs text-gray-400 mt-1">When customers place orders ₹250 or more, their stamp records and gift unlocks will appear here automatically.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStampCustomers.map(customer => {
                  return (
                    <div
                      key={customer.phone}
                      className={`bg-white rounded-2xl border p-5 shadow-sm transition-all ${
                        customer.isGiftEligible && !customer.isFulfilled
                          ? 'border-amber-400 ring-2 ring-amber-400/20 bg-gradient-to-r from-amber-50/30 to-white'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Customer Identification */}
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-black text-sm text-gray-900">{customer.name}</h4>
                            <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                              {customer.phone}
                            </span>

                            {isCustomerBlocked(customer.phone) && (
                              <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                                <Ban className="w-3 h-3" /> BLOCKED
                              </span>
                            )}

                            {/* Wallet Balance Pill */}
                            <button
                              type="button"
                              onClick={() => handleOpenWalletModal(customer)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                (customer.walletBalance || 0) > 0
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Click to Add or Deduct Wallet Balance"
                            >
                              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Wallet: ₹{customer.walletBalance || 0}</span>
                              <span className="text-[10px] text-emerald-700 font-bold ml-0.5 bg-white/60 px-1 rounded">+ Top-up</span>
                            </button>

                            {customer.isGiftEligible && !customer.isFulfilled && (
                              <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                <Gift className="w-3 h-3" />
                                10 Stamps Achieved: Surprise Gift Unlocked!
                              </span>
                            )}
                            {customer.isFulfilled && (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Surprise Gift Handed Over
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-gray-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                            {customer.address ? (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span>{customer.address.line1}{customer.address.landmark ? ` (${customer.address.landmark})` : ''}, {customer.address.city || 'Khair'}</span>
                              </span>
                            ) : (
                              <span className="text-gray-400">Address on file</span>
                            )}
                            <span>•</span>
                            <span>Total Spend: <strong className="text-gray-800">₹{customer.totalSpend.toLocaleString()}</strong> ({customer.totalOrders} orders)</span>
                            <span>•</span>
                            <span>Qualifying Orders (≥ ₹250): <strong className="text-amber-700">{customer.totalQualifying} orders</strong></span>
                          </div>

                          {/* Order IDs List / Match Indicator */}
                          {Array.isArray(customer.orderIds) && customer.orderIds.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                              <span className="text-[10px] font-bold text-gray-400">Order IDs:</span>
                              {customer.orderIds.slice(0, 8).map(oid => {
                                const isQueryMatch = stampCustomerSearch.trim() &&
                                  oid.toLowerCase().includes(stampCustomerSearch.toLowerCase().trim().replace(/^#/, ''));
                                return (
                                  <span
                                    key={oid}
                                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                      isQueryMatch
                                        ? 'bg-emerald-500 text-white shadow-xs animate-pulse ring-1 ring-emerald-600'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    #{oid}
                                  </span>
                                );
                              })}
                              {customer.orderIds.length > 8 && (
                                <span className="text-[10px] text-gray-400 font-medium">+{customer.orderIds.length - 8} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Customer Direct Contact & Gift Action */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenWalletModal(customer)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                            title="Add balance or deduct money from this customer's wallet"
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span>+ Manage Wallet</span>
                          </button>
                          <a
                            href={`tel:${customer.phone}`}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>

                          {isCustomerBlocked(customer.phone) ? (
                            <button
                              type="button"
                              onClick={() => handleUnblockCustomer(customer.phone)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
                              title="Unblock this customer so they can order again"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unblock</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePromptBlockCustomer(customer.phone, customer.name)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Block this customer phone number from ordering"
                            >
                              <Ban className="w-3.5 h-3.5 text-rose-600" />
                              <span>Block</span>
                            </button>
                          )}

                          {customer.isGiftEligible && (
                            <button
                              type="button"
                              onClick={() => handleToggleGiftFulfilled(customer.phone)}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
                                customer.isFulfilled
                                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>{customer.isFulfilled ? 'Mark Pending (Undo)' : 'Mark Surprise Gift Dispatched 🚀'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 10-Stamp Visual Progress Bar */}
                      <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-gray-900">Active Stamp Card:</span>
                            <span className="font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full text-[11px]">
                              {customer.activeStamps} of 10 Collected ⭐
                            </span>
                          </div>
                          <span className="text-gray-400 text-[11px]">
                            {10 - customer.activeStamps === 0 ? '10/10 Complete!' : `${10 - customer.activeStamps} more orders (≥ ₹250) needed for surprise home gift`}
                          </span>
                        </div>

                        {/* 10 Visual Stamp Slots */}
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(slotNum => {
                            const isEarned = slotNum <= customer.activeStamps;
                            return (
                              <div
                                key={slotNum}
                                className={`rounded-xl p-2 flex flex-col items-center justify-center text-center transition-all ${
                                  isEarned
                                    ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-300'
                                    : 'bg-gray-50 border border-gray-200 text-gray-400'
                                }`}
                              >
                                {isEarned ? (
                                  <Star className="w-4 h-4 fill-amber-200 text-white" />
                                ) : (
                                  <span className="text-[10px] font-bold">{slotNum}</span>
                                )}
                                <span className="text-[9px] font-black mt-0.5">
                                  {isEarned ? `Stamp ${slotNum}` : `Slot ${slotNum}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Surprise Gift Notification Banner for Store Operations */}
                        {customer.isGiftEligible && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 mt-2">
                            <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <strong>Home Surprise Gift Fulfillment Alert:</strong>
                              <span className="block text-[11px] text-amber-900 mt-0.5">
                                {customer.isFulfilled
                                  ? `✅ Gift marked dispatched on ${giftFulfillments[customer.phone]?.dispatched_at ? new Date(giftFulfillments[customer.phone].dispatched_at).toLocaleDateString('en-IN') : 'Record'}.`
                                  : 'Pack a special complimentary gift pack (dry fruits / snack treats / household item) with this customer\'s order for door delivery!'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3.5: REPORTS & ANALYTICS FOR ALL MODULES ================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Header with Sub-Module Switcher and Download Excel */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-600" />
                  <span>Business Reports & Module Analytics</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exportable metrics for Sales, Product Margins (Purchase vs Selling vs MRP), Inventory, and Customer Loyalty.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Module Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl">
                  {[
                    { id: 'delivered_orders', label: 'Delivered Orders & Contacts 📦' },
                    { id: 'sales', label: 'Sales & Day-to-Day P&L' },
                    { id: 'daily_pnl', label: 'Day-by-Day P&L Statement' },
                    { id: 'margin', label: 'Price & Profit Margins' },
                    { id: 'inventory', label: 'Inventory & Valuation' },
                    { id: 'loyalty', label: 'Loyalty & Stamp Gifts' },
                    { id: 'riders', label: 'Rider Performance' }
                  ].map(mod => (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => setReportModuleFilter(mod.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        reportModuleFilter === mod.id
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {mod.label}
                    </button>
                  ))}
                </div>

                {/* Direct Excel Download for Active Module */}
                <button
                  type="button"
                  onClick={() => {
                    if (reportModuleFilter === 'delivered_orders') {
                      handleDownloadDeliveredOrdersExcel();
                    } else {
                      handleExportExcel(reportModuleFilter);
                    }
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  title="Download Current Module Report in Excel Format"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* SUB-REPORT 1 & 1B: SALES, REVENUE & DAY-TO-DAY P&L */}
            {(reportModuleFilter === 'sales' || reportModuleFilter === 'daily_pnl') && (
              <div className="space-y-5">
                {/* Date Period Filter Bar for Day-to-Day P&L */}
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 flex items-center gap-2">
                      <span>📊 Day-to-Day Profit & Loss (P&L) & Revenue Analyzer</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                        Live P&L
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Track daily Sales Revenue, Product Purchase Cost (COGS), Delivery Fees, Discounts, and Net Profit/Loss day by day.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      {[
                        { id: 'all', label: 'All Days' },
                        { id: 'today', label: 'Today' },
                        { id: '7days', label: 'Last 7 Days' },
                        { id: '30days', label: 'Last 30 Days' },
                        { id: 'custom', label: 'Custom Dates' }
                      ].map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPnlPeriodFilter(p.id);
                            setSelectedPnlDay(null);
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            pnlPeriodFilter === p.id
                              ? 'bg-brand-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {pnlPeriodFilter === 'custom' && (
                      <div className="flex flex-wrap items-center gap-1.5 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200 text-xs">
                        <span className="text-[10px] font-bold text-gray-500">From:</span>
                        <input
                          type="date"
                          value={pnlStartDate}
                          onChange={(e) => setPnlStartDate(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-gray-300 text-xs font-semibold bg-white"
                        />
                        <span className="text-[10px] font-bold text-gray-500">To:</span>
                        <input
                          type="date"
                          value={pnlEndDate}
                          onChange={(e) => setPnlEndDate(e.target.value)}
                          className="px-2 py-1 rounded-lg border border-gray-300 text-xs font-semibold bg-white"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleExportExcel('daily_pnl')}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export Day-to-Day P&L Excel</span>
                    </button>
                  </div>
                </div>

                {/* P&L Summary KPI Cards for Selected Period */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Gross Sales Revenue</span>
                    <span className="text-xl font-black text-gray-900 mt-1 block">
                      ₹{dailyPnlData.summary.grossRevenue.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      {dailyPnlData.summary.validOrders} active/completed ({dailyPnlData.summary.cancelledOrders} cancelled)
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Purchase Cost (COGS)</span>
                    <span className="text-xl font-black text-rose-600 mt-1 block">
                      ₹{dailyPnlData.summary.itemsCost.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      {dailyPnlData.summary.unitsSold} total units sold
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Item Gross Profit</span>
                    <span className={`text-xl font-black mt-1 block ${
                      dailyPnlData.summary.grossItemProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {dailyPnlData.summary.grossItemProfit >= 0
                        ? `+₹${dailyPnlData.summary.grossItemProfit.toLocaleString()}`
                        : `-₹${Math.abs(dailyPnlData.summary.grossItemProfit).toLocaleString()}`}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Selling ₹{dailyPnlData.summary.itemsSell.toLocaleString()} - Cost ₹{dailyPnlData.summary.itemsCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Delivery Fees Earned</span>
                    <span className="text-xl font-black text-blue-600 mt-1 block">
                      +₹{dailyPnlData.summary.deliveryFee.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Logistics fee collected
                    </span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Discounts & Free Gifts</span>
                    <span className="text-xl font-black text-amber-600 mt-1 block">
                      -₹{(dailyPnlData.summary.discount + dailyPnlData.summary.freeGiftCost).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Coupons ₹{dailyPnlData.summary.discount} • Gifts ₹{dailyPnlData.summary.freeGiftCost}
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border-2 shadow-sm ${
                    dailyPnlData.summary.netProfit >= 0
                      ? 'bg-emerald-50/90 border-emerald-400'
                      : 'bg-rose-50/90 border-rose-400'
                  }`}>
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${
                      dailyPnlData.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}>
                      {dailyPnlData.summary.netProfit >= 0 ? 'Net Profit (P&L)' : 'Net Loss (P&L)'}
                    </span>
                    <span className={`text-xl font-black mt-1 block ${
                      dailyPnlData.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {dailyPnlData.summary.netProfit >= 0
                        ? `+₹${dailyPnlData.summary.netProfit.toLocaleString()}`
                        : `-₹${Math.abs(dailyPnlData.summary.netProfit).toLocaleString()}`}
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 block ${
                      dailyPnlData.summary.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-800'
                    }`}>
                      Net Margin: {dailyPnlData.summary.marginPct}% ({dailyPnlData.filteredDays.length} days)
                    </span>
                  </div>
                </div>

                {/* DAY-TO-DAY P&L LEDGER TABLE */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-emerald-50/60 via-white to-brand-50/40">
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <span>📅 Day-to-Day Profit & Loss (P&L) Statement</span>
                        <span className="text-[10px] bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full font-black">
                          {dailyPnlData.filteredDays.length} Days Recorded
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Click on any date row to inspect all orders and item-wise cost & profit for that specific day.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedPnlDay && (
                        <button
                          type="button"
                          onClick={() => setSelectedPnlDay(null)}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                        >
                          Show All Days
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExportExcel('daily_pnl')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Download P&L CSV/Excel</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Date / Day</th>
                          <th className="p-3">Orders</th>
                          <th className="p-3">Units Sold</th>
                          <th className="p-3">Items Sale (Subtotal)</th>
                          <th className="p-3">Purchase Cost (COGS)</th>
                          <th className="p-3">Delivery Fee (+)</th>
                          <th className="p-3">Discounts & Gifts (-)</th>
                          <th className="p-3">Gross Revenue</th>
                          <th className="p-3">Net Profit / Loss (P&L)</th>
                          <th className="p-3">Margin %</th>
                          <th className="p-3 text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dailyPnlData.filteredDays.length === 0 ? (
                          <tr>
                            <td colSpan="11" className="p-8 text-center text-gray-400 font-semibold">
                              No orders found for the selected date range.
                            </td>
                          </tr>
                        ) : (
                          dailyPnlData.filteredDays.map(day => {
                            const isToday = day.dateKey === dailyPnlData.todayKey;
                            const isSelected = selectedPnlDay === day.dateKey;
                            const isProfit = day.netProfit >= 0;

                            return (
                              <React.Fragment key={day.dateKey}>
                                <tr
                                  onClick={() => setSelectedPnlDay(isSelected ? null : day.dateKey)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-brand-50/70'
                                      : isToday
                                      ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-gray-900">{day.displayDate}</span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                        {day.dayName}
                                      </span>
                                      {isToday && (
                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                          Today
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-400">{day.dateKey}</span>
                                  </td>
                                  <td className="p-3">
                                    <span className="font-bold text-gray-900">{day.validOrders} valid</span>
                                    <span className="text-[10px] text-gray-500 block">
                                      {day.deliveredOrders} delivered{day.cancelledOrders > 0 ? ` • ${day.cancelledOrders} cancelled` : ''}
                                    </span>
                                  </td>
                                  <td className="p-3 font-semibold text-gray-700">{day.unitsSold} units</td>
                                  <td className="p-3 font-bold text-gray-800">₹{day.itemsSell.toLocaleString()}</td>
                                  <td className="p-3 font-mono font-bold text-rose-700">₹{day.itemsCost.toLocaleString()}</td>
                                  <td className="p-3 font-semibold text-blue-700">+₹{day.deliveryFee.toLocaleString()}</td>
                                  <td className="p-3 font-semibold text-amber-700">
                                    {(day.discount + day.freeGiftCost) > 0
                                      ? `-₹${(day.discount + day.freeGiftCost).toLocaleString()}`
                                      : '₹0'}
                                  </td>
                                  <td className="p-3 font-black text-brand-700">₹{day.grossRevenue.toLocaleString()}</td>
                                  <td className="p-3">
                                    <span className={`font-black text-xs px-2.5 py-1 rounded-xl inline-block ${
                                      isProfit
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                                    }`}>
                                      {isProfit ? `+₹${day.netProfit.toLocaleString()}` : `-₹${Math.abs(day.netProfit).toLocaleString()}`}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    <span className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                                      day.marginPct >= 20
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : day.marginPct >= 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {day.marginPct}%
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedPnlDay(isSelected ? null : day.dateKey);
                                      }}
                                      className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-[11px] font-bold text-gray-700"
                                    >
                                      {isSelected ? 'Hide Orders ▲' : 'View Orders ▼'}
                                    </button>
                                  </td>
                                </tr>

                                {/* Expanded Day Drilldown: Every Order & Item Cost/Profit for this Date */}
                                {isSelected && (
                                  <tr className="bg-gray-50/90">
                                    <td colSpan="11" className="p-4">
                                      <div className="bg-white rounded-xl border border-brand-200 p-3.5 space-y-3 shadow-inner">
                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                          <h5 className="font-extrabold text-xs text-gray-900">
                                            📋 Order-by-Order P&L Breakdown for {day.displayDate} ({day.dayName})
                                          </h5>
                                          <span className="text-[11px] font-bold text-emerald-700">
                                            Day Net P&L: {day.netProfit >= 0 ? `+₹${day.netProfit}` : `-₹${Math.abs(day.netProfit)}`} ({day.marginPct}%)
                                          </span>
                                        </div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-[11px]">
                                            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold">
                                              <tr>
                                                <th className="p-2">Order ID & Time</th>
                                                <th className="p-2">Customer</th>
                                                <th className="p-2">Items (Cost vs Sell)</th>
                                                <th className="p-2">Purchase Cost</th>
                                                <th className="p-2">Sell Subtotal</th>
                                                <th className="p-2">Fee / Disc</th>
                                                <th className="p-2">Order Total</th>
                                                <th className="p-2">Net P&L</th>
                                                <th className="p-2">Status</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                              {day.ordersList.map(ord => {
                                                const p = ord._pnl;
                                                return (
                                                  <tr key={ord.id} className={p.isCancelled ? 'opacity-50 bg-rose-50/30' : ''}>
                                                    <td className="p-2 font-mono font-bold text-gray-900">
                                                      #{ord.id}
                                                      <span className="block text-[10px] font-normal text-gray-400">
                                                        {ord.created_at ? new Date(ord.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                      </span>
                                                    </td>
                                                    <td className="p-2">
                                                      <span className="font-bold text-gray-800 block">{ord.customer_name}</span>
                                                      <span className="text-[10px] text-gray-400">{ord.customer_phone}</span>
                                                    </td>
                                                    <td className="p-2">
                                                      <div className="space-y-0.5">
                                                        {(ord.items || []).map((it, iIdx) => {
                                                          const uCost = getOrderItemUnitCost(it);
                                                          const uSell = Number(it.price) || 0;
                                                          const qty = Number(it.qty) || 1;
                                                          return (
                                                            <div key={iIdx} className="text-[10px] text-gray-700">
                                                              <span className="font-semibold">{qty}x {it.name}</span> ({it.unit || '1 unit'}) —{' '}
                                                              <span className="text-rose-700 font-mono">Cost: ₹{uCost * qty}</span> |{' '}
                                                              <span className="text-brand-700 font-mono">Sell: ₹{uSell * qty}</span>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </td>
                                                    <td className="p-2 font-mono font-bold text-rose-700">₹{p.itemsCost}</td>
                                                    <td className="p-2 font-mono font-bold text-gray-800">₹{p.itemsSell}</td>
                                                    <td className="p-2 text-[10px]">
                                                      <span className="text-blue-700 block">+₹{p.deliveryFee} fee</span>
                                                      {(p.discount + p.freeGiftCost) > 0 && (
                                                        <span className="text-amber-700 block">-₹{p.discount + p.freeGiftCost} disc/gift</span>
                                                      )}
                                                    </td>
                                                    <td className="p-2 font-black text-brand-700">₹{ord.total}</td>
                                                    <td className="p-2 font-black">
                                                      {p.isCancelled ? (
                                                        <span className="text-gray-400">Cancelled (₹0)</span>
                                                      ) : (
                                                        <span className={p.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                                          {p.netProfit >= 0 ? `+₹${p.netProfit}` : `-₹${Math.abs(p.netProfit)}`} ({p.marginPct}%)
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="p-2">
                                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                        ord.order_status === 'Delivered'
                                                          ? 'bg-emerald-100 text-emerald-800'
                                                          : p.isCancelled
                                                          ? 'bg-rose-100 text-rose-800'
                                                          : 'bg-amber-100 text-amber-800'
                                                      }`}>
                                                        {ord.order_status}
                                                      </span>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                      {dailyPnlData.filteredDays.length > 0 && (
                        <tfoot className="bg-gray-900 text-white font-extrabold text-xs">
                          <tr>
                            <td className="p-3">TOTAL ({dailyPnlData.filteredDays.length} Days)</td>
                            <td className="p-3">{dailyPnlData.summary.validOrders} valid</td>
                            <td className="p-3">{dailyPnlData.summary.unitsSold} units</td>
                            <td className="p-3">₹{dailyPnlData.summary.itemsSell.toLocaleString()}</td>
                            <td className="p-3 text-rose-300">₹{dailyPnlData.summary.itemsCost.toLocaleString()}</td>
                            <td className="p-3 text-sky-300">+₹{dailyPnlData.summary.deliveryFee.toLocaleString()}</td>
                            <td className="p-3 text-amber-300">-₹{(dailyPnlData.summary.discount + dailyPnlData.summary.freeGiftCost).toLocaleString()}</td>
                            <td className="p-3 text-emerald-300">₹{dailyPnlData.summary.grossRevenue.toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-lg font-black ${
                                dailyPnlData.summary.netProfit >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                              }`}>
                                {dailyPnlData.summary.netProfit >= 0
                                  ? `+₹${dailyPnlData.summary.netProfit.toLocaleString()}`
                                  : `-₹${Math.abs(dailyPnlData.summary.netProfit).toLocaleString()}`}
                              </span>
                            </td>
                            <td className="p-3">{dailyPnlData.summary.marginPct}%</td>
                            <td className="p-3"></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Recent Individual Orders Sales & P&L Ledger */}
                {reportModuleFilter === 'sales' && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                          Recent Orders Sales & Profit Ledger
                        </h4>
                        <span className="text-xs text-gray-500 font-semibold">{orders.length} total orders</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleExportExcel('sales')}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Export Orders Sales & P&L Excel</span>
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Order ID & Date</th>
                            <th className="p-3">Customer</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Purchase Cost</th>
                            <th className="p-3">Subtotal</th>
                            <th className="p-3">Fee</th>
                            <th className="p-3">Total Revenue</th>
                            <th className="p-3">Order Net Profit</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {orders.slice(0, 25).map(o => {
                            const pnl = getOrderPnlBreakdown(o);
                            return (
                              <tr key={o.id} className="hover:bg-gray-50">
                                <td className="p-3">
                                  <span className="font-mono font-bold text-gray-900 block">#{o.id}</span>
                                  <span className="text-[10px] text-gray-400">
                                    {o.created_at ? new Date(o.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <span className="font-semibold text-gray-900 block">{o.customer_name}</span>
                                  <span className="text-[10px] text-gray-400">{o.customer_phone}</span>
                                </td>
                                <td className="p-3 text-gray-600">{o.items?.length || 0} items ({pnl.totalUnits} units)</td>
                                <td className="p-3 font-mono font-bold text-rose-700">
                                  {pnl.isCancelled ? '-' : `₹${pnl.itemsCost}`}
                                </td>
                                <td className="p-3">₹{o.subtotal}</td>
                                <td className="p-3">₹{o.delivery_fee}</td>
                                <td className="p-3 font-black text-brand-700">₹{o.total}</td>
                                <td className="p-3 font-black">
                                  {pnl.isCancelled ? (
                                    <span className="text-gray-400 text-[10px]">Cancelled</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-lg text-[11px] ${
                                      pnl.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}>
                                      {pnl.netProfit >= 0 ? `+₹${pnl.netProfit}` : `-₹${Math.abs(pnl.netProfit)}`} ({pnl.marginPct}%)
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    o.order_status === 'Delivered'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : pnl.isCancelled
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {o.order_status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-REPORT 2: PRICE & PROFIT MARGINS (Purchase vs Selling vs MRP) */}
            {reportModuleFilter === 'margin' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Catalog Cost Value</span>
                    <span className="text-2xl font-black text-gray-800 mt-1 block">
                      ₹{products.reduce((sum, p) => sum + ((Number(p.purchase_price) || 0) * (Number(p.stock) || 0)), 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Total purchase investment in current stock</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Catalog Retail Value</span>
                    <span className="text-2xl font-black text-brand-700 mt-1 block">
                      ₹{products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Expected customer realization</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Potential Gross Profit</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                      ₹{(
                        products.reduce((sum, p) => sum + ((Number(p.price) || 0) * (Number(p.stock) || 0)), 0) -
                        products.reduce((sum, p) => sum + ((Number(p.purchase_price) || 0) * (Number(p.stock) || 0)), 0)
                      ).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Estimated catalog gross margin</span>
                  </div>
                </div>

                {/* Margin Comparison Table */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                        Price Structure & Margin Analysis
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Comparing Purchase Cost vs Selling Price vs Printed MRP for all products
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('margin')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Margins Excel</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Product Name</th>
                          <th className="p-3">Unit</th>
                          <th className="p-3">Purchase Price (Cost)</th>
                          <th className="p-3">Selling Price</th>
                          <th className="p-3">MRP</th>
                          <th className="p-3">Customer Discount</th>
                          <th className="p-3">Profit per Unit</th>
                          <th className="p-3">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.flatMap(p => {
                          const validVars = Array.isArray(p.variants)
                            ? p.variants.filter(
                                v => v && String(v.unit || '').trim() !== '' && String(v.unit || '').trim() !== '0' && Number(v.price) > 0
                              )
                            : [];
                          const rows = validVars.length > 0
                            ? validVars.map((v, idx) => ({
                                rowKey: `${p.id}-${v.id || idx}`,
                                name: p.name,
                                brand: p.brand,
                                unit: v.unit,
                                cost: Number(v.purchase_price) || Number(p.purchase_price) || 0,
                                sell: Number(v.price) || 0,
                                mrp: Number(v.mrp) || Number(v.price) || 0,
                                isVariant: validVars.length > 1
                              }))
                            : [
                                {
                                  rowKey: p.id,
                                  name: p.name,
                                  brand: p.brand,
                                  unit: (p.unit && String(p.unit).trim() !== '0') ? p.unit : '1 unit',
                                  cost: Number(p.purchase_price) || 0,
                                  sell: Number(p.price) || 0,
                                  mrp: Number(p.mrp) || Number(p.price) || 0,
                                  isVariant: false
                                }
                              ];

                          return rows.map(r => {
                            const profit = r.cost > 0 ? r.sell - r.cost : 0;
                            const marginPct = r.cost > 0 ? Math.round((profit / r.cost) * 100) : 0;
                            const customerDiscount = r.mrp > r.sell ? r.mrp - r.sell : 0;

                            return (
                              <tr key={r.rowKey} className="hover:bg-gray-50">
                                <td className="p-3">
                                  <span className="font-bold text-gray-900 block truncate max-w-xs">
                                    {r.name} {r.isVariant ? <span className="text-brand-700 font-black">({r.unit})</span> : null}
                                  </span>
                                  <span className="text-[10px] text-gray-400">{r.brand}</span>
                                </td>
                                <td className="p-3 font-semibold text-gray-700">{r.unit}</td>
                                <td className="p-3 font-mono font-bold text-gray-700">
                                  {r.cost > 0 ? `₹${r.cost}` : <span className="text-gray-300 font-normal">Not Set</span>}
                                </td>
                                <td className="p-3 font-black text-brand-700">₹{r.sell}</td>
                                <td className="p-3 text-gray-400 line-through">₹{r.mrp}</td>
                                <td className="p-3 text-emerald-600 font-bold">
                                  {customerDiscount > 0 ? `₹${customerDiscount} off` : '0%'}
                                </td>
                                <td className="p-3 font-bold">
                                  {r.cost > 0 ? (
                                    <span className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                      {profit >= 0 ? `+₹${profit}` : `-₹${Math.abs(profit)}`}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {r.cost > 0 ? (
                                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                      marginPct >= 20 ? 'bg-emerald-100 text-emerald-800' : marginPct > 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {marginPct}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 text-[10px]">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-REPORT 3: INVENTORY & VALUATION */}
            {reportModuleFilter === 'inventory' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total SKUs Listed</span>
                    <span className="text-2xl font-black text-gray-900 mt-1 block">{products.length}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Active catalog items</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Units in Stock</span>
                    <span className="text-2xl font-black text-brand-700 mt-1 block">
                      {products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Available inventory pieces</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Low Stock Alerts (&le; 15)</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block">{lowStockProducts.length}</span>
                    <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Need restocking soon</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Out of Stock SKUs</span>
                    <span className="text-2xl font-black text-rose-600 mt-1 block">
                      {products.filter(p => p.stock <= 0).length}
                    </span>
                    <span className="text-[10px] text-rose-700 font-semibold mt-0.5 block">Unavailable to customers</span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                        Inventory Stock Status & Reorder List
                      </h4>
                      <p className="text-[11px] text-gray-500">Live stock counts, cost valuation, and reorder alerts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('inventory')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Inventory Excel</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Product</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Current Stock</th>
                          <th className="p-3">Stock Status</th>
                          <th className="p-3">Purchase Cost</th>
                          <th className="p-3">Total Holding Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {products.map(p => {
                          const stock = Number(p.stock) || 0;
                          const cost = Number(p.purchase_price) || 0;
                          const holdingVal = stock * cost;

                          return (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="p-3 font-bold text-gray-900">{p.name} ({p.unit})</td>
                              <td className="p-3 text-gray-600">{p.category_id}</td>
                              <td className="p-3 font-bold">{stock} units</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  stock <= 0 ? 'bg-rose-100 text-rose-800' : stock <= 15 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {stock <= 0 ? 'Out of Stock' : stock <= 15 ? 'Low Stock' : 'Healthy Stock'}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-gray-700">₹{cost}</td>
                              <td className="p-3 font-mono font-bold text-gray-900">₹{holdingVal.toLocaleString()}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-REPORT 4: CUSTOMER LOYALTY STAMPS & SURPRISE GIFTS */}
            {reportModuleFilter === 'loyalty' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Qualifying Orders (&ge; ₹250)</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block">
                      {orders.filter(o => (Number(o.total) || 0) >= 250).length}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Orders that unlocked +1 Stamp</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Stamps Issued</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block">
                      ⭐ {orders.filter(o => (Number(o.total) || 0) >= 250).length}
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Awarded to loyal shoppers</span>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Surprise Home Gifts Won</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                      🎁 {orders.filter(o => o.surprise_gift_awarded).length}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">10-stamp milestone rewards</span>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                  <Gift className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-extrabold text-sm text-amber-950">Stamp Loyalty & Gift Fulfillment Guide:</h5>
                    <p className="mt-1 leading-relaxed">
                      Whenever an order displays <strong>"Surprise Gift Eligible 🎁"</strong> in the dispatch queue, pack a complimentary promotional gift packet (e.g. snack treats, dry fruits, or kitchen surprise) with the order bag for the rider to deliver to the customer's home.
                    </p>
                  </div>
                </div>

                {/* Customer Loyalty Table with Excel Export */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                        Customer Loyalty & Stamp Progress Ledger
                      </h4>
                      <p className="text-[11px] text-gray-500">Customers earning ₹250+ milestone stamps and home surprise gifts</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleExportExcel('loyalty')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Export Loyalty Excel</span>
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Total Orders</th>
                          <th className="p-3">Spend</th>
                          <th className="p-3">Qualifying (≥ ₹250)</th>
                          <th className="p-3">Active Stamps</th>
                          <th className="p-3">Surprise Gifts</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {stampCustomers.slice(0, 15).map(c => (
                          <tr key={c.phone} className="hover:bg-gray-50">
                            <td className="p-3">
                              <span className="font-bold text-gray-900 block">{c.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{c.phone}</span>
                            </td>
                            <td className="p-3 font-semibold">{c.totalOrders}</td>
                            <td className="p-3 font-black text-brand-700">₹{c.totalSpend.toLocaleString()}</td>
                            <td className="p-3 font-bold text-amber-700">{c.totalQualifying}</td>
                            <td className="p-3">
                              <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[10px]">
                                ⭐ {c.activeStamps} / 10
                              </span>
                            </td>
                            <td className="p-3 font-bold text-emerald-700">🎁 {c.giftsEarned}</td>
                            <td className="p-3">
                              {c.isFulfilled ? (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Gift Delivered ✅
                                </span>
                              ) : c.isGiftEligible ? (
                                <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                                  Gift Eligible 🎁
                                </span>
                              ) : (
                                <span className="text-gray-400 text-[10px]">{10 - c.activeStamps} to gift</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-REPORT 5: RIDER PERFORMANCE */}
            {reportModuleFilter === 'riders' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">
                      Rider Delivery Performance Ledger
                    </h4>
                    <p className="text-[11px] text-gray-500">Live order allocation, delivered count, and route status per rider</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportExcel('riders')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Riders Excel</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {staff.map(st => {
                    const riderOrders = orders.filter(o => o.assigned_staff_id === st.id);
                    const completed = riderOrders.filter(o => o.order_status === 'Delivered').length;
                    const inProgress = riderOrders.filter(o => o.order_status === 'Out for Delivery').length;

                    return (
                      <div key={st.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-gray-900">{st.name}</h4>
                            <p className="text-xs text-gray-500">{st.phone} • {st.vehicle}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center text-xs">
                          <div className="p-2 bg-gray-50 rounded-xl">
                            <span className="text-gray-400 block text-[10px]">Assigned</span>
                            <span className="font-black text-gray-900 text-sm">{riderOrders.length}</span>
                          </div>
                          <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
                            <span className="text-emerald-600 block text-[10px]">Delivered</span>
                            <span className="font-black text-emerald-700 text-sm">{completed}</span>
                          </div>
                          <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
                            <span className="text-amber-600 block text-[10px]">On Route</span>
                            <span className="font-black text-amber-700 text-sm">{inProgress}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-REPORT 6: DELIVERED ORDERS & CUSTOMER CONTACTS */}
            {reportModuleFilter === 'delivered_orders' && (() => {
              const deliveredOrders = (orders || []).filter(o => {
                if (!o) return false;
                const st = String(o.order_status || '').toLowerCase();
                return st === 'delivered' || st === 'completed';
              });
              const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
              const totalDeliveryFees = deliveredOrders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
              const totalUnits = deliveredOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, it) => s + (Number(it.qty) || 1), 0), 0);

              return (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900 flex items-center gap-2">
                        <span>Delivered Orders & Customer Contacts Ledger</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          {deliveredOrders.length} Orders
                        </span>
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Complete export with customer mobile numbers, delivery addresses, landmark, items, payment mode, and assigned riders.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadDeliveredOrdersExcel}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                        <span>Download Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportExcel('delivered_orders')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Download CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Total Delivered</span>
                      <span className="text-xl font-black text-gray-900 block mt-1">{deliveredOrders.length}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">100% Completed</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Delivered Revenue</span>
                      <span className="text-xl font-black text-emerald-700 block mt-1">₹{totalRevenue.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">Net Collected</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Delivery Fees</span>
                      <span className="text-xl font-black text-indigo-700 block mt-1">₹{totalDeliveryFees.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">Fulfillment fee</span>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Units Delivered</span>
                      <span className="text-xl font-black text-amber-700 block mt-1">{totalUnits}</span>
                      <span className="text-[10px] text-gray-400 font-medium mt-0.5 block">Packaged goods</span>
                    </div>
                  </div>

                  {/* Orders Table */}
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                          <tr>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Customer Name</th>
                            <th className="p-3">Contact Mobile</th>
                            <th className="p-3">Delivery Address</th>
                            <th className="p-3">Items</th>
                            <th className="p-3">Total Paid</th>
                            <th className="p-3">Payment</th>
                            <th className="p-3">Rider</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {deliveredOrders.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="p-8 text-center text-gray-400 font-bold">
                                No successfully delivered orders found yet.
                              </td>
                            </tr>
                          ) : (
                            deliveredOrders.slice(0, 50).map(o => {
                              const cleanPhone = String(o.customer_phone || o.address?.phone || '').replace(/\D/g, '').slice(-10);
                              return (
                                <tr key={o.id} className="hover:bg-gray-50/80 transition-colors">
                                  <td className="p-3 font-mono font-bold text-gray-900">#{o.id}</td>
                                  <td className="p-3 text-gray-500 whitespace-nowrap">
                                    {o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '-'}
                                  </td>
                                  <td className="p-3 font-bold text-gray-900 whitespace-nowrap">
                                    {o.customer_name || 'Customer'}
                                  </td>
                                  <td className="p-3 font-mono font-bold text-emerald-800 whitespace-nowrap">
                                    {cleanPhone ? `+91 ${cleanPhone}` : '-'}
                                  </td>
                                  <td className="p-3 text-gray-600 max-w-xs truncate" title={o.address?.line1}>
                                    {o.address?.line1 || o.delivery_address || '-'}
                                    {o.address?.landmark ? ` (${o.address.landmark})` : ''}
                                  </td>
                                  <td className="p-3 text-gray-700 max-w-xs truncate">
                                    {(o.items || []).map(it => `${it.qty}x ${it.name}`).join(', ')}
                                  </td>
                                  <td className="p-3 font-extrabold text-emerald-700 whitespace-nowrap">
                                    ₹{o.total}
                                  </td>
                                  <td className="p-3 text-gray-600 whitespace-nowrap">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100">
                                      {o.payment_method || 'COD'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-600 whitespace-nowrap">
                                    {o.delivery_boy_name || o.assigned_staff_id || 'Store Dispatch'}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= TAB 4: CATEGORIES & MAPPING ================= */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div>
                <h3 className="font-bold text-sm text-gray-900">Category Catalog & Service Rules</h3>
                <p className="text-xs text-gray-500">Configure custom delivery radius & subcategories</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setCategoryImagePreview('');
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={cat.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80'}
                      alt={cat.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border"
                    />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-gray-900">{cat.name}</h4>
                      <span className="text-[10px] text-gray-400 font-mono">ID: {cat.id}</span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service Radius:</span>
                      <span className="font-bold text-gray-900">
                        {cat.max_radius_km ? `Restricted to ${cat.max_radius_km} km` : `Full Zone (${settings?.max_radius_km || 10} km)`}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subcategories:</span>
                    <div className="flex flex-wrap gap-1">
                      {(cat.subcategories || []).map(s => (
                        <span key={s} className="bg-gray-100 text-gray-700 text-[10px] px-2 py-0.5 rounded-md font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCategoryImagePreview(cat.image || '');
                        setIsCategoryModalOpen(true);
                      }}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Rules & Image</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: COMPANY DETAILS & RADIUS SETTINGS ================= */}
        {activeTab === 'radius-settings' && (
          <div className="max-w-4xl bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-8">
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Company Profile & Legal Details</h3>
                    <p className="text-xs text-gray-500">Printed on thermal slips, tax invoices, and customer communications.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Company / Store Name *</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Store Slogan / Tagline</label>
                    <input
                      type="text"
                      value={storeTagline}
                      onChange={(e) => setStoreTagline(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Customer Helpline / Phone *</label>
                    <input
                      type="text"
                      required
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Customer Support Email *</label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Store UPI ID / VPA *</label>
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">UPI Merchant Business Name *</label>
                    <input
                      type="text"
                      required
                      value={upiMerchantName}
                      onChange={(e) => setUpiMerchantName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div className="md:col-span-2 pt-2 border-t border-gray-100">
                    <span className="text-[11px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 inline-flex items-center gap-1.5">
                      💳 Razorpay Online Payment Gateway (UPI, Cards, NetBanking, Wallets)
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Razorpay Key ID *</label>
                    <input
                      type="text"
                      required
                      value={razorpayKeyId}
                      onChange={(e) => setRazorpayKeyId(e.target.value)}
                      placeholder="rzp_live_..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Razorpay Key Secret</label>
                    <div className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-gray-50 border border-gray-200 text-gray-500 font-mono flex items-center justify-between">
                      <span>••••••••••••••••••••••••</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans font-bold">Secure on Server (.env)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Store Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Thermal Receipt Footer Message</label>
                  <input
                    type="text"
                    value={receiptFooterMsg}
                    onChange={(e) => setReceiptFooterMsg(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <label className="block font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-brand-600" />
                    <span>Store Logo / Storefront Image</span>
                  </label>

                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {storeLogo ? (
                        <img src={storeLogo} alt="Store logo" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-7 h-7 text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isUploadingStoreLogo ? 'Uploading...' : 'Upload Logo from Computer'}</span>
                        <input type="file" accept="image/*" onChange={handleStoreLogoChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Hours */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Opening Time *</label>
                    <input
                      type="time"
                      required
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Closing Time *</label>
                    <input
                      type="time"
                      required
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Days Open *</label>
                    <input
                      type="text"
                      required
                      value={daysOpen}
                      onChange={(e) => setDaysOpen(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates & Radius */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-50/50 p-4 rounded-2xl border border-brand-100">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-brand-600" />
                      <span>Store GPS Hub Coordinates</span>
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Click below while at your store to capture & immediately save your exact shop GPS location.
                    </p>
                    {storeGpsMsg && (
                      <p className="text-[11px] font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{storeGpsMsg}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${storeLat},${storeLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-xl text-xs border border-gray-300 flex items-center gap-1.5 shadow-xs transition-all"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-brand-600" />
                      <span>Verify Store Pin on Map</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert("Geolocation is not supported by your browser");
                          return;
                        }
                        setIsCapturingStoreGps(true);
                        setStoreGpsMsg('');
                        navigator.geolocation.getCurrentPosition(
                          async (pos) => {
                            const lat = Number(pos.coords.latitude.toFixed(6));
                            const lng = Number(pos.coords.longitude.toFixed(6));
                            setStoreLat(lat);
                            setStoreLng(lng);
                            setIsCapturingStoreGps(false);
                            let nextAddr = storeAddress;
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`, {
                                headers: { 'User-Agent': 'GhartakKart Delivery App' }
                              });
                              if (res.ok) {
                                const data = await res.json();
                                if (data.display_name && !storeAddress) {
                                  nextAddr = data.display_name.split(',').slice(0, 4).join(', ');
                                  setStoreAddress(nextAddr);
                                }
                              }
                            } catch {}

                            const updatedSettingsPayload = {
                              ...(settings || {}),
                              store_name: storeName,
                              store_tagline: storeTagline,
                              store_address: nextAddr,
                              store_logo: storeLogo,
                              support_phone: supportPhone,
                              support_email: supportEmail,
                              receipt_footer_msg: receiptFooterMsg,
                              upi_id: upiId,
                              upi_merchant_name: upiMerchantName,
                              razorpay_key_id: razorpayKeyId,
                              store_lat: lat,
                              store_lng: lng,
                              max_radius_km: Number(maxRadiusKm),
                              fee_slabs: slabs,
                              delivery_hours: {
                                open: openingTime,
                                close: closingTime,
                                is_open: storeIsOpen,
                                closed_message: closedNotice,
                                days_open: daysOpen
                              }
                            };
                            setSettings(updatedSettingsPayload);
                            try { localStorage.setItem('gk_settings', JSON.stringify(updatedSettingsPayload)); } catch {}
                            await syncToFirebase('settings', updatedSettingsPayload);
                            setStoreGpsMsg(`Captured & Saved to Live Store: ${lat}, ${lng}`);
                          },
                          (err) => {
                            setIsCapturingStoreGps(false);
                            alert("GPS capture failed or permission denied: " + err.message);
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                      }}
                      disabled={isCapturingStoreGps}
                      className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${isCapturingStoreGps ? 'animate-spin' : ''}`} />
                      <span>{isCapturingStoreGps ? 'Capturing GPS...' : 'Auto-Capture & Save Store GPS'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Store Center Latitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={storeLat}
                      onChange={(e) => setStoreLat(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Store Center Longitude *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={storeLng}
                      onChange={(e) => setStoreLng(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-brand-50/60 p-4 rounded-2xl border border-brand-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <label className="text-xs font-bold text-brand-900 block">
                        Maximum Service Radius (km) *
                      </label>
                      <p className="text-[11px] text-gray-500">
                        Orders outside this radius will be blocked automatically. Type exact value manually.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        max="100"
                        required
                        value={maxRadiusKm}
                        onChange={(e) => setMaxRadiusKm(Number(e.target.value) || 0)}
                        className="w-24 px-3 py-2 text-sm font-black text-brand-700 bg-white rounded-xl border border-brand-300 text-center focus:ring-2 focus:ring-brand-500 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-brand-800">km</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Fee Slabs & Minimum Order Value Settings */}
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>Distance Slabs, Delivery Fees & Minimum Order</span>
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Manually set radius ranges, delivery fees, minimum order amounts, and free delivery thresholds.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lastSlab = slabs[slabs.length - 1];
                        const nextMin = lastSlab ? lastSlab.max_km : 0;
                        setSlabs([
                          ...slabs,
                          { min_km: nextMin, max_km: nextMin + 3, fee: 30, min_order: 200, free_above: 500 }
                        ]);
                      }}
                      className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl flex items-center gap-1 border border-brand-200"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Slab</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {slabs.map((slab, index) => (
                      <div
                        key={index}
                        className="p-3 bg-gray-50/80 rounded-2xl border border-gray-200 grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-center text-xs"
                      >
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">From (km)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={slab.min_km}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSlabs(prev => prev.map((s, idx) => idx === index ? { ...s, min_km: val } : s));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">To (km)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={slab.max_km}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSlabs(prev => prev.map((s, idx) => idx === index ? { ...s, max_km: val } : s));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Delivery Fee (₹)</label>
                          <input
                            type="number"
                            value={slab.fee}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSlabs(prev => prev.map((s, idx) => idx === index ? { ...s, fee: val } : s));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-brand-700"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Min. Order (₹)</label>
                          <input
                            type="number"
                            value={slab.min_order}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setSlabs(prev => prev.map((s, idx) => idx === index ? { ...s, min_order: val } : s));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-600 mb-1">Free Above (₹)</label>
                          <input
                            type="number"
                            value={slab.free_above || ''}
                            placeholder="Optional"
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setSlabs(prev => prev.map((s, idx) => idx === index ? { ...s, free_above: val } : s));
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg font-bold text-emerald-700"
                          />
                        </div>
                        <div className="flex justify-end pt-3 sm:pt-0">
                          {slabs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSlabs(prev => prev.filter((_, idx) => idx !== index));
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Slab"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {settingsSavedNotice && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Settings saved to Firebase Realtime Database!</span>
                </div>
              )}

              <button
                type="submit"
                className="py-3 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl text-xs shadow-md flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Delivery Settings</span>
              </button>
            </form>
          </div>
        )}

        {/* ================= TAB 6: STAFF ACCOUNTS & DELIVERY FLEET (SUPER ADMIN ONLY) ================= */}
        {isSuperAdmin && activeTab === 'staff' && (
          <div className="space-y-6">
            {/* SECTION 1: STAFF OPERATOR USER LOGINS (USER ID & PASSWORD) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Staff Operator Accounts</span>
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                        Restricted Order Processing Logins
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Create staff login IDs and passwords. Staff can ONLY check orders, view items & values, update status, and print slips. Everything else is hidden.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleExportExcel('staff_users')}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Download Staff Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateStaffUser}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create Staff Login User</span>
                  </button>
                </div>
              </div>

              {/* Security info box */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Strict Staff Privilege Enforcement & Tamper Protection:</p>
                  <p className="text-indigo-900 text-[11px] leading-relaxed">
                    Staff members log in with their assigned <strong>User ID</strong> and <strong>Password</strong> at the admin login page. Once logged in, they can ONLY view incoming customer orders, inspect customer contact details & items, process dispatch steps, and print tax receipts. <strong>Catalog editing, store radius/pricing, deletion of any kind, and audit logs are completely hidden</strong> and locked from staff.
                  </p>
                </div>
              </div>

              {/* Staff Accounts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(staffUsers || []).map(st => {
                  const isVisible = !!showStaffPasswords[st.id];
                  const isActive = st.status !== 'disabled';
                  return (
                    <div
                      key={st.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 ${
                        isActive
                          ? 'bg-white border-gray-200 shadow-sm'
                          : 'bg-gray-50 border-gray-200 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white ${isActive ? 'bg-indigo-600' : 'bg-gray-400'}`}>
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-gray-900 leading-tight">{st.name}</h4>
                            <p className="text-[11px] text-gray-500 font-mono mt-0.5">{st.phone || 'No phone'}</p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </div>

                      {/* Credentials Display */}
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">User ID:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                            <span>{st.user_id || st.username}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(st.user_id || st.username);
                                alert(`Copied User ID: ${st.user_id || st.username}`);
                              }}
                              className="text-gray-400 hover:text-indigo-600"
                              title="Copy User ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Password:</span>
                          <div className="flex items-center gap-1 font-mono text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                            <span>{isVisible ? st.password : '••••••••'}</span>
                            <button
                              type="button"
                              onClick={() => setShowStaffPasswords(prev => ({ ...prev, [st.id]: !prev[st.id] }))}
                              className="text-gray-400 hover:text-indigo-600"
                              title={isVisible ? 'Hide Password' : 'Show Password'}
                            >
                              {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(st.password);
                                alert(`Copied Password for ${st.name}`);
                              }}
                              className="text-gray-400 hover:text-indigo-600"
                              title="Copy Password"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Card Action Controls */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleStaffUserStatus(st.id)}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? 'Disable Access' : 'Activate Access'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaffUser(st)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffUser(st.id)}
                            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: DELIVERY FLEET, SHIFTS & ID VERIFICATION CONSOLE */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                      <Bike className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-base text-gray-900">Delivery App Fleet & Shift Management</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Assign Rider Login ID & Passwords, manage operational shifts, and verify ID/KYC documents for delivery boys
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShiftModalOpen(true)}
                    className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>+ Add Shift Slot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(true)}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Delivery Rider</span>
                  </button>
                </div>
              </div>

              {/* STORE SHIFTS STRIP */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-600" />
                    <span>Operational Delivery Shifts (Controlled Exclusively by Admin)</span>
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {storeShifts.length} Active Shifts
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {storeShifts.map((sh, idx) => {
                    const riderCount = staff.filter(s => (s.shift || '').toLowerCase().includes(sh.name.toLowerCase())).length;
                    return (
                      <div key={sh.id || idx} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-gray-900">{sh.name}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{sh.surge || '1.0x'}</span>
                          </div>
                          <p className="text-[11px] text-brand-700 font-semibold font-mono mt-0.5">{sh.time}</p>
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{sh.zone}</p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] font-bold text-gray-500">
                          <span>{riderCount} Riders Assigned</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* DELIVERY RIDERS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {staff.map(st => {
                  const assignedCount = orders.filter(o => o.assigned_staff_id === st.id && !['Delivered', 'Cancelled'].includes(o.order_status)).length;
                  const deliveredCount = orders.filter(o => o.assigned_staff_id === st.id && o.order_status === 'Delivered').length;
                  const isVerified = st.kyc_status === 'verified';
                  const isRejected = st.kyc_status === 'rejected';
                  const isPassVisible = !!showRiderPasswords[st.id];

                  return (
                    <div key={st.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 flex flex-col justify-between">
                      <div>
                        {/* Rider Header & Status */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold shrink-0">
                              <Bike className="w-6 h-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-gray-900">{st.name}</h4>
                                <span className={`w-2 h-2 rounded-full ${st.active !== false ? 'bg-emerald-500' : 'bg-gray-400'}`} title={st.active !== false ? 'Account Active' : 'Deactivated'} />
                              </div>
                              <p className="text-xs text-gray-500 font-mono">{st.phone} • {st.vehicle || 'Bike'}</p>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isVerified 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : isRejected 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isVerified ? 'ID Verified ✓' : isRejected ? 'ID Rejected ✕' : 'Pending Review ⏳'}
                          </span>
                        </div>

                        {/* Login ID & Password Box */}
                        <div className="mt-3 p-2.5 bg-slate-900 text-white rounded-xl text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Rider Login ID:</span>
                            <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                              {st.username || st.phone || st.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Password:</span>
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-slate-200">
                                {isPassVisible ? (st.password || '123456') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowRiderPasswords(prev => ({ ...prev, [st.id]: !prev[st.id] }))}
                                className="text-gray-400 hover:text-white p-0.5"
                                title="Toggle Show Password"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Shift & Duty Info */}
                        <div className="mt-2.5 bg-gray-50 p-2.5 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Assigned Shift:</span>
                            <span className="font-bold text-brand-700 truncate max-w-[170px]" title={st.shift || 'Morning Shift'}>
                              {st.shift || 'Morning Shift (07:00 AM - 12:00 PM)'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Active Deliveries:</span>
                            <span className="font-extrabold text-gray-800">{assignedCount} active</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Total Delivered:</span>
                            <span className="font-bold text-gray-700">{deliveredCount} delivered</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRiderForAdmin(st)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                          <span>Inspect ID, Live GPS & KYC (📍)</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRider(st)}
                            className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-1 transition"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-gray-500" />
                            <span>Edit ID / Shift</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickVerifyKyc(st, isVerified ? 'rejected' : 'verified')}
                            className={`py-1.5 font-bold rounded-xl flex items-center justify-center gap-1 transition ${
                              isVerified 
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {isVerified ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject ID</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Verify ID ✓</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: SECURITY & OPERATIONS AUDIT LOG (SUPER ADMIN ONLY) ================= */}
        {isSuperAdmin && activeTab === 'audit' && (
          <div className="space-y-6">
            {/* Header with Title and Excel Download */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                      <span>Security & Operations Audit Trail</span>
                      <span className="bg-purple-100 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-200">
                        🔒 Super Admin Eyes Only
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Immutable real-time audit log recording all staff logins, order status transitions, and printed invoice slips.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleExportExcel('audit')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-sm transition-all"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Audit Log Excel</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Recorded Events</p>
                <p className="text-2xl font-black text-gray-900 mt-1">{(auditLogs || []).length}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Total audit trail entries</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm bg-emerald-50/20">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Status Transitions</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">
                  {(auditLogs || []).filter(l => (l.action || '').toLowerCase().includes('status')).length}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Order pipeline updates</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm bg-sky-50/20">
                <p className="text-[11px] font-bold text-sky-700 uppercase tracking-wider">Invoices Printed</p>
                <p className="text-2xl font-black text-sky-700 mt-1">
                  {(auditLogs || []).filter(l => (l.action || '').toLowerCase().includes('receipt') || (l.action || '').toLowerCase().includes('invoice')).length}
                </p>
                <p className="text-[10px] text-sky-600 mt-0.5">Tax slip prints by staff</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm bg-purple-50/20">
                <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">System Logins</p>
                <p className="text-2xl font-black text-purple-700 mt-1">
                  {(auditLogs || []).filter(l => (l.action || '').toLowerCase().includes('login')).length}
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5">Staff & Admin sessions</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search logs by staff name, user ID, order ID or action..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  {[
                    { id: 'all', label: 'All Actions' },
                    { id: 'status', label: 'Status Updates' },
                    { id: 'invoice', label: 'Slips Printed' },
                    { id: 'login', label: 'Logins' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAuditActionFilter(f.id)}
                      className={`px-3 py-1.5 rounded-lg transition-all ${
                        auditActionFilter === f.id
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <select
                  value={auditUserFilter}
                  onChange={(e) => setAuditUserFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs font-semibold text-gray-700 focus:outline-none"
                >
                  <option value="all">All Operators</option>
                  <option value="ghartakkartkhair">Super Admin</option>
                  {(staffUsers || []).map(s => (
                    <option key={s.id} value={s.user_id || s.username}>
                      Staff: {s.name} ({s.user_id || s.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Operator (User)</th>
                      <th className="p-3.5">Action Event</th>
                      <th className="p-3.5">Order ID</th>
                      <th className="p-3.5">Audit Activity Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAuditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-gray-400">
                          <Shield className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                          <p className="font-bold text-gray-600">No audit logs found</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Actions performed by staff and admin will show here in real-time.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAuditLogs.map(log => {
                        const isStaffActor = log.role === 'staff';
                        const isStatusAction = (log.action || '').toLowerCase().includes('status');
                        const isPrintAction = (log.action || '').toLowerCase().includes('receipt') || (log.action || '').toLowerCase().includes('invoice');
                        const isLoginAction = (log.action || '').toLowerCase().includes('login');

                        return (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-3.5 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : 'N/A'}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isStaffActor ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                                <div>
                                  <span className="font-bold text-gray-900 block">{log.user_name || 'System'}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    ID: {log.user_id} &middot; <strong className={isStaffActor ? 'text-indigo-600' : 'text-emerald-700'}>{log.role?.toUpperCase()}</strong>
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                isStatusAction
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPrintAction
                                    ? 'bg-sky-100 text-sky-800'
                                    : isLoginAction
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}>
                                {isStatusAction && <Clock className="w-3 h-3" />}
                                {isPrintAction && <Printer className="w-3 h-3" />}
                                {isLoginAction && <Key className="w-3 h-3" />}
                                <span>{log.action}</span>
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-mono font-bold text-gray-700">
                              {log.order_id ? `#${log.order_id}` : <span className="text-gray-300 font-normal">N/A</span>}
                            </td>
                            <td className="p-3.5 text-gray-800 font-medium">
                              {log.details}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Invoice Modal Preview */}
      {selectedOrderForInvoice && (
        <InvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}

      {/* Create Manual / Offline Order Modal (WhatsApp / Phone / Counter) */}
      <CreateManualOrderModal
        isOpen={isManualOrderModalOpen}
        onClose={() => setIsManualOrderModalOpen(false)}
        onOpenInvoice={(order) => setSelectedOrderForInvoice(order)}
      />

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-brand-700 to-emerald-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product (Multi-Weight & Price Support)'}
                </h3>
                <p className="text-[11px] text-emerald-100">
                  Configure base weight/price & add multiple weight/pack variants for customers to choose from
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setProductImages([]);
                  setNewImageUrl('');
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Title *</label>
                <input
                  name="name"
                  required
                  defaultValue={editingProduct?.name || ''}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta / Fresh Potato / Arhar Dal"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Main Category *</label>
                  <select
                    name="category_id"
                    required
                    defaultValue={editingProduct?.category_id || categories[0]?.id || 'cat-1'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none font-semibold bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Subcategory</label>
                  <input
                    name="subcategory"
                    defaultValue={editingProduct?.subcategory || ''}
                    placeholder="e.g. Dal, Flour, Masale, Haldiram, Potato"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Brand</label>
                  <input
                    name="brand"
                    defaultValue={editingProduct?.brand || 'GhartakKart'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Vendor / Supplier</label>
                  <select
                    name="vendor_id"
                    defaultValue={editingProduct?.vendor_id || ''}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none font-semibold bg-white text-xs"
                  >
                    <option value="">-- Auto-Map by Category --</option>
                    {(vendors || []).map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Base Weight & Price Section */}
              {(() => {
                const hasValidSection2 = (productVariants || []).some(
                  v => String(v?.unit || '').trim() !== '' && String(v?.unit || '').trim() !== '0' && (Number(v?.price) || 0) > 0
                );
                const pCost = Number(productCostInput) || 0;
                const pSell = Number(productPriceInput) || 0;
                const pMargin = pSell > 0 && pCost > 0 ? pSell - pCost : null;
                const pMarginPct = pCost > 0 && pMargin !== null ? Math.round((pMargin / pCost) * 100) : null;

                return (
                  <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px]">
                          1. Primary / Default Weight & Price
                        </span>
                        {hasValidSection2 && (
                          <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                            Optional (Using Section 2 Options Below)
                          </span>
                        )}
                        {pMargin !== null && (
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                            pMargin >= 0
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            Margin: {pMargin >= 0 ? `+₹${pMargin}` : `-₹${Math.abs(pMargin)}`} ({pMarginPct}%)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {['50 Gram', '100 Gram', '200 Gram', '250 Gram', '500 Gram', '1 kg', '2 kg', '5 kg', '250 ML', '500 ML', '1 Ltr', '1 Pc', '1 Pack', 'Half', 'Full'].map(preset => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setProductUnitInput(preset)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer transition-all ${
                              productUnitInput === preset
                                ? 'bg-brand-600 text-white border-brand-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-brand-50'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 items-end">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Base Weight / Unit {!hasValidSection2 && '*'}
                        </label>
                        <input
                          name="unit"
                          required={!hasValidSection2}
                          value={productUnitInput}
                          onChange={(e) => setProductUnitInput(e.target.value)}
                          placeholder="e.g. 1 kg, Half"
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-300 bg-white font-bold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Purchase Cost (₹)</label>
                        <input
                          name="purchase_price"
                          type="number"
                          step="any"
                          value={productCostInput}
                          onChange={(e) => setProductCostInput(e.target.value)}
                          placeholder="e.g. 75"
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          Selling Price (₹) {!hasValidSection2 && '*'}
                        </label>
                        <input
                          name="price"
                          type="number"
                          step="any"
                          required={!hasValidSection2}
                          value={productPriceInput}
                          onChange={(e) => setProductPriceInput(e.target.value)}
                          placeholder="e.g. 90"
                          className="w-full px-2.5 py-2 rounded-xl border border-brand-400 bg-white font-black text-brand-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">
                          MRP (₹) {!hasValidSection2 && '*'}
                        </label>
                        <input
                          name="mrp"
                          type="number"
                          step="any"
                          required={!hasValidSection2}
                          value={productMrpInput}
                          onChange={(e) => setProductMrpInput(e.target.value)}
                          placeholder="e.g. 100"
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Stock</label>
                        <input
                          name="stock"
                          type="number"
                          value={productStockInput}
                          onChange={(e) => setProductStockInput(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-gray-300 bg-white font-semibold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Margin</label>
                        <div className={`w-full px-2.5 py-2 rounded-xl border text-center font-black text-xs ${
                          pMargin !== null
                            ? (pMargin >= 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700')
                            : 'bg-gray-100 border-gray-200 text-gray-400'
                        }`}>
                          {pMargin !== null ? `${pMargin >= 0 ? `+₹${pMargin}` : `-₹${Math.abs(pMargin)}`} (${pMarginPct}%)` : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Multiple Weight & Price Options (Variants) Section */}
              <div className="p-4 rounded-2xl bg-amber-50/60 border-2 border-amber-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚖️ 2. Multiple Weight & Price Categories (Customer Options)</span>
                      <span className="bg-amber-200 text-amber-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                        {productVariants.length} Options
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Add different weights & prices (e.g. Half, Full, 100g, 250g, 500g, 1kg) so customers can select their option and you can track exact margin per option!
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAutoGenerateWeightVariants}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs cursor-pointer transition-all"
                    >
                      ⚡ Auto-Fill Weight Tiers (100g to 5kg)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setProductVariants(prev => [
                          ...prev,
                          {
                            id: `var-${Date.now()}-${prev.length}`,
                            unit: '',
                            purchase_price: Number(productCostInput) || 0,
                            price: Number(productPriceInput) || 0,
                            mrp: Number(productMrpInput) || Number(productPriceInput) || 0,
                            stock: Number(productStockInput) || 50
                          }
                        ])
                      }
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-[11px] rounded-xl shadow-xs cursor-pointer flex items-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Weight & Price Row</span>
                    </button>
                  </div>
                </div>

                {/* Variants Table Rows */}
                <div className="space-y-2">
                  {productVariants.map((v, idx) => {
                    const vCost = Number(v.purchase_price) || 0;
                    const vSell = Number(v.price) || 0;
                    const vMargin = vSell > 0 && vCost > 0 ? vSell - vCost : null;
                    const vMarginPct = vCost > 0 && vMargin !== null ? Math.round((vMargin / vCost) * 100) : null;

                    return (
                      <div
                        key={v.id || idx}
                        className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs"
                      >
                        <div className="col-span-3 sm:col-span-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Weight / Pack</label>
                          <input
                            type="text"
                            value={v.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductVariants(prev => prev.map((item, i) => i === idx ? { ...item, unit: val } : item));
                            }}
                            placeholder="e.g. Half, Full, 1 kg"
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 font-bold text-gray-900 text-xs focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Cost (₹)</label>
                          <input
                            type="number"
                            step="any"
                            value={v.purchase_price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductVariants(prev => prev.map((item, i) => i === idx ? { ...item, purchase_price: val } : item));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 text-xs font-mono focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-brand-700 uppercase">Sell Price (₹)</label>
                          <input
                            type="number"
                            step="any"
                            value={v.price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductVariants(prev => prev.map((item, i) => i === idx ? { ...item, price: val } : item));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-brand-400 font-black text-brand-700 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">MRP (₹)</label>
                          <input
                            type="number"
                            step="any"
                            value={v.mrp}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductVariants(prev => prev.map((item, i) => i === idx ? { ...item, mrp: val } : item));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-1">
                          <label className="block text-[9px] font-bold text-gray-400 uppercase">Stock</label>
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const val = e.target.value;
                              setProductVariants(prev => prev.map((item, i) => i === idx ? { ...item, stock: val } : item));
                            }}
                            className="w-full px-2 py-1 rounded-lg border border-gray-300 text-xs focus:outline-none"
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2">
                          <label className="block text-[9px] font-bold text-emerald-700 uppercase">Margin</label>
                          <div className={`px-2 py-1 rounded-lg border text-center font-black text-[11px] truncate ${
                            vMargin !== null
                              ? (vMargin >= 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-rose-50 border-rose-300 text-rose-700')
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}>
                            {vMargin !== null ? `${vMargin >= 0 ? `+₹${vMargin}` : `-₹${Math.abs(vMargin)}`} (${vMarginPct}%)` : '-'}
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-end pt-3">
                          <button
                            type="button"
                            onClick={() => setProductVariants(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="Remove weight option"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dietary Tag</label>
                  <select
                    name="veg_flag"
                    defaultValue={editingProduct?.veg_flag !== false ? 'true' : 'false'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none bg-white"
                  >
                    <option value="true">Pure Veg (Green)</option>
                    <option value="false">Non-Veg (Red)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Prep Time (mins)</label>
                  <input
                    name="prep_time_mins"
                    type="number"
                    defaultValue={editingProduct?.prep_time_mins || ''}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Gallery */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-brand-600" />
                    <span>Product Photos Gallery (Auto-Compressed for Fast Loading)</span>
                  </label>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {productImages.length} Photos
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? 'Compressing & Adding...' : 'Upload Images from Device'}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleMultipleImageFilesChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Or paste direct image URL (https://...)"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl shrink-0"
                  >
                    Add URL
                  </button>
                </div>

                {productImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-2">
                    {productImages.map((img, idx) => (
                      <div key={idx} className="relative rounded-xl border overflow-hidden aspect-square bg-white shadow-sm group">
                        <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        {idx === 0 ? (
                          <span className="absolute top-1 left-1 bg-brand-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">MAIN</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetMainImage(idx)}
                            className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded"
                          >
                            Set Main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="2"
                  defaultValue={editingProduct?.description || ''}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProductModalOpen(false);
                    setProductImages([]);
                    setNewImageUrl('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Save Product & Weight Options
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">
              {editingCategory ? 'Edit Category Rules' : 'Add New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Name</label>
                <input
                  name="name"
                  required
                  defaultValue={editingCategory?.name || ''}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Max Radius (km)</label>
                <input
                  name="max_radius_km"
                  type="number"
                  step="0.5"
                  defaultValue={editingCategory?.max_radius_km || ''}
                  placeholder="e.g. 5.0"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Subcategories (comma separated)</label>
                <input
                  name="subcategories"
                  defaultValue={editingCategory?.subcategories?.join(', ') || ''}
                  placeholder="Burgers, Pizza, Rolls"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                    {categoryImagePreview ? (
                      <img src={categoryImagePreview} alt="Category preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white font-bold rounded-xl text-xs cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingCategoryImage ? 'Processing...' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" onChange={handleCategoryImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
                <input
                  name="image"
                  value={categoryImagePreview}
                  onChange={(e) => setCategoryImagePreview(e.target.value)}
                  placeholder="Or paste image URL..."
                  className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setCategoryImagePreview('');
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl shadow-md"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT OFFER MODAL ================= */}
      {isOfferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl my-8 overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-rose-600 to-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {editingOffer ? 'Edit Offer / Banner' : 'Create New Offer Zone Banner 🔥'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Offers display in real-time in the customer Offer Zone & home screen
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffer} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs">
              {/* Title & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Offer Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={offerTitle}
                    onChange={(e) => setOfferTitle(e.target.value)}
                    placeholder="e.g. Mega Weekend Grocery Dhamaka!"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-gray-700 mb-1">
                    Offer Subtitle / Catchy Note
                  </label>
                  <input
                    type="text"
                    value={offerSubtitle}
                    onChange={(e) => setOfferSubtitle(e.target.value)}
                    placeholder="e.g. Flat ₹50 OFF on fresh local staples above ₹299"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Coupon Code & Discount Tag */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Coupon Promo Code</span>
                    <span className="text-[10px] text-gray-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={offerCode}
                    onChange={(e) => setOfferCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GHARTAK50"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 uppercase font-mono font-bold tracking-wider"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Discount Badge Tag
                  </label>
                  <input
                    type="text"
                    value={offerDiscountTag}
                    onChange={(e) => setOfferDiscountTag(e.target.value)}
                    placeholder="e.g. FLAT ₹50 OFF or 20% OFF"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 font-semibold text-rose-600"
                  />
                </div>
              </div>

              {/* Min Order & Category Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerMinOrder}
                    onChange={(e) => setOfferMinOrder(e.target.value)}
                    placeholder="0 for any amount"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Applicable Category
                  </label>
                  <select
                    value={offerCategoryId}
                    onChange={(e) => setOfferCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 font-medium bg-white"
                  >
                    <option value="all">All Categories (Storewide)</option>
                    {(categories || []).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Offer Banner Image - URL or Device Upload */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block font-bold text-gray-700">
                  Offer Banner Image <span className="text-rose-500">*</span>
                </label>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={offerImage}
                    onChange={(e) => setOfferImage(e.target.value)}
                    placeholder="https://... or choose from suggestions below"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-rose-500 font-mono text-[11px]"
                  />
                  <label className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingOfferImage ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleOfferImageUpload}
                      disabled={isUploadingOfferImage}
                    />
                  </label>
                </div>

                {/* Preset Image Suggestion Chips */}
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold mb-1">Quick Stock Images:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '🛒 Groceries', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80' },
                      { label: '🥦 Fresh Veggies', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80' },
                      { label: '🍎 Fresh Fruits', url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80' },
                      { label: '🍔 Fast Food', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80' },
                      { label: '🥛 Dairy / Breakfast', url: 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80' }
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setOfferImage(preset.url)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${
                          offerImage === preset.url
                            ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner Image Live Preview */}
                <div className="mt-2 relative rounded-2xl overflow-hidden h-36 border border-gray-200 bg-gray-100 shadow-inner group">
                  <img
                    src={offerImage || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80'}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5">
                    {offerDiscountTag && (
                      <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                        {offerDiscountTag}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                    <p className="font-extrabold text-sm drop-shadow line-clamp-1">{offerTitle || 'Offer Title Preview'}</p>
                    <p className="text-[11px] text-white/90 drop-shadow line-clamp-1">{offerSubtitle || 'Subtitle / discount description preview'}</p>
                  </div>
                </div>
              </div>

              {/* Live Status Toggle */}
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-200/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block">Make Offer Live Now 🔥</span>
                  <span className="text-[11px] text-gray-500">
                    If enabled, customers can instantly see and apply this deal in real-time.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={offerIsActive}
                  onChange={(e) => setOfferIsActive(e.target.checked)}
                  className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOfferModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Flame className="w-4 h-4" />
                  <span>{editingOffer ? 'Update Offer' : 'Publish Offer 🔥'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* ================= CREATE / EDIT STAFF OPERATOR MODAL (SUPER ADMIN ONLY) ================= */}
      {isSuperAdmin && isStaffUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base leading-tight">
                    {editingStaffUser ? 'Edit Staff User Account' : 'Create Staff Login Account'}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Staff can only check orders, process dispatches & print slips
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaffUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Staff Member Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={staffUserName}
                  onChange={(e) => setStaffUserName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Staff User ID (Username for Login) <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={staffUserUserId}
                  onChange={(e) => setStaffUserUserId(e.target.value.toLowerCase())}
                  placeholder="e.g. staff01 or rahul_pack"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-indigo-500 font-mono font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">Staff will type this User ID to sign in.</p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Security Password <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  value={staffUserPassword}
                  onChange={(e) => setStaffUserPassword(e.target.value)}
                  placeholder="e.g. staff123"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Staff Phone Number
                </label>
                <input
                  type="tel"
                  value={staffUserPhone}
                  onChange={(e) => setStaffUserPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Account Access Status
                </label>
                <select
                  value={staffUserStatus}
                  onChange={(e) => setStaffUserStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-indigo-500 font-medium bg-white"
                >
                  <option value="active">Active (Can log in & process orders)</option>
                  <option value="disabled">Disabled (Cannot log in)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffUserModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{editingStaffUser ? 'Update Staff Account' : 'Save Staff Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-bold text-base text-gray-900">Add Delivery Partner</h3>
            <form onSubmit={handleAddStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Rider Full Name</label>
                <input
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Sunil Yadav"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Mobile Phone Number</label>
                <input
                  required
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  placeholder="+91 98111 22334"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Vehicle Description</label>
                <input
                  required
                  value={newStaffVehicle}
                  onChange={(e) => setNewStaffVehicle(e.target.value)}
                  placeholder="e.g. Hero Splendor"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Rider Login ID</label>
                  <input
                    value={newStaffUsername}
                    onChange={(e) => setNewStaffUsername(e.target.value)}
                    placeholder="e.g. rider01"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Password</label>
                  <input
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Shift (Admin Only)</label>
                <select
                  value={newStaffShift}
                  onChange={(e) => setNewStaffShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold focus:outline-none bg-white"
                >
                  <option value="Morning Shift (07:00 AM - 12:00 PM)">Morning Shift (07:00 AM - 12:00 PM)</option>
                  <option value="Afternoon Shift (12:00 PM - 05:00 PM)">Afternoon Shift (12:00 PM - 05:00 PM)</option>
                  <option value="Evening Peak Shift (05:00 PM - 10:30 PM)">Evening Peak Shift (05:00 PM - 10:30 PM)</option>
                  <option value="Night Express Shift (10:30 PM - 02:00 AM)">Night Express Shift (10:30 PM - 02:00 AM)</option>
                </select>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 text-white font-bold rounded-xl shadow-md"
                >
                  Add Rider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE / EDIT ORDER MILESTONE FREE GIFT TIER MODAL ================= */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden border border-emerald-100 flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base leading-tight">
                    {editingMilestone
                      ? `Customize ₹${milestoneMinAmount}+ Milestone Free Gift Options`
                      : 'Create New Order Milestone Free Gift Tier'}
                  </h3>
                  <p className="text-[11px] text-emerald-50">
                    Set the order amount (e.g. ₹149, ₹249, ₹349) and configure 1, 2, 3 or more free gift products customers can receive at checkout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveMilestone} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Top Section: Amount Threshold & Title */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-extrabold text-emerald-950 mb-1">
                      Minimum Order Amount (₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={milestoneMinAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMilestoneMinAmount(val);
                        setMilestoneTitle(`₹${val}+ Order Free Gift`);
                        setMilestoneSubtitle(`Choose any 1 free gift item on orders of ₹${val} or more!`);
                      }}
                      placeholder="e.g. 149, 249, 349"
                      className="w-full px-3 py-2 rounded-xl border-2 border-emerald-300 bg-white focus:outline-none focus:border-emerald-600 font-black text-sm text-emerald-900"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[149, 249, 349, 499, 699].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setMilestoneMinAmount(amt);
                            setMilestoneTitle(`₹${amt}+ Order Free Gift`);
                            setMilestoneSubtitle(`Choose any 1 free gift item on orders of ₹${amt} or more!`);
                          }}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border cursor-pointer ${
                            Number(milestoneMinAmount) === amt
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-2.5">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Milestone Offer Title <span className="text-rose-500">*</span>
                      </label>
                      <input
                        required
                        type="text"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        placeholder="e.g. ₹149+ Order Free Gift"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-emerald-600 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Customer Banner Subtitle
                      </label>
                      <input
                        type="text"
                        value={milestoneSubtitle}
                        onChange={(e) => setMilestoneSubtitle(e.target.value)}
                        placeholder="e.g. Choose any 1 free gift item on orders of ₹149 or more!"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/70 flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-emerald-950 block">Make ₹{milestoneMinAmount}+ Gift Tier Live Now 🎁</span>
                    <span className="text-[11px] text-emerald-700">
                      When enabled, customers ordering ₹{milestoneMinAmount}+ can receive the free gift(s) below at Checkout.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={milestoneIsActive}
                    onChange={(e) => setMilestoneIsActive(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* 1, 2, 3 or More Free Gift Options Configuration */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-xs sm:text-sm text-gray-900 uppercase tracking-wide">
                        Configure Free Gift Products for ₹{milestoneMinAmount}+ Orders
                      </h4>
                      <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 font-black text-[11px] rounded-full border border-emerald-300">
                        🎁 Total Free Products: {milestoneItems.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      List 1, 2, 3 or more free gifts manually. If 1 product is listed, it is automatically awarded. If multiple products are listed, customer picks 1 at checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestoneItem}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Free Gift Product ({milestoneItems.length} Listed)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {milestoneItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-4 rounded-2xl border-2 border-gray-200 bg-gray-50/70 hover:border-emerald-300 transition-all space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black text-xs">
                            Choice #{idx + 1}
                          </span>
                          <span className="font-extrabold text-xs text-gray-900">
                            {item.name || `Gift Item Option ${idx + 1}`}
                          </span>
                        </div>

                        {/* Quick Auto-Fill from Store Catalog & Delete Button */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-gray-500 hidden sm:inline">Auto-Fill:</span>
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                handlePickProductForMilestoneItem(idx, e.target.value);
                                e.target.value = '';
                              }}
                              className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-[11px] font-bold text-emerald-900 focus:outline-none max-w-[210px]"
                            >
                              <option value="">-- Pick from Store Catalog --</option>
                              {(products || []).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.unit || '1 Pack'} - ₹{p.price})
                                </option>
                              ))}
                            </select>
                          </div>

                          {milestoneItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMilestoneItem(idx)}
                              className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-extrabold text-[11px] flex items-center gap-1 border border-rose-200 cursor-pointer"
                              title="Remove this gift choice"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                        {/* Image Preview */}
                        <div className="sm:col-span-2 flex flex-col items-center gap-1.5">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-gray-300 shadow-xs">
                            <img
                              src={item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
                              }}
                            />
                          </div>
                          <label className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-[10px] font-bold text-gray-700 cursor-pointer flex items-center gap-1">
                            <Upload className="w-3 h-3" />
                            <span>Upload Photo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleMilestoneItemImageUpload(idx, e)}
                            />
                          </label>
                        </div>

                        {/* Item Fields */}
                        <div className="sm:col-span-10 space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                            <div className="sm:col-span-2">
                              <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
                                Gift Item Name <span className="text-rose-500">*</span>
                              </label>
                              <input
                                required
                                type="text"
                                value={item.name}
                                onChange={(e) => handleMilestoneItemFieldChange(idx, 'name', e.target.value)}
                                placeholder="e.g. Fresh Onion / Maggi Pack / Hot Samosa"
                                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white font-bold focus:outline-none focus:border-emerald-600"
                              />
                            </div>

                            <div>
                              <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
                                Gift Type / Category
                              </label>
                              <select
                                value={item.category || 'Grocery'}
                                onChange={(e) => handleMilestoneItemFieldChange(idx, 'category', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-xl border border-gray-300 bg-white font-bold focus:outline-none focus:border-emerald-600"
                              >
                                <option value="Vegetable">🥦 Vegetable</option>
                                <option value="Grocery">🛒 Grocery</option>
                                <option value="Fast Food">🍔 Fast Food</option>
                                <option value="Fruits">🍎 Fresh Fruits</option>
                                <option value="Dairy & Bakery">🥛 Dairy & Bakery</option>
                                <option value="Snacks & Drinks">🍿 Snacks & Drinks</option>
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                              <div>
                                <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
                                  Qty / Unit
                                </label>
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => handleMilestoneItemFieldChange(idx, 'unit', e.target.value)}
                                  placeholder="500g / 1 Pc"
                                  className="w-full px-2 py-1.5 rounded-xl border border-gray-300 bg-white font-semibold focus:outline-none focus:border-emerald-600"
                                />
                              </div>
                              <div>
                                <label className="block font-bold text-gray-700 text-[11px] mb-0.5">
                                  Worth (₹)
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.worth}
                                  onChange={(e) => handleMilestoneItemFieldChange(idx, 'worth', e.target.value)}
                                  placeholder="25"
                                  className="w-full px-2 py-1.5 rounded-xl border border-gray-300 bg-white font-bold text-emerald-800 focus:outline-none focus:border-emerald-600"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Image URL & Quick Stock Presets */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input
                              type="text"
                              value={item.image}
                              onChange={(e) => handleMilestoneItemFieldChange(idx, 'image', e.target.value)}
                              placeholder="Image URL (https://...)"
                              className="flex-1 px-2.5 py-1 rounded-lg border border-gray-300 bg-white font-mono text-[10px] focus:outline-none focus:border-emerald-600"
                            />
                            <div className="flex flex-wrap gap-1">
                              {[
                                { label: '🥦 Veggie', url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80' },
                                { label: '🛒 Grocery', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80' },
                                { label: '🍜 Noodles', url: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=600&q=80' },
                                { label: '🥟 Samosa/Snack', url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
                                { label: '🍔 Fast Food', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=600&q=80' }
                              ].map((preset, pIdx) => (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => handleMilestoneItemFieldChange(idx, 'image', preset.url)}
                                  className="px-2 py-0.5 rounded bg-white hover:bg-emerald-50 border border-gray-200 text-[9px] font-bold text-gray-700 cursor-pointer"
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddMilestoneItem}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-100/70 text-emerald-900 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-emerald-700" />
                    <span>+ Add Another Free Gift Product ({milestoneItems.length} Products Currently Listed)</span>
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>{editingMilestone ? `Save ₹${milestoneMinAmount}+ Milestone Gifts` : 'Publish Milestone Gift Tier 🎁'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VENDOR MANAGEMENT MODAL (Add / Edit Vendor)
          ========================================================================= */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-auto overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingVendor ? 'Edit Vendor / Supplier Profile' : 'Add New Vendor / Supplier'}
                  </h3>
                  <p className="text-[11px] text-emerald-100">
                    Manage supplier details, contact information and purchase ledger setup
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveVendor} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Contact / Representative Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingVendor?.name || ''}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Business / Firm Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="company_name"
                    required
                    defaultValue={editingVendor?.company_name || ''}
                    placeholder="e.g. Balaji Trading Co."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={editingVendor?.phone || ''}
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingVendor?.email || ''}
                    placeholder="vendor@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Supplier Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="category"
                    defaultValue={editingVendor?.category || 'General FMCG'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="General FMCG">General FMCG</option>
                    <option value="Fresh Fruits & Vegetables">Fresh Fruits & Vegetables (Mandi)</option>
                    <option value="Dairy Products">Dairy Products (Milk / Paneer / Ghee)</option>
                    <option value="Bakery & Snacks">Bakery & Snacks</option>
                    <option value="Beverages & Cold Drinks">Beverages & Cold Drinks</option>
                    <option value="Spices & Pulses">Spices & Pulses</option>
                    <option value="Packaging & Logistics">Packaging & Logistics</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={editingVendor?.status || 'active'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="active">Active (Receives automated orders)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    name="gst"
                    defaultValue={editingVendor?.gst || ''}
                    placeholder="e.g. 08AAAAA0000A1Z5"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    PAN Number
                  </label>
                  <input
                    type="text"
                    name="pan"
                    defaultValue={editingVendor?.pan || ''}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="opening_balance"
                    defaultValue={editingVendor?.opening_balance ?? 0}
                    placeholder="0.00 (Positive = Payable to Vendor)"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Amount payable to vendor from prior periods</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Notes / Delivery Days
                  </label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={editingVendor?.notes || ''}
                    placeholder="e.g. Morning 6 AM delivery, weekly settlement"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Mandi / Shop Address
                </label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingVendor?.address || ''}
                  placeholder="e.g. Stall #14, APMC Fruit Mandi, Jaipur Road..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingVendor ? 'Save Changes' : 'Add Vendor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          RECORD VENDOR PAYMENT MODAL
          ========================================================================= */}
      {isVendorPaymentModalOpen && selectedVendorForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-700 to-teal-800 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Wallet className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-extrabold text-base">Record Payment to Vendor</h3>
                  <p className="text-[11px] text-emerald-200 font-medium">
                    {selectedVendorForAction.name} • {selectedVendorForAction.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorPaymentModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Notice */}
            <div className="bg-amber-50 px-5 py-3 border-b border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Current Outstanding Payable:</span>
              <span className="font-mono font-black text-sm text-amber-900">
                ₹{(vendorLedgerStats[selectedVendorForAction.id]?.balancePayable || 0).toLocaleString('en-IN')}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVendorPayment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Payment Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">
                    Payment Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const bal = vendorLedgerStats[selectedVendorForAction.id]?.balancePayable || 0;
                      if (bal > 0) setPaymentAmount(String(bal));
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Quick Fill Outstanding
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 text-sm font-bold font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentMode}
                    onChange={e => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash (Store Counter)</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ref No / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={paymentRefNo}
                    onChange={e => setPaymentRefNo(e.target.value)}
                    placeholder="e.g. UTR1238472"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notes / Particulars
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Settlement for invoice #904"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This payment will automatically debit vendor's balance and sync with store operating expenses under <strong>Goods Purchase</strong>.
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVendorPaymentModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-700 to-teal-800 hover:from-emerald-800 hover:to-teal-900 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Record Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          DIRECT PURCHASE BILL MODAL
          ========================================================================= */}
      {isVendorBillModalOpen && selectedVendorForAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-blue-200" />
                <div>
                  <h3 className="font-extrabold text-base">Direct Purchase Bill / Inward</h3>
                  <p className="text-[11px] text-blue-100 font-medium">
                    {selectedVendorForAction.name} • {selectedVendorForAction.company_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVendorBillModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVendorBill} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Bill Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={e => setBillDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Bill / Invoice No. <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={billInvoiceNo}
                    onChange={e => setBillInvoiceNo(e.target.value)}
                    placeholder="e.g. INV-2026-401"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono uppercase focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Total Bill Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={billAmount}
                    onChange={e => setBillAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 text-sm font-bold font-mono focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Items Description / Particulars
                </label>
                <textarea
                  rows={2}
                  value={billNotes}
                  onChange={e => setBillNotes(e.target.value)}
                  placeholder="e.g. 50 kg Potatoes, 30 kg Tomatoes, 20 kg Onion mandi bulk inward"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-[11px] text-blue-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  This bill will credit the vendor's ledger balance (increasing payable to vendor).
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVendorBillModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Credit to Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VENDOR STATEMENT MODAL (Printable & Exportable Account Statement)
          ========================================================================= */}
      {isVendorStatementModalOpen && selectedVendorForStatement && (() => {
        const vendor = selectedVendorForStatement;
        const vEntries = (vendorLedger || [])
          .filter(l => l.vendor_id === vendor.id && l.status !== 'cancelled')
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        let currentRunning = Number(vendor.opening_balance) || 0;
        let totalPurchasesAmt = 0;
        let totalPaymentsAmt = 0;

        const ledgerRowsWithRunning = vEntries.map(e => {
          const isPurchase = e.type === 'purchase' || e.type === 'bill';
          const amt = Number(e.amount) || 0;
          if (isPurchase) {
            totalPurchasesAmt += amt;
            currentRunning += amt;
          } else {
            totalPaymentsAmt += amt;
            currentRunning -= amt;
          }
          return {
            ...e,
            isPurchase,
            runningBalance: currentRunning
          };
        });

        const handleDownloadStatementCsv = () => {
          let running = Number(vendor.opening_balance) || 0;
          const rows = [
            ['Date', 'Type', 'Reference No', 'Particulars', 'Purchase Credit (Rs)', 'Payment Debit (Rs)', 'Balance Payable (Rs)'],
            ['Opening', 'Opening Balance', '-', 'Opening Balance as per records', running > 0 ? running : 0, running < 0 ? Math.abs(running) : 0, running]
          ];
          vEntries.forEach(e => {
            const isPur = e.type === 'purchase' || e.type === 'bill';
            const amt = Number(e.amount) || 0;
            if (isPur) running += amt;
            else running -= amt;
            rows.push([
              e.date ? new Date(e.date).toLocaleDateString('en-IN') : '',
              e.type === 'purchase' ? 'Order Goods (Auto)' : (e.type === 'bill' ? 'Direct Purchase Bill' : 'Payment to Vendor'),
              e.order_id || e.reference_no || '-',
              e.particulars || '',
              isPur ? amt : 0,
              !isPur ? amt : 0,
              running
            ]);
          });
          const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.setAttribute('href', url);
          link.setAttribute('download', `Statement_${vendor.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-auto overflow-hidden border border-gray-200">
              {/* Header */}
              <div className="bg-gray-900 px-5 py-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-extrabold text-base sm:text-lg">Vendor Account Statement</h3>
                    <p className="text-[11px] text-gray-300">
                      Detailed chronological ledger & settlement summary
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadStatementCsv}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVendorStatementModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Statement Sheet Content */}
              <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Vendor Info Card */}
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-black text-gray-900">{vendor.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                        {vendor.category}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-gray-600 mt-0.5">{vendor.company_name}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mt-1.5">
                      <span>📞 {vendor.phone}</span>
                      {vendor.gst && <span>GSTIN: <span className="font-mono font-bold text-gray-700">{vendor.gst}</span></span>}
                      {vendor.address && <span>📍 {vendor.address}</span>}
                    </div>
                  </div>

                  {/* Summary Metric Chips */}
                  <div className="flex gap-2 self-stretch sm:self-auto">
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-right min-w-[100px] flex-1 sm:flex-initial">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Total Purchases</p>
                      <p className="text-sm font-black text-gray-800 font-mono">₹{totalPurchasesAmt.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-white p-2.5 rounded-xl border border-gray-200 text-right min-w-[100px] flex-1 sm:flex-initial">
                      <p className="text-[9px] uppercase font-bold text-gray-400">Total Paid</p>
                      <p className="text-sm font-black text-emerald-700 font-mono">₹{totalPaymentsAmt.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="bg-emerald-600 p-2.5 rounded-xl text-right min-w-[110px] text-white flex-1 sm:flex-initial shadow-xs">
                      <p className="text-[9px] uppercase font-bold text-emerald-100">Net Balance</p>
                      <p className="text-sm font-black font-mono">₹{currentRunning.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200 text-[11px]">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Ref / Invoice</th>
                        <th className="py-2.5 px-3">Particulars</th>
                        <th className="py-2.5 px-3 text-right">Inward / Bill (Cr)</th>
                        <th className="py-2.5 px-3 text-right">Payment (Dr)</th>
                        <th className="py-2.5 px-3 text-right">Balance Payable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Opening Balance Row */}
                      <tr className="bg-amber-50/40 font-semibold text-gray-700">
                        <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">-</td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Opening
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-gray-400">-</td>
                        <td className="py-2 px-3 text-gray-700">Opening Balance Brought Forward</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-700">
                          {Number(vendor.opening_balance) > 0 ? `₹${Number(vendor.opening_balance).toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-gray-400">-</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                          ₹{Number(vendor.opening_balance || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {ledgerRowsWithRunning.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-400">
                            No transactions recorded yet for this vendor.
                          </td>
                        </tr>
                      ) : (
                        ledgerRowsWithRunning.map((row, idx) => (
                          <tr key={row.id || idx} className="hover:bg-gray-50/70 transition-colors">
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                              {row.date ? new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                            </td>
                            <td className="py-2 px-3">
                              {row.type === 'purchase' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Order Auto
                                </span>
                              )}
                              {row.type === 'bill' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                  Direct Bill
                                </span>
                              )}
                              {row.type === 'payment' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Payment
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                              {row.order_id || row.reference_no || '-'}
                            </td>
                            <td className="py-2 px-3 text-gray-700 max-w-xs truncate">
                              {row.particulars || 'Vendor Transaction'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-blue-700">
                              {row.isPurchase ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                              {!row.isPurchase ? `₹${Number(row.amount).toLocaleString('en-IN')}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black text-gray-900">
                              ₹{row.runningBalance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Total {ledgerRowsWithRunning.length + 1} ledger line items recorded
                </span>
                <button
                  type="button"
                  onClick={() => setIsVendorStatementModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close Statement
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          CUSTOMER CASH WALLET TOP-UP & ADJUSTMENT MODAL
          ========================================================================= */}
      {isWalletModalOpen && walletTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shadow-inner shrink-0">
                  👛
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                    <span>Customer Cash Wallet</span>
                    <span className="bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      Admin Action
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    {walletTargetCustomer.name} • <span className="font-mono font-bold">{walletTargetCustomer.phone}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWalletModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Balance Card */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Current Wallet Balance
                </span>
                <span className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5 block">
                  ₹{Number(wallets?.[walletTargetCustomer.cleanPhone]?.balance ?? walletTargetCustomer.balance ?? 0).toLocaleString('en-IN')}
                </span>
              </div>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black px-3 py-1 rounded-xl">
                Active Wallet
              </span>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveWalletAdjustment} className="p-5 sm:p-6 space-y-4">
              {/* Type: Credit vs Debit */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Transaction Action:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWalletAdjustType('credit')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      walletAdjustType === 'credit'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>+ Add Money (Credit)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletAdjustType('debit')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      walletAdjustType === 'debit'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>- Deduct Money (Debit)</span>
                  </button>
                </div>
              </div>

              {/* Quick Amount Presets */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-600">
                  Quick Amount Presets:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[20, 50, 100, 200, 500].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWalletAdjustAmount(String(amt))}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        walletAdjustAmount === String(amt)
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Amount to {walletAdjustType === 'credit' ? 'Add' : 'Deduct'} (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={walletAdjustAmount}
                    onChange={(e) => setWalletAdjustAmount(e.target.value)}
                    placeholder="Enter amount (e.g. 100)"
                    className="w-full pl-8 pr-3 py-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Reason / Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-slate-800">
                  Reason / Purpose:
                </label>
                <div className="flex items-center gap-1 flex-wrap mb-1.5">
                  {[
                    'Promotional Cashback',
                    'Loyalty Bonus',
                    'Compensation for Delay',
                    'Customer Deposit'
                  ].map(sug => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setWalletAdjustReason(sug)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-medium cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={walletAdjustReason}
                  onChange={(e) => setWalletAdjustReason(e.target.value)}
                  placeholder="e.g. Welcome promotional cashback credit"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmittingWallet || !walletAdjustAmount}
                className={`w-full py-3 px-4 rounded-xl font-black text-xs text-white shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${
                  walletAdjustType === 'credit'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                }`}
              >
                {isSubmittingWallet ? (
                  <span>Processing Wallet Update...</span>
                ) : (
                  <span>
                    Confirm {walletAdjustType === 'credit' ? 'Add ₹' : 'Deduct ₹'}{walletAdjustAmount || 0}
                  </span>
                )}
              </button>

              {/* Transaction History for this Customer */}
              {(() => {
                const custHistory = wallets?.[walletTargetCustomer.cleanPhone]?.history || [];
                if (custHistory.length === 0) return null;
                return (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-black text-slate-700 block uppercase">
                      Recent Activity for {walletTargetCustomer.name}:
                    </span>
                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {custHistory.slice(0, 10).map((h, hIdx) => (
                        <div key={hIdx} className="p-2.5 bg-white flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800 block">{h.reason || (h.type === 'credit' ? 'Top-up' : 'Redeemed')}</span>
                            <span className="text-[10px] text-slate-400">
                              {h.created_at ? new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                              {h.order_id && ` • Order #${h.order_id}`}
                            </span>
                          </div>
                          <span className={`font-black ${h.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {h.type === 'credit' ? `+₹${h.amount}` : `-₹${h.amount}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          OPERATING EXPENSE MODAL (Add / Edit Store Expense)
          ========================================================================= */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-600 to-red-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingDown className="w-5 h-5 text-rose-200" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingExpense ? 'Edit Operational Expense' : 'Record New Store Expense'}
                  </h3>
                  <p className="text-[11px] text-rose-100">
                    Track overheads, fuel, rent, utilities and stock purchases for P&L
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveExpense} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Expense Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={e => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Expense Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-rose-600"
                  >
                    {EXPENSE_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Amount (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 text-sm font-bold font-mono focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Paid To / Vendor / Person <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={expPaidTo}
                    onChange={e => setExpPaidTo(e.target.value)}
                    placeholder="e.g. Rahul Delivery, Landlord, Petrol Pump"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={expPaymentMode}
                    onChange={e => setExpPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-rose-600"
                  >
                    <option value="Cash">Cash (Store Counter)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Card">Card</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bill / Receipt / Voucher No.
                </label>
                <input
                  type="text"
                  value={expRefNo}
                  onChange={e => setExpRefNo(e.target.value)}
                  placeholder="e.g. Receipt #481 or UPI UTR"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-mono focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Purpose / Notes
                </label>
                <textarea
                  rows={2}
                  value={expNotes}
                  onChange={e => setExpNotes(e.target.value)}
                  placeholder="Details of expense, items bought, reason..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-rose-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <TrendingDown className="w-4 h-4" />
                  <span>{editingExpense ? 'Save Changes' : 'Record Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          OTHER INCOME MODAL (Add / Edit Sundry Income)
          ========================================================================= */}
      {isOtherIncomeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 to-emerald-700 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-teal-200" />
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">
                    {editingOtherIncome ? 'Edit Store Income' : 'Record Other Store Income'}
                  </h3>
                  <p className="text-[11px] text-teal-100">
                    Record scrap sale, vendor rebates, partner inflow or extra fees
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOtherIncomeModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOtherIncome} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Income Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={incDate}
                    onChange={e => setIncDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Income Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={incCategory}
                    onChange={e => setIncCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-teal-600"
                  >
                    {OTHER_INCOME_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-gray-400">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={incAmount}
                    onChange={e => setIncAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-gray-300 text-sm font-bold font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Source / Received From <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={incSource}
                    onChange={e => setIncSource(e.target.value)}
                    placeholder="e.g. Local Raddi Wala, Supplier Discount"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={incPaymentMode}
                    onChange={e => setIncPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Cash">Cash (Physical Currency)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Notes / Particulars
                </label>
                <textarea
                  rows={2}
                  value={incNotes}
                  onChange={e => setIncNotes(e.target.value)}
                  placeholder="Details of income, receipt details..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOtherIncomeModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>{editingOtherIncome ? 'Save Changes' : 'Record Income'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          EDIT ORDER VENDOR MODAL
          ========================================================================= */}
      {isEditOrderVendorModalOpen && editingOrderForVendor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-extrabold text-base">
                    Edit Vendor for Order #{editingOrderForVendor.id ? String(editingOrderForVendor.id).slice(-4) : ''}
                  </h3>
                  <p className="text-[11px] text-purple-100 font-medium">
                    {editingOrderForVendor.customer_name || 'Customer'} • Total: ₹{editingOrderForVendor.total || 0}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOrderVendorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOrderVendor} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Registered Vendor (Dropdown)
                </label>
                <select
                  value={orderVendorId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setOrderVendorId(vId);
                    if (vId === '') {
                      setOrderVendorName('');
                    } else if (vId !== 'custom') {
                      const matched = (vendors || []).find(v => v.id === vId);
                      if (matched) setOrderVendorName(matched.name);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-semibold focus:outline-none focus:border-purple-600"
                >
                  <option value="">-- No Vendor / Store Fulfilled --</option>
                  {(vendors || []).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.company_name || v.category})
                    </option>
                  ))}
                  <option value="custom">✏️ Other / Custom Vendor (Type Manually)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vendor Name (Manual Input) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={orderVendorName}
                  onChange={(e) => setOrderVendorName(e.target.value)}
                  placeholder="e.g. Shri ram agrawal, Bikaner Sweets, Mandi Wholesaler..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  You can type any vendor name manually or select from the dropdown above.
                </p>
              </div>

              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-purple-700" />
                    <span>Estimated Wholesale Cost (₹):</span>
                  </label>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={orderWholesaleCost}
                      onChange={(e) => setOrderWholesaleCost(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 rounded-lg border border-purple-300 text-xs font-mono font-bold bg-white text-right focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-1 border-t border-purple-200">
                  <input
                    type="checkbox"
                    checked={orderSyncToLedger}
                    onChange={(e) => setOrderSyncToLedger(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-purple-950 font-medium leading-tight">
                    <strong>Credit to Vendor Ledger:</strong> Post this purchase amount to the vendor's ledger account.
                  </span>
                </label>
              </div>

              {/* Order Items Preview */}
              <div>
                <span className="block text-xs font-bold text-gray-700 mb-1">
                  Order Items ({(editingOrderForVendor.items || []).length}):
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50/50">
                  {(editingOrderForVendor.items || []).map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-gray-100">
                      <div>
                        <strong className="text-brand-700">{it.qty}x</strong> {it.name}
                        <span className="text-gray-400 ml-1">({it.unit || '1 unit'})</span>
                      </div>
                      <div className="text-right font-mono font-bold text-gray-700">
                        ₹{(Number(it.price) || 0) * (Number(it.qty) || 1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vendor Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={orderVendorNotes}
                  onChange={(e) => setOrderVendorNotes(e.target.value)}
                  placeholder="e.g. Morning supply, verified bill #..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOrderVendorModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Vendor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          ITEM VENDOR MODAL (Assign or change vendor for each specific item in order)
          ========================================================================= */}
      {isItemVendorModalOpen && editingItemVendorOrder && editingItemVendorItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-800 px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-purple-200" />
                <div>
                  <h3 className="font-extrabold text-base">
                    Assign Vendor to Item 🏪
                  </h3>
                  <p className="text-[11px] text-purple-100 font-medium">
                    Order #{editingItemVendorOrder.id ? String(editingItemVendorOrder.id).slice(-4) : ''} • {editingItemVendorOrder.customer_name || 'Customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsItemVendorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Item info highlight banner */}
            <div className="bg-purple-50 px-5 py-3 border-b border-purple-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">Selected Product / Item:</span>
                <h4 className="font-black text-gray-900 text-sm">
                  <span className="text-brand-700 font-bold">{editingItemVendorItem.qty}x</span> {editingItemVendorItem.name}
                </h4>
                <span className="text-[11px] text-gray-500 font-medium">{editingItemVendorItem.unit || '1 unit'} • Selling Price: ₹{editingItemVendorItem.price || 0}/unit</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Item Total</span>
                <span className="text-base font-black text-gray-900 font-mono">
                  ₹{(Number(editingItemVendorItem.price) || 0) * (Number(editingItemVendorItem.qty) || 1)}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveItemVendor} className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Registered Vendor (Dropdown)
                </label>
                <select
                  value={itemVendorId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setItemVendorId(vId);
                    if (vId === '') {
                      setItemVendorName('');
                    } else if (vId !== 'custom') {
                      const matched = (vendors || []).find(v => v.id === vId);
                      if (matched) setItemVendorName(matched.name);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-semibold focus:outline-none focus:border-purple-600"
                >
                  <option value="">-- No Vendor / Store Fulfilled --</option>
                  {(vendors || []).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.company_name || v.category})
                    </option>
                  ))}
                  <option value="custom">✏️ Other / Custom Vendor (Type Manually)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vendor / Supplier Name (Manual Input) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={itemVendorName}
                  onChange={(e) => setItemVendorName(e.target.value)}
                  placeholder="e.g. Shri ram agrawal, Daily Dairy, Mandi Wholesaler..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 focus:outline-none focus:border-purple-600"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Type any supplier/vendor name manually or select from the dropdown above.
                </p>
              </div>

              <div className="bg-purple-50 p-3.5 rounded-xl border border-purple-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-purple-700" />
                    <span>Wholesale Purchase Cost for this Item (₹):</span>
                  </label>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1.5 text-xs text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemWholesaleCost}
                      onChange={(e) => setItemWholesaleCost(e.target.value)}
                      className="w-full pl-6 pr-2 py-1 rounded-lg border border-purple-300 text-xs font-mono font-bold bg-white text-right focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer pt-1 border-t border-purple-200">
                  <input
                    type="checkbox"
                    checked={itemVendorSyncToLedger}
                    onChange={(e) => setItemVendorSyncToLedger(e.target.checked)}
                    className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-[11px] text-purple-950 font-medium leading-tight">
                    <strong>Post to Vendor Ledger:</strong> Record ₹{itemWholesaleCost || 0} purchase payable in vendor's accounting ledger.
                  </span>
                </label>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemVendorApplyToAll}
                    onChange={(e) => setItemVendorApplyToAll(e.target.checked)}
                    className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-amber-950 font-medium leading-tight">
                    <strong>Apply this vendor to all items in Order #{editingItemVendorOrder.id ? String(editingItemVendorOrder.id).slice(-4) : ''}:</strong> Quick assign entire order to this supplier.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Supplier Note / Bill Remark (Optional)
                </label>
                <input
                  type="text"
                  value={itemVendorNotes}
                  onChange={(e) => setItemVendorNotes(e.target.value)}
                  placeholder="e.g. Fresh mandi batch, bill #..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:outline-none focus:border-purple-600"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsItemVendorModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Item Vendor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          FULL EDIT ORDER MODAL (Edit customer, address, items, quantities, vendors, status)
          ========================================================================= */}
      {isFullEditOrderModalOpen && editingFullOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-auto overflow-hidden border border-gray-200 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-brand-700 via-brand-800 to-indigo-900 px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Edit className="w-5 h-5 text-brand-200" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <span>Edit Order Details</span>
                    <span className="font-mono bg-white/20 text-white px-2 py-0.5 rounded text-xs font-bold">
                      #{editingFullOrder.id ? String(editingFullOrder.id).slice(-4) : ''}
                    </span>
                  </h3>
                  <p className="text-[11px] text-brand-100">
                    Placed on {editingFullOrder.created_at ? new Date(editingFullOrder.created_at).toLocaleString('en-IN') : 'Recent'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullEditOrderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveFullOrder} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {/* Customer & Address Section */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-600" />
                  <span>Customer & Delivery Address</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Customer Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editingFullOrder.customer_name}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, customer_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Customer Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={editingFullOrder.customer_phone}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, customer_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:border-brand-600 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Delivery Address (House / Street / Colony)
                    </label>
                    <input
                      type="text"
                      value={editingFullOrder.delivery_address}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, delivery_address: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Landmark
                    </label>
                    <input
                      type="text"
                      value={editingFullOrder.landmark}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, landmark: e.target.value })}
                      placeholder="e.g. Near Shiv Mandir"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Delivery Slot
                    </label>
                    <input
                      type="text"
                      value={editingFullOrder.delivery_slot}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, delivery_slot: e.target.value })}
                      placeholder="e.g. ASAP (25-35 mins)"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Primary Order Vendor
                    </label>
                    <select
                      value={editingFullOrder.vendor_id || ''}
                      onChange={(e) => {
                        const vId = e.target.value;
                        const matched = (vendors || []).find(v => v.id === vId);
                        setEditingFullOrder({
                          ...editingFullOrder,
                          vendor_id: vId,
                          vendor_name: matched ? matched.name : (vId === '' ? '' : editingFullOrder.vendor_name)
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-semibold focus:outline-none focus:border-purple-600"
                    >
                      <option value="">-- No Vendor / Store Fulfilled --</option>
                      {(vendors || []).map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.company_name || v.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Order Status & Payment Section */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Order Status & Payment</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Order Status
                    </label>
                    <select
                      value={editingFullOrder.order_status}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, order_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:outline-none focus:border-brand-600"
                    >
                      <option value="Pending">⏳ Pending</option>
                      <option value="Confirmed">✅ Confirmed</option>
                      <option value="Preparing">🍳 Preparing</option>
                      <option value="Out for Delivery">🚴 Out for Delivery</option>
                      <option value="Delivered">🎉 Delivered</option>
                      <option value="Cancelled">❌ Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editingFullOrder.payment_method}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, payment_method: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:outline-none focus:border-brand-600"
                    >
                      <option value="Cash on Delivery (COD)">Cash on Delivery (COD)</option>
                      <option value="UPI">UPI / QR Code</option>
                      <option value="Online">Online Payment</option>
                      <option value="Wallet">Store Credit / Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Payment Status
                    </label>
                    <select
                      value={editingFullOrder.payment_status}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, payment_status: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-bold bg-white focus:outline-none focus:border-brand-600"
                    >
                      <option value="Paid">✅ Paid</option>
                      <option value="Pending">⏳ Pending / Due</option>
                      <option value="Failed">❌ Failed</option>
                      <option value="Refunded">🔄 Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Admin Remark / Customer Instructions
                    </label>
                    <input
                      type="text"
                      value={editingFullOrder.admin_remark}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, admin_remark: e.target.value })}
                      placeholder="e.g. Call before delivery, extra spicy, etc."
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      Delivery Fee (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editingFullOrder.delivery_fee ?? 0}
                      onChange={(e) => setEditingFullOrder({ ...editingFullOrder, delivery_fee: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white font-mono font-bold focus:outline-none focus:border-brand-600"
                    />
                  </div>
                </div>
              </div>

              {/* Order Items Table & Management */}
              <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Order Items ({editOrderItems.length})</span>
                  </h4>
                  <span className="text-xs font-bold text-gray-500">
                    Items Subtotal: <strong className="text-gray-900 font-mono">₹{editOrderItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0)}</strong>
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {editOrderItems.map((it, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[170px]">
                        <div className="font-bold text-xs text-gray-900">{it.name}</div>
                        <div className="text-[10px] text-gray-400">Unit: {it.unit || '1 unit'}</div>
                      </div>

                      {/* Qty controls */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-gray-500">Qty:</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateEditOrderItemQty(idx, (Number(it.qty) || 1) - 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.qty}
                          onChange={(e) => handleUpdateEditOrderItemQty(idx, Number(e.target.value) || 1)}
                          className="w-12 text-center py-0.5 rounded-lg border border-gray-300 text-xs font-bold bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateEditOrderItemQty(idx, (Number(it.qty) || 1) + 1)}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-black text-xs flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      {/* Unit Price */}
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-gray-500">Rate: ₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.price}
                          onChange={(e) => handleUpdateEditOrderItemPrice(idx, e.target.value)}
                          className="w-16 text-right py-0.5 px-1 rounded-lg border border-gray-300 text-xs font-mono font-bold bg-white"
                        />
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right font-mono font-bold text-xs text-gray-900 min-w-[55px]">
                        ₹{(Number(it.price) || 0) * (Number(it.qty) || 1)}
                      </div>

                      {/* Item Vendor Selector */}
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-purple-600" />
                        <select
                          value={it.vendor_id || it.vendor_name || ''}
                          onChange={(e) => handleUpdateEditOrderItemVendor(idx, e.target.value)}
                          className="px-2 py-1 rounded-lg border border-purple-200 text-[11px] bg-purple-50/50 font-semibold text-purple-900 focus:outline-none focus:border-purple-600 max-w-[130px]"
                        >
                          <option value="">-- No Vendor --</option>
                          {(vendors || []).map(v => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Delete Item */}
                      <button
                        type="button"
                        onClick={() => handleRemoveEditOrderItem(idx)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Item to Order Section */}
                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <span className="text-[11px] font-bold text-gray-700 block">
                    + Add Item to Order from Store Catalog:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search product name in catalog to add..."
                      value={editOrderCatalogSearch}
                      onChange={(e) => setEditOrderCatalogSearch(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 text-xs bg-white focus:outline-none focus:border-brand-600"
                    />
                  </div>

                  {/* Catalog matches preview */}
                  {editOrderCatalogSearch.trim() && (
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl bg-white p-1 space-y-1 shadow-sm">
                      {(products || [])
                        .filter(p => p.name?.toLowerCase().includes(editOrderCatalogSearch.toLowerCase()))
                        .slice(0, 8)
                        .map(p => (
                          <div
                            key={p.id}
                            onClick={() => handleAddProductToEditOrder(p)}
                            className="flex items-center justify-between p-2 hover:bg-brand-50 rounded-lg cursor-pointer text-xs transition-colors"
                          >
                            <div className="font-semibold text-gray-800">
                              {p.name} <span className="text-gray-400 font-normal">({p.unit || '1 unit'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-brand-700">₹{p.price}</span>
                              <span className="bg-brand-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">+ Add to Order</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Summary & Total */}
              {(() => {
                const subtotal = editOrderItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
                const fee = Number(editingFullOrder.delivery_fee) || 0;
                const disc = Number(editingFullOrder.discount) || 0;
                const grand = Math.max(0, subtotal + fee - disc);
                return (
                  <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="text-xs space-y-0.5">
                      <div>Items Subtotal: <strong className="font-mono">₹{subtotal}</strong></div>
                      <div>Delivery Fee: <strong className="font-mono">₹{fee}</strong></div>
                      {disc > 0 && (
                        <div className="text-emerald-700">Discount: -<strong className="font-mono">₹{disc}</strong></div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Final Order Total</span>
                      <span className="text-2xl font-black text-emerald-950 font-mono">₹{grand}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFullEditOrderModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-700 hover:from-brand-700 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.02] transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Order Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD SHIFT MODAL (ADMIN ONLY) */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <span>Add Operational Shift</span>
              </h3>
              <button onClick={() => setIsShiftModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAddShift} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Shift Name</label>
                <input
                  required
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  placeholder="e.g. Festival Rush / Early Morning"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Shift Timings</label>
                <input
                  required
                  value={newShiftTime}
                  onChange={(e) => setNewShiftTime(e.target.value)}
                  placeholder="e.g. 06:00 AM - 11:30 AM"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Operational Zone</label>
                <input
                  required
                  value={newShiftZone}
                  onChange={(e) => setNewShiftZone(e.target.value)}
                  placeholder="e.g. Khair Central Market & Bypass"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Surge Multiplier / Bonus</label>
                <input
                  value={newShiftSurge}
                  onChange={(e) => setNewShiftSurge(e.target.value)}
                  placeholder="e.g. 1.3x 🔥 or ₹80 Bonus"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Shift Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EDIT RIDER CREDENTIALS & SHIFT MODAL */}
      {editingRiderCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-brand-600" />
                  <span>Edit Rider ID & Shift</span>
                </h3>
                <p className="text-xs text-gray-500">{editingRiderCredentials.name} ({editingRiderCredentials.phone})</p>
              </div>
              <button onClick={() => setEditingRiderCredentials(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSaveRiderCredentials} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Rider Login ID / Username</label>
                <input
                  required
                  value={editRiderId}
                  onChange={(e) => setEditRiderId(e.target.value)}
                  placeholder="e.g. krishna01"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Password</label>
                <input
                  required
                  value={editRiderPassword}
                  onChange={(e) => setEditRiderPassword(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Assigned Shift (Admin Only)</label>
                <select
                  value={editRiderShift}
                  onChange={(e) => setEditRiderShift(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 font-bold focus:outline-none bg-white focus:ring-2 focus:ring-brand-500"
                >
                  {storeShifts.map((s, idx) => (
                    <option key={s.id || idx} value={s.name}>
                      {s.name} ({s.time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRiderCredentials(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md"
                >
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= BLOCK CUSTOMER CONFIRMATION MODAL ================= */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 flex flex-col animate-scaleUp">
            <div className="p-5 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Ban className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Block Customer</h3>
                  <p className="text-[11px] text-red-100">Anti-Fake & Prank Order Protection</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmBlockCustomer} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
                <UserX className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-red-950 text-sm">
                    {blockTargetPhone ? `+91 ${blockTargetPhone}` : 'No phone specified'}
                  </div>
                  <div className="text-[11px] text-red-700 font-semibold mt-0.5">
                    Customer: {blockTargetName || 'Unknown Customer'}
                  </div>
                  <p className="text-[10px] text-red-600/90 mt-1 leading-relaxed">
                    Once blocked, any checkout attempt with this mobile number will be strictly rejected.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Reason for Blocking <span className="text-red-500">*</span>
                </label>
                <select
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-red-500 font-medium bg-white mb-2"
                >
                  <option value="Fake / prank orders">Fake / prank orders</option>
                  <option value="Refused delivery / repeatedly cancelled on doorstep">Refused delivery / cancelled on doorstep</option>
                  <option value="Abusive behavior towards delivery partner">Abusive behavior towards delivery partner</option>
                  <option value="Multiple unverified orders / spam">Multiple unverified orders / spam</option>
                  <option value="Other / Policy violation">Other / Policy violation</option>
                </select>

                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Enter or customize reason..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-red-500 font-medium"
                  required
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  disabled={isSubmittingBlock}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlock}
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isSubmittingBlock ? 'Blocking...' : 'Block Customer Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= BLOCKLIST MANAGEMENT MODAL ================= */}
      {isBlocklistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="p-5 bg-gradient-to-r from-gray-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Shield className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">Customer Blocklist Protection</h3>
                  <p className="text-[11px] text-gray-300">Prevent fake numbers from placing orders</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBlocklistModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition-all"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Quick Add Form */}
              <form onSubmit={handleAddManualBlock} className="p-4 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-3">
                <div className="font-extrabold text-red-950 text-sm flex items-center gap-2">
                  <Ban className="w-4 h-4 text-red-600" />
                  <span>Manually Block a Mobile Number</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Mobile (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={newBlockPhoneInput}
                      onChange={(e) => setNewBlockPhoneInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-red-500 font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Reason / Note</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBlockReasonInput}
                        onChange={(e) => setNewBlockReasonInput(e.target.value)}
                        placeholder="e.g. Fake order or prank call"
                        className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-red-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition-all whitespace-nowrap"
                      >
                        + Block
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Blocked List Table / Cards */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-gray-800 text-sm">
                    Active Blocked Customers ({Object.keys(blockedCustomers || {}).length})
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">Synced with cloud in real-time</span>
                </div>

                {Object.keys(blockedCustomers || {}).length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-gray-700">No Blocked Numbers</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">All customer mobile numbers can place orders freely.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(blockedCustomers || {}).map(([ph, details]) => {
                      const data = typeof details === 'object' && details !== null ? details : { reason: String(details) };
                      return (
                        <div
                          key={ph}
                          className="p-3.5 bg-white border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-red-200 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Ban className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-gray-900 font-mono text-xs">
                                  +91 {ph}
                                </span>
                                {data.name && data.name !== 'Blocked User' && (
                                  <span className="text-[11px] font-semibold text-gray-600">
                                    ({data.name})
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-red-600 font-medium mt-0.5">
                                Reason: {data.reason || 'Blocked by Admin'}
                              </p>
                              {data.timestamp && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Blocked on: {new Date(data.timestamp).toLocaleString()} {data.by ? `by ${data.by}` : ''}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnblockCustomer(ph)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold text-xs self-start sm:self-center transition-all"
                          >
                            Unblock
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsBlocklistModalOpen(false)}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Partner Admin KYC & GPS Location Inspector Modal */}
      {selectedRiderForAdmin && (
        <DeliveryPartnerAdminModal
          isOpen={!!selectedRiderForAdmin}
          onClose={() => setSelectedRiderForAdmin(null)}
          rider={selectedRiderForAdmin}
          orders={orders}
          onRiderUpdated={(updated) => {
            setStaff(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
            setSelectedRiderForAdmin(updated);
          }}
        />
      )}

      <div className="fixed bottom-5 right-5 z-40 md:hidden">
        <button
          type="button"
          onClick={() => setIsManualOrderModalOpen(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 font-black text-xs border-2 border-white cursor-pointer active:scale-95 shadow-emerald-950/40"
          title="Create WhatsApp / Phone Order"
        >
          <MessageSquare className="w-4 h-4 text-emerald-200 animate-pulse" />
          <span>+ Manual Order</span>
        </button>
      </div>
    </div>
  );
}