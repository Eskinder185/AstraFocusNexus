/**
 * Hardware profile for model recommendations.
 *
 * Browsers expose very little hardware information, and what they expose is often
 * rounded or masked. Every field records where its value came from so the UI can show
 * "Detected" vs "You entered", and nothing here pretends to know VRAM or disk space.
 *
 * What a browser can (sometimes) tell us:
 * - OS: navigator.userAgentData.platform (Chromium) or the user agent string.
 * - Logical CPU threads: navigator.hardwareConcurrency.
 * - RAM: navigator.deviceMemory (Chromium only, rounded and capped at 8 GB) — a lower bound.
 * - GPU name: WebGL WEBGL_debug_renderer_info (may be masked or generic).
 * Never available: CPU model name, VRAM, free disk space.
 */

export type OS = "windows" | "mac" | "linux" | "other";
export type GpuVendor = "nvidia" | "amd" | "intel" | "apple" | "other" | "none";
export type AiTask = "planning" | "writing" | "coding" | "long-documents";
export type Source = "detected" | "manual" | "unknown";

export interface Field<T> {
  value: T;
  source: Source;
  /** Short explanation of the detected value, e.g. "Browser reports at least 8 GB". */
  note?: string;
}

export interface HardwareProfile {
  os: Field<OS>;
  cpuModel: Field<string>;
  cpuThreads: Field<number | null>;
  ramGb: Field<number | null>;
  gpuVendor: Field<GpuVendor>;
  gpuModel: Field<string>;
  /** Dedicated VRAM in GB (discrete GPUs). Ignored for Apple Silicon (unified memory). */
  vramGb: Field<number | null>;
  diskFreeGb: Field<number | null>;
  tasks: AiTask[];
}

export const DEVICE_MEMORY_CAP_GB = 8;

export function emptyProfile(): HardwareProfile {
  const unknown = <T>(value: T): Field<T> => ({ value, source: "unknown" });
  return {
    os: unknown<OS>("other"),
    cpuModel: unknown(""),
    cpuThreads: unknown<number | null>(null),
    ramGb: unknown<number | null>(null),
    gpuVendor: unknown<GpuVendor>("none"),
    gpuModel: unknown(""),
    vramGb: unknown<number | null>(null),
    diskFreeGb: unknown<number | null>(null),
    tasks: ["planning"],
  };
}

export function osFromPlatform(platform: string): OS {
  const p = platform.toLowerCase();
  if (/win/.test(p)) return "windows";
  if (/mac|iphone|ipad|darwin/.test(p)) return "mac";
  if (/linux|x11|cros|android/.test(p)) return /android/.test(p) ? "other" : "linux";
  return "other";
}

/**
 * Parse a WebGL renderer string, e.g.
 *   "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)"
 *   "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"
 *   "Mesa Intel(R) UHD Graphics 620 (KBL GT2)"
 * Software renderers (SwiftShader, llvmpipe) mean "no usable GPU information".
 */
export function parseRenderer(renderer: string): { vendor: GpuVendor; model: string } | null {
  const r = renderer.trim();
  if (!r || /swiftshader|llvmpipe|software|basic render/i.test(r)) return null;
  let model = r;
  const angle = /^ANGLE \(([^,]+),\s*(.+?)(?:,\s*[^,]*\))?$/i.exec(r);
  if (angle) model = angle[2];
  model = model
    .replace(/ANGLE Metal Renderer:\s*/i, "")
    .replace(/\s*\(0x[0-9a-f]+\)/gi, "")
    .replace(/\s+Direct3D.*$/i, "")
    .replace(/\s+vs_\d.*$/i, "")
    .replace(/,\s*Unspecified Version\)?$/i, "")
    .replace(/\s*\/PCIe.*$/i, "")
    .trim();
  const all = `${r} ${model}`.toLowerCase();
  const vendor: GpuVendor = /nvidia|geforce|quadro|rtx|gtx/.test(all)
    ? "nvidia"
    : /amd|radeon|ati\b/.test(all)
      ? "amd"
      : /apple|\bm[1-9]\b/.test(all)
        ? "apple"
        : /intel|iris|uhd graphics/.test(all)
          ? "intel"
          : "other";
  if (/^apple gpu$/i.test(model)) model = "Apple GPU";
  return { vendor, model };
}

export interface BrowserSignals {
  platform?: string;
  userAgent?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  webglRenderer?: string;
}

/** Read what this browser exposes. Each value is optional; failures are ignored. */
export function readBrowserSignals(): BrowserSignals {
  const signals: BrowserSignals = {};
  try {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string }; deviceMemory?: number };
    signals.platform = nav.userAgentData?.platform || undefined;
    signals.userAgent = nav.userAgent;
    signals.hardwareConcurrency = nav.hardwareConcurrency || undefined;
    signals.deviceMemory = typeof nav.deviceMemory === "number" ? nav.deviceMemory : undefined;
  } catch {
    /* ignore */
  }
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    if (gl && ext) signals.webglRenderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    /* ignore */
  }
  return signals;
}

/** Fill a profile from browser signals. Manual values already in `base` are kept. */
export function applySignals(base: HardwareProfile, s: BrowserSignals): HardwareProfile {
  const p = { ...base };
  const keep = (f: Field<unknown>) => f.source === "manual";
  const platform = s.platform || s.userAgent || "";
  if (!keep(p.os) && platform) {
    const os = osFromPlatform(platform);
    if (os !== "other") p.os = { value: os, source: "detected", note: s.platform ? "From your browser’s platform" : "From your browser’s user agent" };
  }
  if (!keep(p.cpuThreads) && s.hardwareConcurrency) {
    p.cpuThreads = { value: s.hardwareConcurrency, source: "detected", note: "Logical threads reported by the browser" };
  }
  if (!keep(p.ramGb) && s.deviceMemory) {
    const capped = s.deviceMemory >= DEVICE_MEMORY_CAP_GB;
    p.ramGb = {
      value: s.deviceMemory,
      source: "detected",
      note: capped ? `Browser reports at least ${DEVICE_MEMORY_CAP_GB} GB (it never reports more). Enter your real amount for better advice.` : "Approximate value reported by the browser",
    };
  }
  if (!keep(p.gpuVendor) && s.webglRenderer) {
    const gpu = parseRenderer(s.webglRenderer);
    if (gpu) {
      p.gpuVendor = { value: gpu.vendor, source: "detected", note: "From the browser’s graphics renderer" };
      if (!keep(p.gpuModel)) p.gpuModel = { value: gpu.model, source: "detected", note: "May be generic or hidden by your browser" };
    }
  }
  return p;
}
