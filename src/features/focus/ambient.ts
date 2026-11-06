import { useSyncExternalStore } from "react";

/**
 * Ambient noise generated with the Web Audio API: no audio files, no licensing,
 * nothing downloaded. Only ever starts from an explicit user action.
 */
export type NoiseKind = "white" | "pink" | "brown";

interface State {
  kind: NoiseKind | null;
  volume: number;
}

const VOLUME_KEY = "astra.focus.ambientVolume";

let state: State = { kind: null, volume: readVolume() };
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
const buffers = new Map<NoiseKind, AudioBuffer>();

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) && v > 0 && v <= 1 ? v : 0.35;
  } catch {
    return 0.35;
  }
}

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach(l => l());
}

function makeBuffer(ac: AudioContext, kind: NoiseKind): AudioBuffer {
  const seconds = 4;
  const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
  const d = buf.getChannelData(0);
  if (kind === "white") {
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  } else if (kind === "pink") {
    // Paul Kellet's refined pink-noise filter.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }
  // Short crossfade at the loop point to avoid a click.
  const fade = Math.floor(ac.sampleRate * 0.05);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    d[i] = d[i] * t + d[d.length - fade + i] * (1 - t);
  }
  return buf;
}

export function playNoise(kind: NoiseKind) {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    gain = ctx.createGain();
    gain.connect(ctx.destination);
  }
  void ctx.resume();
  source?.stop();
  let buf = buffers.get(kind);
  if (!buf) {
    buf = makeBuffer(ctx, kind);
    buffers.set(kind, buf);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(gain!);
  gain!.gain.cancelScheduledValues(ctx.currentTime);
  gain!.gain.setValueAtTime(0, ctx.currentTime);
  gain!.gain.linearRampToValueAtTime(state.volume, ctx.currentTime + 0.6);
  src.start();
  source = src;
  emit({ kind });
}

export function stopNoise() {
  if (ctx && gain && source) {
    const s = source;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    window.setTimeout(() => s.stop(), 320);
  }
  source = null;
  emit({ kind: null });
}

export function setNoiseVolume(volume: number) {
  const v = Math.max(0.01, Math.min(1, volume));
  if (ctx && gain && source) gain.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {
    /* ignore */
  }
  emit({ volume: v });
}

export function useAmbient(): State {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
}
