"use client";

export function playUiTone(enabled: boolean, frequency = 520) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.095);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.1);
  oscillator.onended = () => void context.close();
}

export function pulseHaptic(duration = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(duration);
}
