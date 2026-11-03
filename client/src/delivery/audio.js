// Web Audio synthesizer for loud rider alerts and notifications
let audioCtx = null;
let currentAlarmInterval = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playOrderAlert() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Trigger mobile vibration
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([500, 200, 500, 200, 800]);
  }

  // Synthesize loud urgent dual-tone delivery alert
  let count = 0;
  const playPulse = () => {
    if (count >= 5) {
      clearInterval(currentAlarmInterval);
      currentAlarmInterval = null;
      return;
    }
    count++;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.25);
      
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  };

  playPulse();
  if (currentAlarmInterval) clearInterval(currentAlarmInterval);
  currentAlarmInterval = setInterval(playPulse, 400);
}

export function stopOrderAlert() {
  if (currentAlarmInterval) {
    clearInterval(currentAlarmInterval);
    currentAlarmInterval = null;
  }
}

export function playAcceptChime() {
  stopOrderAlert();
  const ctx = getAudioContext();
  if (!ctx) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([100, 50, 150]);
  }

  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = ctx.currentTime + (idx * 0.08);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    } catch (e) {}
  });
}

export function playDeliveredChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([150, 100, 200, 100, 300]);
  }

  const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
  notes.forEach((freq, idx) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const startTime = ctx.currentTime + (idx * 0.1);
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    } catch (e) {}
  });
}

export function playSosAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([1000, 300, 1000, 300, 1000]);
  }

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.5);
    osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 1.0);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.1);
  } catch (e) {}
}
