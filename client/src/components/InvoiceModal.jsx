import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext.jsx';
import { X, Printer, FileText, Receipt, ExternalLink, MapPin, Check } from 'lucide-react';

export default function InvoiceModal({ order, onClose }) {
  const { settings, staff } = useStore();
  
  // Default to 2-inch (50mm / 58mm) portable thermal printer, or remember user's last selection
  const [printMode, setPrintMode] = useState(() => {
    try {
      return localStorage.getItem('gk_preferred_print_mode') || 'thermal_50';
    } catch {
      return 'thermal_50';
    }
  });

  const [highContrast, setHighContrast] = useState(true);
  const [showLogoOnReceipt, setShowLogoOnReceipt] = useState(() => {
    try {
      const saved = localStorage.getItem('gk_receipt_show_logo');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gk_preferred_print_mode', printMode);
    } catch {}
  }, [printMode]);

  useEffect(() => {
    try {
      localStorage.setItem('gk_receipt_show_logo', String(showLogoOnReceipt));
    } catch {}
  }, [showLogoOnReceipt]);

  if (!order) return null;

  const assignedRider = staff?.find(s => s.id === order.assigned_staff_id);

  const handlePrint = () => {
    let elementId = 'printable-thermal-50-receipt';
    if (printMode === 'thermal_80') elementId = 'printable-thermal-80-receipt';
    if (printMode === 'standard') elementId = 'printable-a4-invoice';

    const content = document.getElementById(elementId);
    if (!content) {
      window.print();
      return;
    }

    let iframe = document.getElementById('receipt-print-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'receipt-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const isThermal50 = printMode === 'thermal_50';
    const isThermal80 = printMode === 'thermal_80';
    const isA4 = printMode === 'standard';

    const pageSize = isThermal50 ? '58mm auto' : isThermal80 ? '80mm auto' : 'A4 portrait';
    const contentWidth = isThermal50 ? '48mm' : isThermal80 ? '76mm' : '100%';
    const pageMargin = isThermal50 ? '0mm' : isThermal80 ? '2mm' : '10mm';
    const bodyPadding = isThermal50 ? '1mm 1.5mm' : isThermal80 ? '2mm' : '15mm';
    const fontSize = isThermal50 ? '11px' : isThermal80 ? '12px' : '13px';

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${isA4 ? 'Tax Invoice' : 'Thermal Receipt'} - Order #${order.id}</title>
          <style>
            @page {
              size: ${pageSize};
              margin: ${pageMargin};
            }
            @media print {
              html, body {
                width: ${contentWidth} !important;
                max-width: ${contentWidth} !important;
                margin: 0 auto !important;
                padding: ${bodyPadding} !important;
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              * {
                color: #000000 !important;
                border-color: #000000 !important;
                box-shadow: none !important;
                text-shadow: none !important;
                ${highContrast ? '-webkit-text-stroke: 0.15px #000000 !important;' : ''}
              }
            }
            body {
              font-family: ${isA4 ? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : "'Courier New', Courier, 'Lucida Console', Monaco, monospace"};
              font-size: ${fontSize};
              font-weight: 700;
              line-height: 1.25;
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: ${bodyPadding};
              box-sizing: border-box;
              -webkit-font-smoothing: antialiased;
            }
            * { box-sizing: border-box; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 2px 0; color: #000000; }
            .border-b { border-bottom: 1.5px solid #000000; }
            .border-t { border-top: 1.5px solid #000000; }
            .border-dashed { border-bottom: 1.5px dashed #000000; }
            .border-double { border-bottom: 3px double #000000; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .break-all { word-break: break-all; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .space-y-1 > * + * { margin-top: 3px; }
            .space-y-0.5 > * + * { margin-top: 1.5px; }
            .py-1 { padding-top: 2px; padding-bottom: 2px; }
            .py-2 { padding-top: 4px; padding-bottom: 4px; }
            .pt-1 { padding-top: 2px; }
            .pt-2 { padding-top: 4px; }
            .pb-1 { padding-bottom: 2px; }
            .pb-2 { padding-bottom: 4px; }
            .text-sm { font-size: 13px; font-weight: 800; }
            .text-xs { font-size: 11px; }
            .text-lg { font-size: 15px; font-weight: 900; }
            .text-xl { font-size: 17px; font-weight: 900; }
            img { max-width: 100%; display: block; }
            .w-10 { width: 38px !important; }
            .h-10 { height: 38px !important; }
            .w-12 { width: 48px !important; }
            .h-12 { height: 48px !important; }
            .w-14 { width: 56px !important; }
            .h-14 { height: 56px !important; }
            .w-28 { width: 110px !important; }
            .w-32 { width: 128px !important; }
            .w-36 { width: 144px !important; }
            .w-40 { width: 160px !important; }
            .my-0\\.5 { margin-top: 2px !important; margin-bottom: 2px !important; }
            .my-1 { margin-top: 4px !important; margin-bottom: 4px !important; }
            .my-2 { margin-top: 6px !important; margin-bottom: 6px !important; }
            .gap-1 { gap: 4px !important; }
            .gap-1\\.5 { gap: 6px !important; }
            .mx-auto { margin-left: auto !important; margin-right: auto !important; }
            .rounded-full { border-radius: 9999px !important; }
            .rounded-xl { border-radius: 10px !important; }
            .rounded-2xl { border-radius: 14px !important; }
            .border { border: 1.5px solid #000000 !important; }
            .border-black { border-color: #000000 !important; }
            .p-0\\.5 { padding: 2px !important; }
            .mb-1 { margin-bottom: 4px !important; }
            .mb-1\\.5 { margin-bottom: 6px !important; }
            .object-contain { object-fit: contain !important; }
            .object-cover { object-fit: cover !important; }
          </style>
        </head>
        <body>
          ${content.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print error:', err);
      }
    };

    const docImgs = doc.images;
    if (docImgs && docImgs.length > 0) {
      let loaded = 0;
      const total = docImgs.length;
      let hasTriggered = false;
      const onDone = () => {
        loaded++;
        if (loaded >= total && !hasTriggered) {
          hasTriggered = true;
          setTimeout(triggerPrint, 100);
        }
      };
      for (let i = 0; i < total; i++) {
        if (docImgs[i].complete) {
          onDone();
        } else {
          docImgs[i].onload = onDone;
          docImgs[i].onerror = onDone;
        }
      }
      setTimeout(() => {
        if (!hasTriggered) {
          hasTriggered = true;
          triggerPrint();
        }
      }, 500);
    } else {
      setTimeout(triggerPrint, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[96vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:w-full print:rounded-none">
        
        {/* Header - Hidden on Print */}
        <div className="px-4 sm:px-6 py-3.5 bg-gray-950 text-white flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span>Receipt Printer</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Order #{order.id}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Optimized for 2-inch (50mm/58mm) portable POS thermal printers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="bg-gray-900 p-1 rounded-xl flex items-center border border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setPrintMode('thermal_50')}
                className={`px-3 py-1.5 rounded-lg font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  printMode === 'thermal_50'
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="50mm / 58mm roll: Standard 2-inch portable Bluetooth/USB thermal printer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>2" Thermal (50mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('thermal_80')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  printMode === 'thermal_80'
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="80mm desktop POS receipt printer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>3" (80mm)</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintMode('standard')}
                className={`px-2.5 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  printMode === 'standard'
                    ? 'bg-amber-500 text-gray-950 shadow-md'
                    : 'text-gray-300 hover:text-white'
                }`}
                title="Full A4 tax invoice"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4</span>
              </button>
            </div>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Settings & Tips Toolbar */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-950 text-[11px] font-semibold flex flex-wrap items-center justify-between gap-2 print:hidden shrink-0">
          <div className="flex items-center gap-1.5">
            <span>💡</span>
            <span>
              {printMode === 'thermal_50' ? (
                <><strong>2-Inch (50mm/58mm) Thermal Print:</strong> Set POS paper to <strong>58mm</strong>, <strong>Margins: None</strong>.</>
              ) : printMode === 'thermal_80' ? (
                <><strong>3-Inch (80mm) Thermal Print:</strong> Set paper to <strong>80mm</strong>, <strong>Margins: None</strong>.</>
              ) : (
                <><strong>A4 Invoice Print:</strong> Set paper to <strong>A4</strong>, <strong>Layout: Portrait</strong>.</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer text-amber-900 shrink-0">
              <input
                type="checkbox"
                checked={showLogoOnReceipt}
                onChange={(e) => setShowLogoOnReceipt(e.target.checked)}
                className="rounded accent-emerald-600"
              />
              <span>Store Logo</span>
            </label>
            <label className="flex items-center gap-1 text-[11px] font-bold cursor-pointer text-amber-900 shrink-0">
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="rounded accent-emerald-600"
              />
              <span>High Darkness</span>
            </label>
          </div>
        </div>

        {/* Printable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-200/80 flex justify-center print:bg-white print:p-0">
          
          {/* ============================================================== */}
          {/* OPTION 1: 2-INCH (50MM / 58MM PAPER) PORTABLE THERMAL FORMAT   */}
          {/* ============================================================== */}
          {printMode === 'thermal_50' && (
            <div
              id="printable-thermal-50-receipt"
              style={{ width: '48mm', maxWidth: '48mm' }}
              className="bg-white p-2 shadow-2xl border-2 border-dashed border-gray-400 font-mono text-[11px] font-bold text-black leading-tight print:shadow-none print:border-none print:w-[48mm] print:max-w-[48mm] print:p-0"
            >
              {/* Store Header */}
              <div className="text-center space-y-0.5 pb-1.5 border-b-2 border-black">
                {showLogoOnReceipt && (
                  <div className="flex justify-center mb-1">
                    <img
                      src={settings?.store_logo || '/logo.jpg'}
                      alt={settings?.store_name || 'GhartakKart'}
                      className="w-10 h-10 object-contain rounded-full border border-black p-0.5 mx-auto print:border-black"
                      style={{
                        filter: highContrast
                          ? 'grayscale(100%) contrast(160%) brightness(95%)'
                          : 'grayscale(100%)'
                      }}
                    />
                  </div>
                )}
                <h1 className="text-sm font-black uppercase tracking-tight text-black">
                  *** {settings?.store_name || 'GHARTAKKART'} ***
                </h1>
                {settings?.gstin && !['na', 'n/a', 'none', ''].includes(settings.gstin.toLowerCase().trim()) && (
                  <p className="text-[9px] font-bold text-black">GSTIN: {settings.gstin}</p>
                )}
                {settings?.fssai_license && !['na', 'n/a', 'none', ''].includes(settings.fssai_license.toLowerCase().trim()) && (
                  <p className="text-[9px] font-bold text-black">FSSAI: {settings.fssai_license}</p>
                )}
              </div>

              {/* Order Metadata */}
              <div className="py-1.5 border-b-2 border-dashed border-black space-y-0.5 text-[10.5px]">
                <div className="flex justify-between items-center">
                  <span className="font-black">ORDER:</span>
                  <span className="text-xs font-black bg-black text-white px-1 rounded">
                    #{order.id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>DATE:</span>
                  <span className="font-bold">
                    {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })} {new Date(order.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
                {order.delivery_slot && (
                  <div className="flex justify-between">
                    <span>SLOT:</span>
                    <span className="font-black">{order.delivery_slot}</span>
                  </div>
                )}
                {assignedRider && (
                  <div className="flex justify-between">
                    <span>RIDER:</span>
                    <span className="font-bold">{assignedRider.name}</span>
                  </div>
                )}
              </div>

              {/* Customer Delivery Details */}
              <div className="py-1.5 border-b-2 border-dashed border-black text-[10px] space-y-0.5">
                <div className="font-black uppercase text-[10.5px]">DELIVERY TO:</div>
                <p className="text-[11px] font-black text-black">{order.customer_name || 'Customer'}</p>
                <p className="text-[11px] font-black text-black">MOB: {order.customer_phone}</p>
                <p className="font-bold leading-tight pt-0.5">{order.address?.line1 || ''}</p>
                {order.address?.landmark && (
                  <p className="font-bold">Landmark: {order.address.landmark}</p>
                )}
                <p className="font-bold">
                  {order.address?.city || 'Khair'} - {order.address?.pincode || '202138'}
                </p>
                <div className="flex justify-between pt-0.5 font-black text-[9.5px]">
                  <span>DISTANCE:</span>
                  <span>{order.distance_km || 1} km from Hub</span>
                </div>
                {order.address?.lat && order.address?.lng && (
                  <p className="text-[8.5px] font-bold">
                    GPS: {Number(order.address.lat).toFixed(4)}, {Number(order.address.lng).toFixed(4)}
                  </p>
                )}
              </div>

              {/* Itemized Order List (2-Line format for 2-inch width) */}
              <div className="py-1.5 border-b-2 border-black">
                <div className="flex justify-between text-[10px] font-black uppercase border-b-2 border-black pb-0.5">
                  <span>ITEM / QTY</span>
                  <span>AMOUNT</span>
                </div>

                <div className="pt-1 space-y-1.5">
                  {(order.items || []).map((it, idx) => (
                    <div key={idx} className="text-[10.5px] leading-tight">
                      <div className="font-black text-black">
                        {idx + 1}. {it.name}
                      </div>
                      <div className="flex justify-between pl-2 text-[10px] font-bold">
                        <span>
                          {it.qty} x ₹{it.price} {it.unit ? `(${it.unit})` : ''}
                        </span>
                        <span className="font-black text-black">
                          ₹{Number(it.price) * Number(it.qty)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {order.milestone_gift && (
                    <div className="text-[10px] leading-tight pt-1 border-t border-dashed border-black">
                      <div className="font-black text-black">
                        🎁 [FREE] {order.milestone_gift.name}
                      </div>
                      <div className="flex justify-between pl-2 font-bold">
                        <span>1 x FREE ({order.milestone_gift.unit})</span>
                        <span className="font-black text-black">₹0</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bill Totals */}
              <div className="py-1.5 border-b-2 border-dashed border-black space-y-0.5 text-[10.5px]">
                <div className="flex justify-between">
                  <span>ITEMS TOTAL:</span>
                  <span className="font-bold">₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>DELIVERY FEE:</span>
                  <span className="font-bold">
                    {Number(order.delivery_fee) === 0 ? 'FREE' : `₹${order.delivery_fee}`}
                  </span>
                </div>
                {Number(order.discount) > 0 && (
                  <div className="flex justify-between">
                    <span>DISCOUNT ({order.coupon_code || 'OFFER'}):</span>
                    <span className="font-black">-₹{order.discount}</span>
                  </div>
                )}
                {Number(order.wallet_used) > 0 && (
                  <div className="flex justify-between">
                    <span>WALLET REDEEMED:</span>
                    <span className="font-black">-₹{order.wallet_used}</span>
                  </div>
                )}
                
                <div className="border-t-2 border-b-2 border-black py-1 my-1 flex justify-between items-center text-xs font-black">
                  <span>NET TOTAL:</span>
                  <span className="text-sm font-black">₹{order.total}</span>
                </div>

                <div className="flex justify-between text-[10px] pt-0.5">
                  <span>PAYMENT:</span>
                  <span className="font-black uppercase">
                    {order.payment_method || 'COD'} ({order.payment_status || 'Pending'})
                  </span>
                </div>

                {order.source && (
                  <div className="flex justify-between text-[9px] pt-0.5">
                    <span>CHANNEL:</span>
                    <span className="font-black uppercase">
                      {order.source === 'whatsapp' ? 'WhatsApp Order' : order.source === 'phone' ? 'Phone Order' : 'Store Desk Order'}
                    </span>
                  </div>
                )}

                {order.razorpay_payment_id && (
                  <div className="flex justify-between text-[9px] pt-0.5">
                    <span>RZP ID:</span>
                    <span className="font-mono font-bold">{order.razorpay_payment_id}</span>
                  </div>
                )}

                {order.instructions && (
                  <div className="pt-1 text-[9.5px]">
                    <span className="font-black">NOTE: </span>
                    <span className="font-bold">{order.instructions}</span>
                  </div>
                )}

                {order.admin_remark && (
                  <div className="pt-1 text-[9.5px]">
                    <span className="font-black">ADMIN NOTE: </span>
                    <span className="font-bold">{order.admin_remark}</span>
                  </div>
                )}
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-2 space-y-0.5 text-[9.5px]">
                <div className="font-black tracking-widest text-[11px] py-0.5">
                  *GK-{order.id}*
                </div>
                <p className="font-black uppercase text-[10px]">
                  {settings?.receipt_footer_msg || '*** THANK YOU FOR SHOPPING LOCAL ***'}
                </p>
                <p className="font-bold text-[9px]">GhartakKart Hyperlocal Khair</p>
                <p className="text-[8px] font-bold pt-1">
                  --------------------------------
                </p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* OPTION 2: 3-INCH (80MM PAPER) DESKTOP THERMAL POS FORMAT       */}
          {/* ============================================================== */}
          {printMode === 'thermal_80' && (
            <div
              id="printable-thermal-80-receipt"
              style={{ width: '76mm', maxWidth: '76mm' }}
              className="bg-white p-3 shadow-xl border border-gray-400 font-mono text-[12px] text-black font-bold leading-tight print:shadow-none print:border-none print:w-[76mm] print:max-w-[76mm] print:p-0"
            >
              {/* Store Header */}
              <div className="text-center space-y-1 pb-2 border-b-2 border-black">
                {showLogoOnReceipt && (
                  <div className="flex justify-center mb-1.5">
                    <img
                      src={settings?.store_logo || '/logo.jpg'}
                      alt={settings?.store_name || 'GhartakKart'}
                      className="w-12 h-12 object-contain rounded-full border border-black p-0.5 mx-auto print:border-black"
                      style={{
                        filter: highContrast
                          ? 'grayscale(100%) contrast(160%) brightness(95%)'
                          : 'grayscale(100%)'
                      }}
                    />
                  </div>
                )}
                <h2 className="text-base font-black uppercase tracking-wider text-black">
                  *** {settings?.store_name || 'GHARTAKKART'} ***
                </h2>
                {settings?.gstin && !['na', 'n/a', 'none', ''].includes(settings.gstin.toLowerCase().trim()) && (
                  <p className="text-[10px] font-bold">GSTIN: {settings.gstin}</p>
                )}
              </div>

              {/* Order Metadata */}
              <div className="py-2 border-b-2 border-dashed border-black space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span>ORDER NO:</span>
                  <strong className="text-sm font-black">#{order.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span>DATE & TIME:</span>
                  <span>{new Date(order.created_at).toLocaleString('en-IN')}</span>
                </div>
                {order.delivery_slot && (
                  <div className="flex justify-between">
                    <span>SLOT:</span>
                    <span className="font-black">{order.delivery_slot}</span>
                  </div>
                )}
                {assignedRider && (
                  <div className="flex justify-between">
                    <span>RIDER:</span>
                    <span>{assignedRider.name}</span>
                  </div>
                )}
              </div>

              {/* Customer Details */}
              <div className="py-2 border-b-2 border-dashed border-black text-[11px] space-y-0.5">
                <div className="font-black uppercase text-[10px]">DELIVERY DESTINATION:</div>
                <p><strong>NAME:</strong> {order.customer_name}</p>
                <p><strong>PHONE:</strong> {order.customer_phone}</p>
                <p><strong>ADDRESS:</strong> {order.address?.line1}</p>
                {order.address?.landmark && <p><strong>LANDMARK:</strong> {order.address.landmark}</p>}
                <p><strong>CITY/PIN:</strong> {order.address?.city || 'Khair'} - {order.address?.pincode || '202138'}</p>
                <p><strong>DISTANCE:</strong> {order.distance_km || 1} km from Store</p>
                {order.address?.lat && order.address?.lng && (
                  <p className="text-[10px]">
                    📍 GPS: {Number(order.address.lat).toFixed(5)}, {Number(order.address.lng).toFixed(5)}
                  </p>
                )}
              </div>

              {/* Itemized Table */}
              <div className="py-2 border-b-2 border-black">
                <div className="flex justify-between text-[11px] font-black border-b-2 border-black pb-1">
                  <span>ITEM / QTY</span>
                  <span>RATE</span>
                  <span>TOTAL</span>
                </div>
                <div className="py-1 space-y-1">
                  {(order.items || []).map((it, idx) => (
                    <div key={idx} className="pt-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="font-black truncate max-w-[190px]">
                          {it.qty}x {it.name}
                        </span>
                        <span>₹{it.price}</span>
                        <strong className="text-right">₹{it.price * it.qty}</strong>
                      </div>
                      <span className="text-[10px]">({it.unit})</span>
                    </div>
                  ))}
                  {order.milestone_gift && (
                    <div className="pt-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="font-black truncate max-w-[190px]">
                          🎁 1x {order.milestone_gift.name}
                        </span>
                        <span>FREE</span>
                        <strong className="text-right">₹0</strong>
                      </div>
                      <span className="text-[9px] font-black">
                        (FREE GIFT - ₹{order.milestone_gift.tier_amount}+ Offer • {order.milestone_gift.unit})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculation */}
              <div className="py-2 border-b-2 border-dashed border-black space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>ITEMS SUBTOTAL:</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>DELIVERY FEE ({order.distance_km} km):</span>
                  <span>{order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between">
                    <span>DISCOUNT ({order.coupon_code}):</span>
                    <span>-₹{order.discount}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-b-2 border-black py-1 my-1 text-sm font-black">
                  <span>NET PAYABLE:</span>
                  <span>₹{order.total}</span>
                </div>
                <div className="flex justify-between text-[10px] pt-0.5">
                  <span>PAYMENT MODE:</span>
                  <span className="font-black">{order.payment_method || 'UPI'} ({order.payment_status || 'Paid'})</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-3 space-y-1 text-[10px]">
                <div className="font-mono text-center tracking-widest font-black py-1">
                  *GK-{order.id}*
                </div>
                <p className="font-black uppercase">
                  {settings?.receipt_footer_msg || '*** THANK YOU FOR SHOPPING LOCAL ***'}
                </p>
                <p className="text-[9px] font-bold">Printed via GhartakKart Thermal POS Engine</p>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* OPTION 3: FULL A4 TAX INVOICE FORMAT                           */}
          {/* ============================================================== */}
          {printMode === 'standard' && (
            <div
              id="printable-a4-invoice"
              className="w-full max-w-2xl bg-white p-6 sm:p-8 shadow-xl border border-gray-200 text-xs text-gray-800 print:shadow-none print:border-none print:w-full print:p-2"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-brand-600 pb-4">
                <div className="flex items-center gap-3">
                  {showLogoOnReceipt && (
                    <img
                      src={settings?.store_logo || '/logo.jpg'}
                      alt={settings?.store_name || 'GhartakKart'}
                      className="w-14 h-14 rounded-2xl object-cover border border-gray-200 shadow-sm"
                    />
                  )}
                  <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">
                      {settings?.store_name || 'GhartakKart Khair Store'}
                    </h1>
                  </div>
                </div>

                <div className="text-right text-[10px] space-y-0.5">
                  <span className="font-extrabold text-xs text-gray-900 block">RETAIL ORDER SLIP</span>
                  <p>Order No: <strong className="text-gray-900">ORD-{order.id}</strong></p>
                  <p>Order Date: {new Date(order.created_at).toLocaleString()}</p>
                  {settings?.gstin && !['na', 'n/a', 'none', ''].includes(settings.gstin.toLowerCase().trim()) && (
                    <p>GSTIN: <strong className="text-gray-900">{settings.gstin}</strong></p>
                  )}
                  {settings?.fssai_license && !['na', 'n/a', 'none', ''].includes(settings.fssai_license.toLowerCase().trim()) && (
                    <p>FSSAI: <strong className="text-gray-900">{settings.fssai_license}</strong></p>
                  )}
                </div>
              </div>

              {/* Customer & Location Details */}
              <div className="grid grid-cols-2 gap-4 py-4 border-b border-gray-200 text-xs">
                <div>
                  <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider block mb-1">
                    Delivered To:
                  </span>
                  <p className="font-extrabold text-sm text-gray-900">{order.customer_name}</p>
                  <p className="text-gray-700">{order.customer_phone}</p>
                  <p className="text-gray-600 mt-0.5">{order.address?.line1}</p>
                  {order.address?.landmark && <p className="text-gray-500">Landmark: {order.address.landmark}</p>}
                  <p className="text-gray-500">{order.address?.city || 'Khair'} - {order.address?.pincode || '202138'}</p>
                  <p className="text-[10px] text-emerald-800 font-mono mt-1 font-semibold">
                    📍 GPS: {order.address?.lat ? Number(order.address?.lat).toFixed(5) : 'N/A'}, {order.address?.lng ? Number(order.address?.lng).toFixed(5) : 'N/A'}
                  </p>
                  {order.address?.maps_url && (
                    <a
                      href={order.address.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-brand-700 underline font-bold print:text-black block mt-0.5"
                    >
                      🔗 Google Maps: {order.address.maps_url}
                    </a>
                  )}
                </div>

                <div className="text-right space-y-1">
                  <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider block mb-1">
                    Delivery Details:
                  </span>
                  <p>Distance from Hub: <strong className="text-gray-900">{order.distance_km} km</strong></p>
                  {order.delivery_slot && (
                    <p>Delivery Slot: <strong className="text-brand-700">{order.delivery_slot}</strong></p>
                  )}
                  <p>Payment Mode: <strong className="text-gray-900">{order.payment_method}</strong></p>
                  <p>Payment Status: <strong className="text-emerald-700 font-bold">{order.payment_status}</strong></p>
                  {order.razorpay_payment_id && (
                    <p>Razorpay ID: <strong className="font-mono text-gray-900">{order.razorpay_payment_id}</strong></p>
                  )}
                  <p>Order Status: <strong className="text-gray-900">{order.order_status}</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="mt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-gray-200 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                      <th className="py-2">#</th>
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">Unit</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Price</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(order.items || []).map((it, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 text-gray-400">{idx + 1}</td>
                        <td className="py-2 font-bold text-gray-900">{it.name}</td>
                        <td className="py-2 text-center text-gray-500">{it.unit}</td>
                        <td className="py-2 text-center font-bold">{it.qty}</td>
                        <td className="py-2 text-right text-gray-600">₹{it.price}</td>
                        <td className="py-2 text-right font-extrabold text-gray-900">₹{it.price * it.qty}</td>
                      </tr>
                    ))}
                    {order.milestone_gift && (
                      <tr className="bg-emerald-50/70">
                        <td className="py-2 text-emerald-700 font-black">🎁</td>
                        <td className="py-2 font-black text-emerald-950">
                          {order.milestone_gift.name}{' '}
                          <span className="text-[10px] font-bold text-emerald-700">
                            (FREE GIFT — ₹{order.milestone_gift.tier_amount}+ Offer)
                          </span>
                        </td>
                        <td className="py-2 text-center text-emerald-800 font-semibold">{order.milestone_gift.unit}</td>
                        <td className="py-2 text-center font-black text-emerald-900">1</td>
                        <td className="py-2 text-right text-emerald-700 font-bold">FREE</td>
                        <td className="py-2 text-right font-black text-emerald-700">₹0</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-4 pt-3 border-t-2 border-gray-200 flex justify-end">
                <div className="w-64 space-y-1.5 text-right">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Items Subtotal:</span>
                    <span className="font-semibold">₹{order.subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee ({order.distance_km} km):</span>
                    <span className="font-semibold">{order.delivery_fee === 0 ? 'FREE' : `₹${order.delivery_fee}`}</span>
                  </div>
                  {order.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Coupon ({order.coupon_code}):</span>
                      <span>-₹{order.discount}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-300 flex justify-between text-sm font-black text-gray-900">
                    <span>Grand Total:</span>
                    <span className="text-base text-brand-700">₹{order.total}</span>
                  </div>
                </div>
              </div>

              {order.admin_remark && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                  <span className="font-bold">Store Admin Remark: </span>
                  <span>{order.admin_remark}</span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-500 space-y-1">
                <p className="font-bold text-gray-700">This is a computer generated invoice and requires no physical signature.</p>
                <p>For customer care, email {settings?.support_email || 'support@ghartakkart.com'} or call {settings?.support_phone || '+91 7017675784'}.</p>
                <p className="text-emerald-700 font-semibold">{settings?.receipt_footer_msg || 'Thank you for shopping local with GhartakKart!'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
