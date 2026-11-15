import React, { useState, useMemo, useEffect } from 'react';
import { useStore, syncToFirebase } from '../context/StoreContext.jsx';
import { fetchNodeFromSupabase, broadcastStoreEvent } from '../supabase.js';
import { playChime } from '../utils/sound.js';
import { calculateDeliveryTime } from '../utils/haversine.js';
import {
  X,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  DollarSign,
  CheckCircle2,
  User,
  Printer,
  Share2,
  Sparkles,
  AlertCircle,
  Gift,
  ChevronDown,
  ChevronUp,
  Store,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function CreateManualOrderModal({ isOpen, onClose, onOpenInvoice }) {
  const {
    products,
    setProducts,
    categories,
    orders,
    setOrders,
    settings,
    staff,
    milestoneGifts,
    addAuditLog,
    adminAuth,
    vendors
  } = useStore();

  const currentRole = adminAuth?.user?.role || adminAuth?.role || 'super_admin';
  const isStaff = currentRole === 'staff';
  const activeStaffName = adminAuth?.user?.name || adminAuth?.user?.username || adminAuth?.username || 'Staff User';
  const activeStaffUserId = adminAuth?.user?.username || adminAuth?.username || 'staff';

  // Order Details State
  const [orderSource, setOrderSource] = useState('whatsapp'); // 'whatsapp' | 'phone' | 'walkin'
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('Express (15-25 Mins)');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
  const [paymentStatus, setPaymentStatus] = useState('Pending (COD)');
  const [assignedRiderId, setAssignedRiderId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');

  // Selected Order Items
  // item format: { product_id, base_product_id, name, unit, price, purchase_price, qty, is_custom, image }
  const [orderItems, setOrderItems] = useState([]);

  // Catalog Browser & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Custom Unlisted Item Form State
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('1 Pack');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemPurchasePrice, setCustomItemPurchasePrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  // Track selected variant index per catalog product: { [productId]: number }
  const [selectedVariantIdx, setSelectedVariantIdx] = useState({});
  // Track staging quantity to add per catalog product: { [productId]: number }
  const [productStagingQtys, setProductStagingQtys] = useState({});

  // Helper to extract clean variants array for any product
  const getProductVariants = (prod) => {
    if (!prod) return [];
    if (Array.isArray(prod.variants) && prod.variants.length > 0) {
      return prod.variants.map((v, i) => ({
        id: v.id || `var-${i}`,
        unit: v.unit || prod.unit || '1 unit',
        price: Number(v.price) || Number(prod.price) || 0,
        purchase_price: Number(v.purchase_price) || Number(prod.purchase_price) || 0,
        stock: v.stock !== undefined ? Number(v.stock) : (prod.stock !== undefined ? Number(prod.stock) : 50)
      }));
    }
    return [
      {
        id: prod.id || 'var-0',
        unit: prod.unit || '1 unit',
        price: Number(prod.price) || 0,
        purchase_price: Number(prod.purchase_price) || 0,
        stock: prod.stock !== undefined ? Number(prod.stock) : 50
      }
    ];
  };

  // Pricing Overrides
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Selected Milestone Gift (if applicable)
  const [selectedGiftItem, setSelectedGiftItem] = useState(null);

  // Submission & Success Screen State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Filter Catalog Products
  const filteredProducts = useMemo(() => {
    let list = products || [];
    if (selectedCategory !== 'all') {
      list = list.filter(p => p.category_id === selectedCategory || p.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.unit || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Order Financial Calculations
  const subtotal = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  }, [orderItems]);

  const totalCost = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + (Number(it.purchase_price) || 0) * (Number(it.qty) || 1), 0);
  }, [orderItems]);

  const estimatedMargin = Math.max(0, subtotal - totalCost);

  const grandTotal = Math.max(0, subtotal + Number(deliveryFee || 0) - Number(discountAmount || 0));

  // Determine eligible milestone gift tiers
  const eligibleGiftTiers = useMemo(() => {
    if (!milestoneGifts || !Array.isArray(milestoneGifts)) return [];
    return milestoneGifts.filter(tier => tier && tier.active !== false && subtotal >= Number(tier.min_amount || 0));
  }, [milestoneGifts, subtotal]);

  // Dynamic Delivery Timing calculation based on items & distance
  const manualDeliveryTimeInfo = useMemo(() => {
    return calculateDeliveryTime({
      distanceKm: 1.5,
      items: orderItems,
      settings
    });
  }, [orderItems, settings]);

  // Keep delivery slot synced with recommended calculated timing by default
  useEffect(() => {
    if (manualDeliveryTimeInfo?.slotLabel && deliverySlot.startsWith('Express')) {
      setDeliverySlot(manualDeliveryTimeInfo.slotLabel);
    }
  }, [manualDeliveryTimeInfo?.slotLabel]);

  // Add Item to Order with variant support & stock-aware quantity
  const handleAddItem = (prod, customQty = null, variantIdxOverride = null) => {
    const variants = getProductVariants(prod);
    const varIdx = variantIdxOverride !== null
      ? variantIdxOverride
      : (selectedVariantIdx[prod.id] !== undefined ? selectedVariantIdx[prod.id] : 0);
    const activeVar = variants[varIdx] || variants[0];

    const maxStock = activeVar.stock !== undefined
      ? Number(activeVar.stock)
      : (prod.stock !== undefined ? Number(prod.stock) : undefined);

    if (maxStock !== undefined && maxStock <= 0) {
      alert(`"${prod.name}" (${activeVar.unit}) is out of stock (Stock: 0).`);
      return;
    }

    let qtyToAdd = customQty !== null
      ? Math.max(0.01, Number(customQty) || 1)
      : Math.max(0.01, Number(productStagingQtys[prod.id]) || 1);

    if (maxStock !== undefined && maxStock > 0 && qtyToAdd > maxStock) {
      qtyToAdd = maxStock;
    }

    const targetId = variants.length > 1 ? `${prod.id}__${activeVar.id || activeVar.unit}` : prod.id;

    setOrderItems(prev => {
      const existing = prev.find(it => it.product_id === targetId);
      if (existing) {
        let newQty = Number((existing.qty + qtyToAdd).toFixed(3));
        if (maxStock !== undefined && maxStock > 0 && newQty > maxStock) {
          alert(`Cannot add more than available stock (${maxStock}) for "${prod.name}".`);
          newQty = maxStock;
        }
        return prev.map(it =>
          it.product_id === targetId ? { ...it, qty: newQty } : it
        );
      }
      return [
        ...prev,
        {
          product_id: targetId,
          base_product_id: prod.id,
          variant_id: activeVar.id,
          name: prod.name,
          category: prod.category || '',
          category_id: prod.category_id || '',
          unit: activeVar.unit || prod.unit || '1 unit',
          price: Number(activeVar.price) || Number(prod.price) || 0,
          purchase_price: Number(activeVar.purchase_price) || Number(prod.purchase_price) || 0,
          stock: maxStock,
          qty: Number(qtyToAdd.toFixed(3)),
          is_custom: false,
          image: prod.image || ''
        }
      ];
    });
  };

  // Switch Variant for an item already in the order
  const handleSwitchVariant = (productId, newVar) => {
    if (!newVar) return;
    setOrderItems(prev =>
      prev.map(it => {
        if (it.product_id !== productId) return it;
        return {
          ...it,
          variant_id: newVar.id,
          unit: newVar.unit,
          price: Number(newVar.price) || it.price,
          purchase_price: Number(newVar.purchase_price) || it.purchase_price || 0,
          stock: newVar.stock !== undefined ? Number(newVar.stock) : it.stock
        };
      })
    );
  };

  // Update Item Quantity (strictly respects maintained stock limit)
  const handleUpdateQty = (productId, newQty) => {
    const val = parseFloat(newQty);
    if (isNaN(val) || val <= 0) {
      setOrderItems(prev => prev.filter(it => it.product_id !== productId));
    } else {
      setOrderItems(prev =>
        prev.map(it => {
          if (it.product_id !== productId) return it;
          let safeQty = Number(val.toFixed(3));
          const maxStock = Number(it.stock);
          if (!it.is_custom && !isNaN(maxStock) && maxStock > 0 && safeQty > maxStock) {
            alert(`Only ${maxStock} units maintained in stock for "${it.name}".`);
            safeQty = maxStock;
          }
          return { ...it, qty: safeQty };
        })
      );
    }
  };

  // Update Item Selling Price
  const handleUpdatePrice = (productId, newPrice) => {
    const val = Math.max(0, parseFloat(newPrice) || 0);
    setOrderItems(prev =>
      prev.map(it => (it.product_id === productId ? { ...it, price: val } : it))
    );
  };

  // Update Item Purchase Rate / Cost Price
  const handleUpdatePurchasePrice = (productId, newPurchasePrice) => {
    const val = Math.max(0, parseFloat(newPurchasePrice) || 0);
    setOrderItems(prev =>
      prev.map(it => (it.product_id === productId ? { ...it, purchase_price: val } : it))
    );
  };

  // Update Item Unit
  const handleUpdateUnit = (productId, newUnit) => {
    setOrderItems(prev =>
      prev.map(it => (it.product_id === productId ? { ...it, unit: newUnit } : it))
    );
  };

  // Remove Item
  const handleRemoveItem = (productId) => {
    setOrderItems(prev => prev.filter(it => it.product_id !== productId));
  };

  // Add Custom / Unlisted Item (with Purchase Rate & Qty)
  const handleAddCustomItem = (e) => {
    e.preventDefault();
    if (!customItemName.trim()) {
      alert('Please enter an item name');
      return;
    }
    const priceNum = Number(customItemPrice) || 0;
    if (priceNum <= 0) {
      alert('Please enter a valid selling price for the custom item');
      return;
    }
    const purchasePriceNum = Math.max(0, Number(customItemPurchasePrice) || 0);
    const qtyNum = Math.max(0.01, Number(customItemQty) || 1);
    const customId = `custom-${Date.now()}`;

    setOrderItems(prev => [
      ...prev,
      {
        product_id: customId,
        base_product_id: customId,
        name: customItemName.trim(),
        unit: customItemUnit.trim() || '1 item',
        price: priceNum,
        purchase_price: purchasePriceNum,
        qty: Number(qtyNum.toFixed(3)),
        is_custom: true,
        image: ''
      }
    ]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemPurchasePrice('');
    setCustomItemQty('1');
    setShowCustomItemForm(false);
  };

  // Place Order Submission
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (orderItems.length === 0) {
      setErrorMessage('Please add at least one product to the order.');
      return;
    }

    const cleanPhone = (customerPhone || '').replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit customer mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const generatedOrderId = 'GK-M' + Math.floor(1000 + Math.random() * 9000);
      const nowIso = new Date().toISOString();
      const storeOriginLat = Number(settings?.store_lat) || 27.941887;
      const storeOriginLng = Number(settings?.store_lng) || 77.843715;

      const newOrder = {
        id: generatedOrderId,
        source: orderSource, // 'whatsapp' | 'phone' | 'walkin'
        created_by: isStaff ? `Staff: ${activeStaffName}` : 'Admin',
        customer_name: customerName.trim() || (orderSource === 'whatsapp' ? 'WhatsApp Customer' : 'Phone Order Customer'),
        customer_phone: cleanPhone,
        address: {
          label: orderSource === 'walkin' ? 'Walk-in / Store Pickup' : 'Delivery Address',
          line1: addressLine.trim() || 'Customer Address, Khair',
          landmark: landmark.trim() || '',
          city: 'Khair',
          pincode: '202138',
          lat: storeOriginLat,
          lng: storeOriginLng,
          store_lat: storeOriginLat,
          store_lng: storeOriginLng,
          maps_url: `https://www.google.com/maps/search/?api=1&query=${storeOriginLat},${storeOriginLng}`,
          directions_url: `https://www.google.com/maps/dir/?api=1&origin=${storeOriginLat},${storeOriginLng}&destination=${storeOriginLat},${storeOriginLng}&travelmode=driving`
        },
        items: orderItems.map(it => ({
          product_id: it.product_id,
          base_product_id: it.base_product_id,
          name: it.name,
          unit: it.unit,
          price: it.price,
          purchase_price: it.purchase_price || 0,
          qty: it.qty,
          is_custom: it.is_custom || false
        })),
        distance_km: 0.5,
        delivery_slot: deliverySlot,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        order_status: 'Placed',
        assigned_staff_id: assignedRiderId || null,
        vendor_id: vendorId === 'custom' ? null : (vendorId || null),
        vendor_name: vendorName.trim() || null,
        subtotal: subtotal,
        delivery_fee: Number(deliveryFee) || 0,
        discount: Number(discountAmount) || 0,
        total: grandTotal,
        coupon_code: null,
        milestone_gift: selectedGiftItem ? {
          tier_id: selectedGiftItem.tier_id,
          tier_amount: selectedGiftItem.tier_amount,
          tier_title: selectedGiftItem.tier_title,
          item_id: selectedGiftItem.id,
          name: selectedGiftItem.name,
          category: selectedGiftItem.category || 'Gift',
          unit: selectedGiftItem.unit || '1 Pack',
          worth: Number(selectedGiftItem.worth) || 0,
          image: selectedGiftItem.image || ''
        } : null,
        instructions: instructions.trim() || `Manual order entered via ${orderSource === 'whatsapp' ? 'WhatsApp' : orderSource === 'phone' ? 'Phone Call' : 'Store Desk'}`,
        timeline: [
          {
            status: 'Placed',
            time: nowIso,
            timestamp: nowIso,
            note: `Manual order created via ${orderSource === 'whatsapp' ? 'WhatsApp' : orderSource === 'phone' ? 'Phone Call' : 'Store Desk'} by ${isStaff ? activeStaffName : 'Admin'}`
          }
        ],
        created_at: nowIso,
        updated_at: nowIso
      };

      // 1. Deduct Stock for catalog products
      const updatedProducts = products.map(prod => {
        const matchingPurchased = orderItems.filter(
          it => (it.base_product_id === prod.id || it.product_id === prod.id) && !it.is_custom
        );
        if (matchingPurchased.length > 0) {
          const totalQtyDeducted = matchingPurchased.reduce((sum, it) => sum + (Number(it.qty) || 0), 0);
          return {
            ...prod,
            stock: Math.max(0, (Number(prod.stock) || 0) - totalQtyDeducted)
          };
        }
        return prod;
      });
      setProducts(updatedProducts);
      try { localStorage.setItem('gk_products', JSON.stringify(updatedProducts)); } catch {}

      // 2. Fetch and merge with latest orders from Supabase
      window.__gkLastOrderWrite = Date.now();
      let mergedOrders = [newOrder, ...orders.filter(o => o?.id !== newOrder.id)];
      try {
        const remoteData = await fetchNodeFromSupabase('orders');
        if (Array.isArray(remoteData)) {
          mergedOrders = [newOrder, ...remoteData.filter(o => o?.id !== newOrder.id)];
        }
      } catch (err) {
        console.warn('Could not fetch existing remote orders before merge:', err);
      }

      setOrders(mergedOrders);
      try { localStorage.setItem('gk_orders', JSON.stringify(mergedOrders)); } catch {}

      // 3. Fast parallel atomic save to Supabase store_kv
      window.__gkLastOrderWrite = Date.now();
      broadcastStoreEvent('NEW_ORDER', newOrder);
      await Promise.all([
        syncToFirebase('orders', mergedOrders),
        syncToFirebase('orders_inbox', [newOrder])
      ]);

      // Background stock patch in Supabase
      (async () => {
        try {
          const latestProducts = await fetchNodeFromSupabase('products');
          if (Array.isArray(latestProducts)) {
            const patched = latestProducts.map(p => {
              const purchasedItem = (newOrder.items || []).find(it => it.product_id === p.id);
              if (purchasedItem) {
                return {
                  ...p,
                  stock: Math.max(0, (Number(p.stock) || 0) - (Number(purchasedItem.qty) || 0))
                };
              }
              return p;
            });
            syncToFirebase('products', patched);
          }
        } catch {}
      })();

      // 4. Audit Log
      if (addAuditLog) {
        addAuditLog({
          action: 'Create Manual Order',
          details: `${isStaff ? `Staff ${activeStaffName}` : 'Admin'} created ${orderSource} Order #${newOrder.id} for ${newOrder.customer_name} (₹${newOrder.total})`,
          orderId: newOrder.id
        });
      }

      // 5. Sound & Success
      try { playChime('order'); } catch {}
      setCreatedOrder(newOrder);
    } catch (err) {
      console.error('Error creating manual order:', err);
      setErrorMessage('Failed to create order. Please check internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp Message Generator & Share
  const handleShareWhatsApp = (order) => {
    const phone = (order.customer_phone || '').replace(/\D/g, '').slice(-10);
    if (!phone) {
      alert('No customer phone number available');
      return;
    }
    const storeName = settings?.store_name || 'GharTak Kart';
    const storePhone = settings?.store_phone || '';
    const itemsText = (order.items || [])
      .map((it, idx) => `${idx + 1}. ${it.name} (${it.unit || ''}) x${it.qty} = ₹${(Number(it.price) || 0) * (Number(it.qty) || 1)}`)
      .join('\n');
    const giftText = order.milestone_gift ? `\n🎁 *Free Gift:* ${order.milestone_gift.name} (${order.milestone_gift.unit || '1 Pack'})` : '';

    const msg =
`🛍️ *${storeName.toUpperCase()} ORDER CONFIRMATION*
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
🏷️ *Discount:* -₹${order.discount || 0}
💰 *TOTAL AMOUNT:* ₹${order.total || 0}
💳 *Payment Mode:* ${order.payment_method || 'Cash on Delivery'} (${order.payment_status || 'Pending'})
━━━━━━━━━━━━━━━━━━━━━━
🚀 Track your order or order again at:
https://ghartakkart.com

${storePhone ? '📞 Support Call/WhatsApp: ' + storePhone : ''}
Thank you for shopping with ${storeName}! 🙏`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Reset Form for another order
  const handleResetForNewOrder = () => {
    setCustomerName('');
    setCustomerPhone('');
    setAddressLine('');
    setLandmark('');
    setInstructions('');
    setOrderItems([]);
    setDeliveryFee(0);
    setDiscountAmount(0);
    setSelectedGiftItem(null);
    setPaymentMethod('Cash on Delivery');
    setPaymentStatus('Pending (COD)');
    setAssignedRiderId('');
    setVendorId('');
    setVendorName('');
    setCreatedOrder(null);
    setErrorMessage('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom duration-200 my-auto">
        
        {/* ================= MODAL HEADER ================= */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner font-black shrink-0">
              {orderSource === 'whatsapp' ? (
                <MessageSquare className="w-5 h-5 text-emerald-300" />
              ) : orderSource === 'phone' ? (
                <Phone className="w-5 h-5 text-yellow-300" />
              ) : (
                <Store className="w-5 h-5 text-teal-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">
                  Create Manual / Offline Order
                </h3>
                <span className="bg-white/20 text-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin POS
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                For customers ordering on WhatsApp, phone call, or store counter
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= SUCCESS BANNER SCREEN ================= */}
        {createdOrder ? (
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2 max-w-md">
              <h4 className="text-2xl font-black text-gray-900 tracking-tight">
                Order Created Successfully! 🎉
              </h4>
              <p className="text-sm text-gray-600">
                Order <strong className="text-emerald-700 font-black">#{createdOrder.id}</strong> has been placed, synced to Firebase, and added to the store order processing queue.
              </p>
            </div>

            {/* Quick Bill Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-5 w-full max-w-md text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 font-bold">
                <span className="text-gray-500">Customer:</span>
                <span className="text-gray-900 font-black">{createdOrder.customer_name} ({createdOrder.customer_phone})</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Items:</span>
                <span className="font-bold">{createdOrder.items?.length || 0} products</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold">₹{createdOrder.subtotal}</span>
              </div>
              {createdOrder.delivery_fee > 0 && (
                <div className="flex justify-between items-center text-gray-600">
                  <span>Delivery Charges:</span>
                  <span className="font-bold">₹{createdOrder.delivery_fee}</span>
                </div>
              )}
              {createdOrder.discount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>Discount Applied:</span>
                  <span>-₹{createdOrder.discount}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200 text-sm font-black text-gray-900">
                <span>Total Amount:</span>
                <span className="text-emerald-700 text-base font-black">₹{createdOrder.total}</span>
              </div>
              <div className="text-[11px] text-gray-500 pt-1">
                Payment: <strong>{createdOrder.payment_method}</strong> ({createdOrder.payment_status})
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              <button
                type="button"
                onClick={() => handleShareWhatsApp(createdOrder)}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.02]"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Share Bill on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenInvoice) onOpenInvoice(createdOrder);
                }}
                className="flex-1 py-3 px-4 bg-gray-900 hover:bg-black text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>Print Thermal Slip 🖨️</span>
              </button>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="button"
                onClick={handleResetForNewOrder}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                + Create Another Manual Order
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-500 hover:text-gray-700 underline cursor-pointer"
              >
                Close & Return to Orders List
              </button>
            </div>
          </div>
        ) : (
          /* ================= ORDER CREATION WORKSPACE ================= */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* ---------------- LEFT COLUMN: CUSTOMER & ORDER DETAILS (5 COLS) ---------------- */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Order Source / Channel Switcher */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-2">
                  Order Channel / Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderSource('whatsapp')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderSource === 'whatsapp'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderSource('phone')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderSource === 'phone'
                        ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Phone Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderSource('walkin')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      orderSource === 'walkin'
                        ? 'bg-teal-700 text-white shadow-sm ring-2 ring-teal-700/30'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Walk-In</span>
                  </button>
                </div>
              </div>

              {/* Customer Contact Card */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800 uppercase tracking-wider">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>Customer Details</span>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Customer Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                        +91
                      </span>
                      <input
                        type="tel"
                        maxLength="10"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full pl-11 pr-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar / Sharma Ji"
                      className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Delivery Address / Colony / Street
                    </label>
                    <input
                      type="text"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      placeholder="e.g. Near Shiv Mandir, Mohalla Vyapariyan, Khair"
                      className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Landmark
                      </label>
                      <input
                        type="text"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                        placeholder="e.g. Opp. Jain Temple"
                        className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-gray-700 block">
                          Delivery Slot & Timing
                        </label>
                        {manualDeliveryTimeInfo?.hasFastFood && (
                          <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                            🍔 Fast Food Cooking Time Included
                          </span>
                        )}
                      </div>
                      <select
                        value={deliverySlot}
                        onChange={(e) => setDeliverySlot(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs font-bold text-gray-900 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                      >
                        {manualDeliveryTimeInfo?.slotLabel && (
                          <option value={manualDeliveryTimeInfo.slotLabel}>
                            ⚡ {manualDeliveryTimeInfo.slotLabel} — Recommended ({manualDeliveryTimeInfo.prepCategoryLabel})
                          </option>
                        )}
                        <option value="Express (15-25 Mins)">⚡ Express (15-25 Mins)</option>
                        <option value="Express (25-35 Mins)">⚡ Express (25-35 Mins)</option>
                        <option value="Express (35-50 Mins)">🍔 Express (35-50 Mins - Fast Food & Outstation)</option>
                        <option value="Immediate / ASAP">🚀 Immediate / ASAP (10-20 Mins)</option>
                        <option value="Morning Slot (8 AM - 12 PM)">🌅 Morning (8 AM - 12 PM)</option>
                        <option value="Evening Slot (4 PM - 9 PM)">🌇 Evening (4 PM - 9 PM)</option>
                        <option value="Counter Pickup / Takeaway">🏪 Store Pickup / Takeaway</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Instructions / Notes for Rider
                    </label>
                    <input
                      type="text"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. Keep ₹100 change / Call before arriving"
                      className="w-full px-3 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Payment & Rider Settings */}
              <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800 uppercase tracking-wider">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Payment & Rider Assignment</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaymentMethod(val);
                        if (val === 'Cash on Delivery') {
                          setPaymentStatus('Pending (COD)');
                        } else {
                          setPaymentStatus('Paid');
                        }
                      }}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                      <option value="UPI / QR Code">UPI / QR Code</option>
                      <option value="Paid via WhatsApp / GPay">Paid on WhatsApp / GPay</option>
                      <option value="Store Credit / Khata">Store Credit / Khata</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Payment Status
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-2.5 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Pending (COD)">Pending (Collect at Delivery)</option>
                      <option value="Paid">Paid ✅</option>
                      <option value="Khata / Due">Pending (Khata / Due)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Assign Delivery Rider (Optional)
                  </label>
                  <select
                    value={assignedRiderId}
                    onChange={(e) => setAssignedRiderId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- None / Assign Later in Orders tab --</option>
                    {(staff || []).map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.vehicle || 'Bike'} - {st.phone || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vendor / Supplier Assignment */}
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    🏪 Vendor / Supplier (Optional)
                  </label>
                  <select
                    value={vendorId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      setVendorId(vId);
                      if (vId === '') {
                        setVendorName('');
                      } else if (vId !== 'custom') {
                        const matched = (vendors || []).find(v => v.id === vId);
                        if (matched) setVendorName(matched.name);
                      }
                    }}
                    className="w-full px-2.5 py-2 text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 mb-1.5"
                  >
                    <option value="">-- No Vendor / Store Fulfilled --</option>
                    {(vendors || []).map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.company_name || v.category})
                      </option>
                    ))}
                    <option value="custom">✏️ Other / Fill Vendor Name Manually...</option>
                  </select>
                  {(vendorId === 'custom' || vendorId) && (
                    <input
                      type="text"
                      value={vendorName}
                      onChange={(e) => setVendorName(e.target.value)}
                      placeholder="Fill Vendor Name Manually (e.g. Shri ram agrawal)..."
                      className="w-full px-2.5 py-1.5 text-xs font-bold text-gray-900 bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* ---------------- RIGHT COLUMN: PRODUCTS & ORDER CART (7 COLS) ---------------- */}
            <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
              
              <div className="space-y-4">
                {/* Product Search & Category Bar */}
                <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <span>Select Products</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowCustomItemForm(!showCustomItemForm)}
                      className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Custom / Unlisted Item</span>
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search catalogue items (e.g. Potato, Amul Milk, Atta)..."
                      className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                        selectedCategory === 'all'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All ({products.length})
                    </button>
                    {(categories || []).map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Custom Item Form Modal/Collapsible */}
                  {showCustomItemForm && (
                    <form
                      onSubmit={handleAddCustomItem}
                      className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-150 shadow-sm"
                    >
                      <div className="flex items-center justify-between text-xs font-black text-amber-950">
                        <span className="flex items-center gap-1.5">
                          <span>🪄 Add Out-of-Stock / Special Item with Purchase Rate</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowCustomItemForm(false)}
                          className="text-gray-400 hover:text-gray-600 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                            Item Name *
                          </label>
                          <input
                            type="text"
                            value={customItemName}
                            onChange={(e) => setCustomItemName(e.target.value)}
                            placeholder="e.g. Fresh Paneer / Samosa / Extra Kirana"
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                            Unit / Packing (e.g. 1 kg, 500g, 1 Pack)
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={customItemUnit}
                              onChange={(e) => setCustomItemUnit(e.target.value)}
                              placeholder="1 Pack"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none"
                            />
                            <div className="flex gap-1 shrink-0">
                              {['1 kg', '500g', '250g', '1 Pack', '1 Pc'].map((u) => (
                                <button
                                  key={u}
                                  type="button"
                                  onClick={() => setCustomItemUnit(u)}
                                  className="px-1.5 py-1 rounded text-[9px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300"
                                >
                                  {u}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                            Selling Price (₹) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={customItemPrice}
                            onChange={(e) => setCustomItemPrice(e.target.value)}
                            placeholder="₹ Selling Price"
                            className="w-full px-2.5 py-1.5 text-xs font-bold text-gray-900 bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-purple-900 block mb-0.5 flex items-center justify-between">
                            <span>Purchase Rate (₹)</span>
                            <span className="text-[9px] text-purple-600 font-normal">Wholesale Cost</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={customItemPurchasePrice}
                            onChange={(e) => setCustomItemPurchasePrice(e.target.value)}
                            placeholder="₹ Cost Price"
                            className="w-full px-2.5 py-1.5 text-xs font-bold text-purple-900 bg-purple-50/70 border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-700 block mb-0.5">
                            Quantity
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={customItemQty}
                              onChange={(e) => setCustomItemQty(e.target.value)}
                              placeholder="1"
                              className="w-full px-2.5 py-1.5 text-xs font-black text-gray-900 bg-white border border-amber-300 rounded-lg focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="px-4 py-1.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 text-white font-extrabold text-xs rounded-lg shrink-0 cursor-pointer shadow-md transition-all"
                            >
                              + Add Item
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Product Grid / Selector */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {filteredProducts.slice(0, 40).map(prod => {
                      const variants = getProductVariants(prod);
                      const activeVarIdx = selectedVariantIdx[prod.id] || 0;
                      const activeVar = variants[activeVarIdx] || variants[0];
                      const targetId = variants.length > 1 ? `${prod.id}__${activeVar.id || activeVar.unit}` : prod.id;
                      const existing = orderItems.find(it => it.product_id === targetId);
                      const stagingQty = productStagingQtys[prod.id] || 1;

                      const maxStock = activeVar.stock !== undefined
                        ? Number(activeVar.stock)
                        : (prod.stock !== undefined ? Number(prod.stock) : undefined);
                      const isOutOfStock = maxStock !== undefined && maxStock <= 0;
                      const allowedPresets = [1, 2, 3, 5, 10].filter(q => maxStock === undefined || q <= maxStock);

                      return (
                        <div
                          key={prod.id}
                          className={`p-2.5 rounded-xl border transition-all text-xs space-y-2 ${
                            existing
                              ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                              : isOutOfStock
                              ? 'bg-gray-100/70 border-gray-200 opacity-80'
                              : 'bg-gray-50/90 hover:bg-emerald-50/40 border-gray-200'
                          }`}
                        >
                          {/* Top Row: Image, Name, Unit, Price, Stock & Add/Cart Stepper */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {prod.image ? (
                                <img
                                  src={prod.image}
                                  alt={prod.name}
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-200 bg-white"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center font-bold text-gray-500 shrink-0">
                                  🛍️
                                </div>
                              )}
                              <div className="min-w-0">
                                <h5 className="font-extrabold text-gray-900 truncate">{prod.name}</h5>
                                <div className="flex items-center gap-2 text-[11px] text-gray-600 mt-0.5 flex-wrap">
                                  <span className="font-bold text-emerald-700 text-xs">₹{activeVar.price}</span>
                                  <span>•</span>
                                  <span className="font-semibold text-gray-500">{activeVar.unit}</span>
                                  {maxStock !== undefined && (
                                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                                      isOutOfStock
                                        ? 'bg-rose-100 text-rose-800 font-bold'
                                        : maxStock <= 5
                                        ? 'bg-amber-100 text-amber-800 font-bold'
                                        : 'text-gray-400'
                                    }`}>
                                      {isOutOfStock ? 'Out of stock (0)' : `Stock: ${maxStock}`}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Add Button, Out of Stock, or Cart Qty */}
                            <div className="shrink-0">
                              {isOutOfStock ? (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold text-[11px]">
                                  Out of Stock
                                </span>
                              ) : existing ? (
                                <div className="flex items-center gap-1 bg-emerald-600 text-white p-1 rounded-lg font-bold text-xs shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(targetId, existing.qty - 1)}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 rounded font-black cursor-pointer"
                                    title="Decrease quantity"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max={maxStock > 0 ? maxStock : undefined}
                                    value={existing.qty}
                                    onChange={(e) => handleUpdateQty(targetId, e.target.value)}
                                    className="w-12 text-center text-xs font-black text-emerald-950 bg-white rounded px-0.5 py-0.5 focus:outline-none"
                                    title="Choose quantity from stock"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(targetId, existing.qty + 1)}
                                    disabled={maxStock !== undefined && existing.qty >= maxStock}
                                    className="w-5 h-5 flex items-center justify-center hover:bg-emerald-700 disabled:opacity-40 rounded font-black cursor-pointer"
                                    title="Increase quantity"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(prod, stagingQty, activeVarIdx)}
                                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <span>+ Add</span>
                                  {stagingQty > 1 && <span className="bg-white/20 px-1 rounded text-[10px]">({stagingQty})</span>}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Multi-Weight / Variant Selector (configured in stock) */}
                          {variants.length > 1 && (
                            <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-gray-200/60">
                              <span className="text-[10px] text-gray-500 font-bold">Stock Variant:</span>
                              {variants.map((v, idx) => (
                                <button
                                  key={v.id || idx}
                                  type="button"
                                  onClick={() => setSelectedVariantIdx(prev => ({ ...prev, [prod.id]: idx }))}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    idx === activeVarIdx
                                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                                      : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-500 hover:bg-emerald-50'
                                  }`}
                                >
                                  <span>{v.unit}</span>
                                  <span className={idx === activeVarIdx ? 'text-amber-200' : 'text-emerald-700'}>₹{v.price}</span>
                                  {v.stock !== undefined && (
                                    <span className="text-[9px] opacity-75">({v.stock})</span>
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Quick Quantity Chooser (strictly within maintained stock) */}
                          {!isOutOfStock && (
                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-gray-200/60">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[10px] text-gray-500 font-bold">Qty:</span>
                                {allowedPresets.map((preset) => {
                                  const isPresetActive = existing ? Number(existing.qty) === preset : stagingQty === preset;
                                  return (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => {
                                        if (existing) {
                                          handleUpdateQty(targetId, preset);
                                        } else {
                                          setProductStagingQtys(prev => ({ ...prev, [prod.id]: preset }));
                                          handleAddItem(prod, preset, activeVarIdx);
                                        }
                                      }}
                                      className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all cursor-pointer ${
                                        isPresetActive
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Staging Stepper if not added yet */}
                              {!existing && (
                                <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden text-xs shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setProductStagingQtys(prev => ({ ...prev, [prod.id]: Math.max(1, stagingQty - 1) }))}
                                    className="px-1.5 py-0.5 hover:bg-gray-100 text-gray-700 font-bold"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max={maxStock > 0 ? maxStock : undefined}
                                    value={stagingQty}
                                    onChange={(e) => {
                                      const val = Math.max(1, parseInt(e.target.value) || 1);
                                      const bounded = (maxStock > 0 && val > maxStock) ? maxStock : val;
                                      setProductStagingQtys(prev => ({ ...prev, [prod.id]: bounded }));
                                    }}
                                    className="w-9 text-center font-bold text-xs py-0.5 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = stagingQty + 1;
                                      if (maxStock === undefined || next <= maxStock) {
                                        setProductStagingQtys(prev => ({ ...prev, [prod.id]: next }));
                                      }
                                    }}
                                    disabled={maxStock !== undefined && stagingQty >= maxStock}
                                    className="px-1.5 py-0.5 hover:bg-gray-100 disabled:opacity-40 text-gray-700 font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {filteredProducts.length === 0 && (
                      <div className="text-center py-6 text-gray-400 text-xs">
                        No products match "{searchQuery}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Items Cart List */}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Order Items ({orderItems.length})</span>
                    </span>
                    {orderItems.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setOrderItems([])}
                        className="text-[11px] text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {orderItems.length === 0 ? (
                    <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-xs">
                      <ShoppingBag className="w-7 h-7 mx-auto mb-1 text-gray-300" />
                      <p className="font-bold">No items added to this order yet.</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Use product search above or add a custom item.</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                      {orderItems.map((item) => {
                        const itemCost = Number(item.purchase_price) || 0;
                        const itemPrice = Number(item.price) || 0;
                        const itemQty = Number(item.qty) || 0;
                        const lineTotal = Number((itemPrice * itemQty).toFixed(2));
                        const lineCost = Number((itemCost * itemQty).toFixed(2));
                        const lineMargin = lineCost > 0 ? Number((lineTotal - lineCost).toFixed(2)) : null;

                        const parentProd = products?.find(p => p.id === item.base_product_id);
                        const parentVariants = parentProd ? getProductVariants(parentProd) : [];

                        return (
                          <div
                            key={item.product_id}
                            className="p-2.5 rounded-xl bg-gray-50/90 border border-gray-200 hover:border-emerald-300 transition-all text-xs space-y-2 shadow-2xs"
                          >
                            {/* Top row: Title, Unit, Custom badge, Delete button */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className="font-extrabold text-gray-900 truncate text-xs">{item.name}</h5>
                                  {item.is_custom && (
                                    <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.2 rounded border border-amber-300">
                                      Custom
                                    </span>
                                  )}
                                  <span className="text-[10px] text-gray-500 font-medium bg-gray-200/70 px-1.5 py-0.2 rounded">
                                    {item.unit}
                                  </span>
                                </div>

                                {/* Switch weight variant if product has multiple */}
                                {parentVariants.length > 1 && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    <span className="text-[9px] text-gray-400 font-bold">Switch Weight:</span>
                                    {parentVariants.map((v) => (
                                      <button
                                        key={v.id}
                                        type="button"
                                        onClick={() => handleSwitchVariant(item.product_id, v)}
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                                          item.unit === v.unit
                                            ? 'bg-emerald-600 text-white border-emerald-600'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                                        }`}
                                      >
                                        {v.unit} (₹{v.price})
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.product_id)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Middle row: Editable Selling Price, Purchase Rate, and Quantity Input */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2 rounded-lg border border-gray-200/80">
                              {/* Selling Price */}
                              <div>
                                <label className="text-[9px] font-bold text-gray-600 block mb-0.5">
                                  Selling Price (₹)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price}
                                  onChange={(e) => handleUpdatePrice(item.product_id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs font-bold text-emerald-800 bg-emerald-50/40 border border-emerald-300 rounded focus:outline-none"
                                />
                              </div>

                              {/* Purchase Rate (Wholesale Cost) */}
                              <div>
                                <label className="text-[9px] font-bold text-purple-900 block mb-0.5 flex items-center justify-between">
                                  <span>Purchase Rate (₹)</span>
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  placeholder="₹ Cost"
                                  value={item.purchase_price !== undefined ? item.purchase_price : ''}
                                  onChange={(e) => handleUpdatePurchasePrice(item.product_id, e.target.value)}
                                  className="w-full px-2 py-1 text-xs font-bold text-purple-900 bg-purple-50/50 border border-purple-300 rounded focus:outline-none"
                                />
                              </div>

                              {/* Quantity with Minus, Direct Input, Plus & Dropdown */}
                              <div>
                                <div className="flex items-center justify-between mb-0.5">
                                  <label className="text-[9px] font-bold text-gray-700">
                                    Quantity
                                  </label>
                                  {(() => {
                                    const parentProd = products?.find(p => p.id === item.base_product_id);
                                    const parentVariants = parentProd ? getProductVariants(parentProd) : [];
                                    const matchedVar = parentVariants.find(v => v.unit === item.unit) || parentVariants[0];
                                    const itemStock = item.is_custom ? undefined : Number(matchedVar?.stock !== undefined ? matchedVar.stock : (item.stock ?? parentProd?.stock));
                                    const allowedQtys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].filter(q => itemStock === undefined || isNaN(itemStock) || q <= itemStock);

                                    return (
                                      <select
                                        value={item.qty}
                                        onChange={(e) => handleUpdateQty(item.product_id, e.target.value)}
                                        className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                                        title="Choose quantity from stock"
                                      >
                                        {allowedQtys.map(q => (
                                          <option key={q} value={q}>{q} {item.unit ? `(${item.unit})` : ''}</option>
                                        ))}
                                        {!allowedQtys.includes(Number(item.qty)) && (
                                          <option value={item.qty}>{item.qty} {item.unit ? `(${item.unit})` : ''}</option>
                                        )}
                                      </select>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center border border-gray-300 rounded bg-white overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.product_id, Math.max(1, item.qty - 1))}
                                    className="px-2 py-1 hover:bg-gray-100 text-gray-700 font-black cursor-pointer text-xs"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max={item.stock > 0 ? item.stock : undefined}
                                    value={item.qty}
                                    onChange={(e) => handleUpdateQty(item.product_id, e.target.value)}
                                    className="w-full text-center font-black text-xs text-gray-900 py-1 focus:outline-none border-x border-gray-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateQty(item.product_id, item.qty + 1)}
                                    disabled={!item.is_custom && item.stock !== undefined && item.qty >= item.stock}
                                    className="px-2 py-1 hover:bg-gray-100 disabled:opacity-40 text-gray-700 font-black cursor-pointer text-xs"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: Quick presets & totals */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                              {/* Quick Quantity Presets */}
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[9px] text-gray-400 font-bold">Qty:</span>
                                {(() => {
                                  const itemStock = item.is_custom ? undefined : Number(item.stock);
                                  const allowedPresets = [1, 2, 3, 5, 10].filter(q => itemStock === undefined || isNaN(itemStock) || q <= itemStock);
                                  return allowedPresets.map((preset) => (
                                    <button
                                      key={preset}
                                      type="button"
                                      onClick={() => handleUpdateQty(item.product_id, preset)}
                                      className={`px-2 py-0.5 rounded text-[9px] font-black border transition-all cursor-pointer ${
                                        Number(item.qty) === preset
                                          ? 'bg-emerald-600 text-white border-emerald-600'
                                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {preset}
                                    </button>
                                  ));
                                })()}
                                {!item.is_custom && item.stock !== undefined && Number(item.qty) >= Number(item.stock) && (
                                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                                    Stock Max: {item.stock}
                                  </span>
                                )}
                              </div>

                              {/* Line Subtotal and Margin */}
                              <div className="text-right text-[11px]">
                                <span className="font-bold text-gray-700">Total: </span>
                                <strong className="text-emerald-700 font-black">₹{lineTotal}</strong>
                                {lineCost > 0 && (
                                  <span className="ml-1.5 text-[10px] text-purple-700 font-bold bg-purple-50 px-1 py-0.5 rounded border border-purple-200">
                                    Cost: ₹{lineCost} {lineMargin !== null && `(Margin: +₹${lineMargin})`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Milestone Gift Option (If qualified) */}
                  {eligibleGiftTiers.length > 0 && (
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-black text-emerald-900">
                        <span className="flex items-center gap-1">
                          <Gift className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Eligible for Free Milestone Gift!</span>
                        </span>
                        {selectedGiftItem && (
                          <button
                            type="button"
                            onClick={() => setSelectedGiftItem(null)}
                            className="text-[10px] text-emerald-700 hover:underline"
                          >
                            Remove Gift
                          </button>
                        )}
                      </div>

                      <select
                        value={selectedGiftItem ? selectedGiftItem.id : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setSelectedGiftItem(null);
                            return;
                          }
                          // Find item in eligible tiers
                          for (const tier of eligibleGiftTiers) {
                            const found = (tier.items || []).find(it => it.id === val);
                            if (found) {
                              setSelectedGiftItem({
                                ...found,
                                tier_id: tier.id,
                                tier_amount: tier.min_amount,
                                tier_title: tier.title
                              });
                              break;
                            }
                          }
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-emerald-300 rounded-lg font-bold text-emerald-900 focus:outline-none"
                      >
                        <option value="">-- Select Free Gift (Optional) --</option>
                        {eligibleGiftTiers.map(tier => (
                          <optgroup key={tier.id} label={`${tier.title} (₹${tier.min_amount}+ Orders)`}>
                            {(tier.items || []).map(gift => (
                              <option key={gift.id} value={gift.id}>
                                🎁 {gift.name} ({gift.unit || '1 Pack'}) - Worth ₹{gift.worth || 0}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Financial Summary & Place Order Button */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 shrink-0 mt-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600 font-medium">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-gray-900 text-sm">₹{subtotal}</span>
                  </div>

                  <div className="flex justify-between items-center text-gray-600">
                    <span className="flex items-center gap-1">
                      <span>Delivery Charges:</span>
                      <button
                        type="button"
                        onClick={() => setDeliveryFee(deliveryFee === 0 ? 15 : 0)}
                        className={`text-[10px] font-black px-1.5 py-0.2 rounded border ${
                          deliveryFee === 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-gray-200 text-gray-700 border-gray-300'
                        }`}
                      >
                        {deliveryFee === 0 ? '✓ Free Delivery' : 'Make Free'}
                      </button>
                    </span>
                    <div className="flex items-center gap-1 w-24">
                      <span>₹</span>
                      <input
                        type="number"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded-lg text-right"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-gray-600">
                    <span>Discount (₹):</span>
                    <div className="flex items-center gap-1 w-24">
                      <span>-₹</span>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs font-bold bg-white border border-gray-300 rounded-lg text-right text-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-gray-300 text-sm font-black text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-700 text-lg font-black">₹{grandTotal}</span>
                  </div>

                  {totalCost > 0 && (
                    <div className="flex justify-between items-center text-[11px] text-purple-900 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200">
                      <span>Total Cost: <strong>₹{totalCost.toFixed(1)}</strong></span>
                      <span className="font-bold text-emerald-700">Gross Margin: +₹{estimatedMargin.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2.5 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitOrder}
                    disabled={isSubmitting || orderItems.length === 0}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs sm:text-sm rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.01] active:scale-98"
                  >
                    {isSubmitting ? (
                      <span>Placing Order & Syncing...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Place Manual Order (₹{grandTotal})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
