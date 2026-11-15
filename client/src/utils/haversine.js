export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function formatTime12h(time24 = '07:00') {
  if (!time24 || typeof time24 !== 'string') return '7:00 AM';
  const parts = time24.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const minStr = String(Number.isNaN(m) ? 0 : m).padStart(2, '0');
  return `${hour12}:${minStr} ${period}`;
}

export function getStoreOperatingStatus(settings, now = new Date()) {
  const dh = settings?.delivery_hours || {};
  const openRaw = (dh.open || '07:00').trim();
  let closeRaw = (dh.close || '23:00').trim();
  const daysOpen = dh.days_open || 'All 7 Days (Mon - Sun)';

  const parseMinutes = (t, fallback) => {
    const [hStr, mStr] = (t || '').split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (Number.isNaN(h)) return fallback;
    return h * 60 + (Number.isNaN(m) ? 0 : m);
  };

  const openMins = parseMinutes(openRaw, 7 * 60);
  let closeMins = parseMinutes(closeRaw, 23 * 60);

  // If Admin entered morning opening (e.g. 09:00 AM) and typed 08:00 for closing (meaning 08:00 PM / 20:00),
  // automatically normalize closing time to PM (+12 hours) so it is 9:00 AM to 8:00 PM.
  if (openMins < 16 * 60 && closeMins > 0 && closeMins <= 12 * 60 && closeMins <= openMins) {
    closeMins += 12 * 60;
    const closeH = Math.floor(closeMins / 60);
    const closeM = closeMins % 60;
    closeRaw = `${String(closeH).padStart(2, '0')}:${String(closeM).padStart(2, '0')}`;
  }

  const openFormatted = formatTime12h(openRaw);
  const closeFormatted = formatTime12h(closeRaw);
  const currentMins = now.getHours() * 60 + now.getMinutes();

  // 1. Check if admin manually paused/closed the store
  if (dh.is_open === false) {
    return {
      isOpen: false,
      reason: 'manual_closed',
      openRaw,
      closeRaw,
      openFormatted,
      closeFormatted,
      daysOpen,
      title: `Store is Currently Closed (Hours: ${openFormatted} – ${closeFormatted})`,
      message: `Our store is currently closed for orders. We accept orders only during our store operating hours from ${openFormatted} to ${closeFormatted}. Please place your order during these hours.`
    };
  }

  // 2. Check current clock time against admin's opening & closing time
  let withinHours = true;
  let reason = 'open';

  if (openMins <= closeMins) {
    if (currentMins < openMins) {
      withinHours = false;
      reason = 'before_open';
    } else if (currentMins >= closeMins) {
      withinHours = false;
      reason = 'after_close';
    }
  } else {
    // True overnight schedule (e.g. 18:00 PM to 02:00 AM)
    if (currentMins < openMins && currentMins >= closeMins) {
      withinHours = false;
      reason = 'before_open';
    }
  }

  if (!withinHours) {
    const timingMessage =
      reason === 'before_open'
        ? `Our store is currently closed. We accept orders only between ${openFormatted} and ${closeFormatted}. Please place your order between ${openFormatted} and ${closeFormatted}.`
        : `Our store is closed for today (Closing Time: ${closeFormatted}). We accept orders only between ${openFormatted} and ${closeFormatted}. Please place your order tomorrow starting at ${openFormatted}.`;

    return {
      isOpen: false,
      reason,
      openRaw,
      closeRaw,
      openFormatted,
      closeFormatted,
      daysOpen,
      title: `Store is Closed Now (Operating Hours: ${openFormatted} – ${closeFormatted})`,
      message: timingMessage
    };
  }

  return {
    isOpen: true,
    reason: 'open',
    openRaw,
    closeRaw,
    openFormatted,
    closeFormatted,
    daysOpen,
    title: `Open Now (${openFormatted} – ${closeFormatted})`,
    message: `Orders are being accepted now (${openFormatted} – ${closeFormatted}).`
  };
}

/**
 * Calculate dynamic delivery time (ETA) based on distance (km) and items/categories in cart
 * e.g., Fast Food adds 15-22 mins preparation/cooking time + distance transit time (e.g. 8 km = ~26-34 mins transit).
 * Total for 8km Fast Food = ~40 to 55 minutes.
 */
export function calculateDeliveryTime({ distanceKm = 1, items = [], settings = null }) {
  const dist = Math.max(0.1, Math.min(50, Number(distanceKm) || 1));

  // 1. Road Transit Time: hyperlocal 2-wheeler speed in Khair / Aligarh bypass (~3 to 4.2 mins/km + initial dispatch buffer)
  const transitMin = Math.max(4, Math.round(dist * 3.2));
  const transitMax = Math.max(7, Math.round(dist * 4.2) + 3);

  // 2. Kitchen / Preparation Time by Category & Item keywords
  let maxPrepMin = 5;
  let maxPrepMax = 10;
  let prepCategoryLabel = 'Express Store Picking & Packing';
  let hasFastFood = false;
  let hasFreshProduce = false;

  const itemList = Array.isArray(items) ? items : [];

  for (const it of itemList) {
    if (!it) continue;
    const cat = String(it.category || it.category_id || it.category_name || '').toLowerCase();
    const name = String(it.name || '').toLowerCase();
    const subcat = String(it.subcategory || '').toLowerCase();

    // Check for Hot Fast Food / Kitchen cooked items
    const isFastFood =
      cat.includes('fast food') ||
      cat.includes('hot fast food') ||
      cat.includes('cat-5') ||
      cat.includes('kitchen') ||
      cat.includes('restaurant') ||
      cat.includes('cooked') ||
      name.includes('burger') ||
      name.includes('pizza') ||
      name.includes('momo') ||
      name.includes('chowmein') ||
      name.includes('noodle') ||
      name.includes('roll') ||
      name.includes('sandwich') ||
      name.includes('french fry') ||
      name.includes('patty') ||
      name.includes('chaat') ||
      name.includes('maggi') ||
      subcat.includes('burger') ||
      subcat.includes('pizza') ||
      subcat.includes('momo') ||
      subcat.includes('chowmein');

    if (isFastFood) {
      hasFastFood = true;
      if (maxPrepMin < 15) {
        maxPrepMin = 15;
        maxPrepMax = 22;
        prepCategoryLabel = 'Fast Food Kitchen Cooking';
      }
    } else if (
      cat.includes('veg') ||
      cat.includes('fruit') ||
      cat.includes('fresh') ||
      cat.includes('cat-2') ||
      cat.includes('bikaner') ||
      cat.includes('sweet') ||
      cat.includes('dairy') ||
      subcat.includes('veg') ||
      subcat.includes('fruit')
    ) {
      hasFreshProduce = true;
      if (maxPrepMin < 8 && !hasFastFood) {
        maxPrepMin = 8;
        maxPrepMax = 14;
        prepCategoryLabel = 'Fresh Weighed & Packed';
      }
    }
  }

  // 3. Combined Total Delivery Time
  const combinedMin = transitMin + maxPrepMin;
  const combinedMax = transitMax + maxPrepMax;

  // Round to clean, customer-friendly 5-minute increments (e.g. 15-25 mins, 35-45 mins, 40-50 mins)
  const friendlyMin = Math.max(10, Math.round(combinedMin / 5) * 5);
  const friendlyMax = Math.max(friendlyMin + 5, Math.round(combinedMax / 5) * 5);

  const slotLabel = `Express (${friendlyMin}-${friendlyMax} Mins)`;
  const summaryBadge = `${friendlyMin}-${friendlyMax} mins`;
  const detailText = `${friendlyMin}-${friendlyMax} mins (${dist.toFixed(1)} km · ${hasFastFood ? 'Fast Food Prep + Travel' : hasFreshProduce ? 'Fresh Packing + Travel' : 'Express Delivery'})`;

  return {
    distanceKm: dist,
    transitMin,
    transitMax,
    prepMin: maxPrepMin,
    prepMax: maxPrepMax,
    prepCategoryLabel,
    hasFastFood,
    hasFreshProduce,
    totalMin: friendlyMin,
    totalMax: friendlyMax,
    slotLabel,
    summaryBadge,
    detailText
  };
}


