import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Gift, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
import { playChime } from '../utils/sound.js';

export default function ScratchCard({ scratchCard, orderId, onScratch, isAlreadyScratched = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(isAlreadyScratched);
  const [scratchPercent, setScratchPercent] = useState(isAlreadyScratched ? 100 : 0);
  const [isDrawing, setIsDrawing] = useState(false);
  const isRevealedRef = useRef(isAlreadyScratched);

  const amount = scratchCard?.amount || 0;
  const billingAmount = scratchCard?.billing_amount || 0;

  useEffect(() => {
    if (isAlreadyScratched) {
      setIsRevealed(true);
      isRevealedRef.current = true;
      setScratchPercent(100);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw metallic gold/silver gradient scratch layer
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#D97706'); // amber-600
    grad.addColorStop(0.3, '#F59E0B'); // amber-500
    grad.addColorStop(0.5, '#FDE68A'); // amber-200 (shine)
    grad.addColorStop(0.7, '#F59E0B');
    grad.addColorStop(1, '#B45309'); // amber-700

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle pattern overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    for (let i = -width; i < width * 2; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 20, height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.stroke();
    }

    // Text on scratch surface
    ctx.fillStyle = '#78350F';
    ctx.font = 'bold 15px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪙 SCRATCH HERE', width / 2, height / 2 - 12);

    ctx.fillStyle = '#92400E';
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    ctx.fillText('Win Instant 1% Cashback', width / 2, height / 2 + 10);
  }, [isAlreadyScratched]);

  const handleReveal = () => {
    if (isRevealedRef.current) return;
    isRevealedRef.current = true;
    setIsRevealed(true);
    setScratchPercent(100);

    // Confetti & celebratory audio
    try {
      playChime('success');
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {}

    if (onScratch) {
      onScratch(scratchCard);
    }
  };

  const checkScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealedRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparentCount = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 4th pixel for high performance
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] < 128) {
          transparentCount += 4;
        }
      }

      const percent = Math.min(100, Math.round((transparentCount / totalPixels) * 100));
      setScratchPercent(percent);

      // Once 35% is cleared, auto-reveal completely!
      if (percent >= 35 && !isRevealedRef.current) {
        handleReveal();
      }
    } catch {}
  };

  const scratch = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas || isRevealedRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2, false);
    ctx.fill();

    checkScratchPercentage();
  };

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    scratch(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length > 0) {
      setIsDrawing(true);
      scratch(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDrawing || e.touches.length === 0) return;
    scratch(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  return (
    <div className="bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 p-1 rounded-3xl shadow-xl max-w-sm mx-auto select-none">
      <div className="bg-white rounded-[22px] p-4 text-center relative overflow-hidden border border-amber-200 shadow-inner">
        {/* Header Tag */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            <Sparkles className="w-3 h-3 text-amber-600" />
            1% Order Cashback
          </span>
          <span className="text-[10px] font-bold text-gray-500">
            Order #{orderId}
          </span>
        </div>

        {/* Scratch Card Interactive Area */}
        <div
          ref={containerRef}
          className="relative w-full h-44 rounded-2xl overflow-hidden shadow-md border-2 border-amber-300 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 flex flex-col items-center justify-center text-white"
        >
          {/* UNDERLYING REWARD CONTENT */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-300 mb-1 shadow-inner">
              <Gift className="w-7 h-7 animate-bounce" />
            </div>
            <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider">
              🎉 Cashback Won!
            </span>
            <div className="text-3xl font-black text-amber-300 drop-shadow-sm flex items-center justify-center gap-0.5">
              <span>₹{amount}</span>
            </div>
            <p className="text-[11px] font-semibold text-emerald-100 mt-0.5">
              1% Cashback on ₹{billingAmount} billing
            </p>
            <div className="inline-flex items-center gap-1 mt-1 text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full text-white">
              <Wallet className="w-3 h-3" />
              <span>Credited directly to Wallet</span>
            </div>
          </div>

          {/* OVERLYING CANVAS (CAN BE SCRATCHED) */}
          {!isRevealed && (
            <canvas
              ref={canvasRef}
              width={320}
              height={176}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute inset-0 w-full h-full cursor-crosshair z-10 touch-none transition-opacity duration-300"
            />
          )}

          {/* Revealed Overlay Glow */}
          {isRevealed && (
            <div className="absolute top-2 right-2 z-20">
              <span className="inline-flex items-center gap-1 bg-white text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Claimed
              </span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-3">
          {!isRevealed ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-gray-500 font-semibold text-left">
                Scratch card with finger or mouse
              </p>
              <button
                type="button"
                onClick={handleReveal}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1"
              >
                <span>Tap to Reveal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>₹{amount} Instant Cashback credited to your Customer Wallet!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
