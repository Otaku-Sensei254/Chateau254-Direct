// Web Audio API Synthesizer for Château254 Admin Notifications
let audioCtx = null;

export const unlockAudio = () => {
  try {
    if (!audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (err) {
    console.warn('AudioContext unlock failed:', err);
  }
};

// Play synthesized tones using frequency array and timing envelope
export const playTone = ({ notes = [587, 880], type = 'sine', duration = 0.22, interval = 0.12, volume = 0.15 }) => {
  try {
    unlockAudio();
    if (!audioCtx) return;

    notes.forEach((freq, idx) => {
      const startTime = audioCtx.currentTime + idx * interval;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      // Smooth attack and exponential decay envelope
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch (err) {
    console.warn('Notification sound play failed:', err);
  }
};

export const playSoundNotification = (eventName, data = {}) => {
  switch (eventName) {
    case 'order:created':
      // Melodic 2-tone chime up (D5 -> A5)
      playTone({ notes: [587.33, 880.0], type: 'triangle', duration: 0.28, interval: 0.14, volume: 0.18 });
      break;
    case 'order:delivered':
      // 3-tone ascending celebration chord (C5 -> E5 -> G5)
      playTone({ notes: [523.25, 659.25, 783.99], type: 'sine', duration: 0.26, interval: 0.1, volume: 0.15 });
      break;
    case 'booking:created':
      // Soft crystal glass bell (E5 -> A5)
      playTone({ notes: [659.25, 880.0], type: 'sine', duration: 0.35, interval: 0.15, volume: 0.16 });
      break;
    case 'booking:updated':
      // Gentle confirmation note (G5)
      playTone({ notes: [783.99], type: 'sine', duration: 0.2, interval: 0, volume: 0.12 });
      break;
    case 'test':
      // Gentle preview chime
      playTone({ notes: [523.25, 659.25], type: 'sine', duration: 0.2, interval: 0.1, volume: 0.14 });
      break;
    default:
      playTone({ notes: [587.33], duration: 0.15, volume: 0.1 });
  }
};
