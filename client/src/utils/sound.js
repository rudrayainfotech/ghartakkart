// Custom Order Alert Bell Sound (/order-alert.mp3) + Web Audio API fallback
let preloadedOrderBell = null;
let audioUnlocked = false;

export function unlockAudioContext() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    if (preloadedOrderBell) {
      preloadedOrderBell.muted = true;
      const p = preloadedOrderBell.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          preloadedOrderBell.pause();
          preloadedOrderBell.currentTime = 0;
          preloadedOrderBell.muted = false;
        }).catch(() => {
          preloadedOrderBell.muted = false;
        });
      } else {
        preloadedOrderBell.muted = false;
      }
    }
  } catch {}
}

if (typeof window !== 'undefined') {
  try {
    preloadedOrderBell = new Audio('/order-alert.mp3?v=2');
    preloadedOrderBell.preload = 'auto';
    preloadedOrderBell.volume = 1.0;

    window.addEventListener('click', unlockAudioContext, { once: true, passive: true });
    window.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
    window.addEventListener('keydown', unlockAudioContext, { once: true, passive: true });
  } catch {}
}

export function playChime(type = 'notification') {
  try {
    if (type === 'new_order') {
      // Vibrate mobile device if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([400, 200, 400, 200, 600]);
        } catch {}
      }

      // Play the custom uploaded order bell sound (/order-alert.mp3)
      try {
        const bell = new Audio('/order-alert.mp3?t=' + Date.now());
        bell.volume = 1.0;
        const playPromise = bell.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            if (preloadedOrderBell) {
              preloadedOrderBell.muted = false;
              preloadedOrderBell.currentTime = 0;
              preloadedOrderBell.play().catch(() => playSynthesizedBell());
            } else {
              playSynthesizedBell();
            }
          });
        }
        return;
      } catch {
        playSynthesizedBell();
        return;
      }
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // Pleasant triad chord for order placed
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5 + idx * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + 0.5 + idx * 0.08);
      });
    } else if (type === 'alert') {
      // Alert sound (e.g., order cancelled or payment alert)
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) {
    console.warn('Audio play failed:', e);
  }
}

function playSynthesizedBell() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6 bell
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 1.2);
  } catch {}
}
