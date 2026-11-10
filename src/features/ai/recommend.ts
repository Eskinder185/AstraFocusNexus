/**
 * Model recommendations from a hardware profile.
 *
 * Everything here is an estimate. Download sizes come from ollama.com/library (checked
 * Nov 2026, default Q4_K_M builds). Memory needs are approximated as
 *   weights (download size × weightOverhead) + KV cache (paramsB × kvGbPerBParam per 4K tokens) + runtimeGb
 * and compared with a memory budget for the device. Real speed depends on drivers,
 * other apps and settings, so the UI never promises performance.
 */
import type { AiTask, GpuVendor, HardwareProfile } from "./hardware";

export interface CatalogModel {
  /** Exact `ollama pull` tag. */
  tag: string;
  family: string;
  paramsB: number;
  downloadGb: number;
  contextK: number;
  note: string;
}

export const CATALOG: Record<"general" | "longContext" | "coding", CatalogModel[]> = {
  general: [
    { tag: "llama3.2:1b", family: "Llama 3.2", paramsB: 1.2, downloadGb: 1.3, contextK: 128, note: "Very small and quick. Fine for short, simple requests." },
    { tag: "qwen3:4b", family: "Qwen 3", paramsB: 4, downloadGb: 2.5, contextK: 256, note: "Small but capable. Good at following structured instructions." },
    { tag: "qwen3:8b", family: "Qwen 3", paramsB: 8, downloadGb: 5.2, contextK: 40, note: "A strong all-rounder for planning and writing." },
    { tag: "qwen3:14b", family: "Qwen 3", paramsB: 14, downloadGb: 9.3, contextK: 40, note: "Noticeably better reasoning; needs a solid GPU." },
    { tag: "qwen3:32b", family: "Qwen 3", paramsB: 32, downloadGb: 20, contextK: 40, note: "High quality; needs a high-end GPU or lots of unified memory." },
  ],
  longContext: [
    { tag: "gemma3:1b", family: "Gemma 3", paramsB: 1, downloadGb: 0.8, contextK: 32, note: "Tiny; limited with long text." },
    { tag: "gemma3:4b", family: "Gemma 3", paramsB: 4, downloadGb: 3.4, contextK: 128, note: "Long context window in a small model." },
    { tag: "gemma3:12b", family: "Gemma 3", paramsB: 12, downloadGb: 8.2, contextK: 128, note: "Good with long notes and documents." },
    { tag: "gemma3:27b", family: "Gemma 3", paramsB: 27, downloadGb: 17, contextK: 128, note: "Best of this family; needs plenty of memory." },
  ],
  coding: [
    { tag: "qwen2.5-coder:1.5b", family: "Qwen 2.5 Coder", paramsB: 1.5, downloadGb: 0.99, contextK: 32, note: "Quick code help on modest hardware." },
    { tag: "qwen2.5-coder:3b", family: "Qwen 2.5 Coder", paramsB: 3, downloadGb: 1.9, contextK: 32, note: "Small coding model." },
    { tag: "qwen2.5-coder:7b", family: "Qwen 2.5 Coder", paramsB: 7, downloadGb: 4.7, contextK: 32, note: "Popular coding model for everyday use." },
    { tag: "qwen2.5-coder:14b", family: "Qwen 2.5 Coder", paramsB: 14, downloadGb: 9.0, contextK: 32, note: "Stronger coding help; needs a good GPU." },
    { tag: "qwen2.5-coder:32b", family: "Qwen 2.5 Coder", paramsB: 32, downloadGb: 20, contextK: 32, note: "Top coding quality; high-end hardware." },
  ],
};

export const RULES = {
  /** Loaded weights take a bit more than the download. */
  weightOverhead: 1.15,
  /** Rough KV-cache size per billion parameters per 4K tokens of context (GB). */
  kvGbPerBParam: 0.05,
  runtimeGb: 0.5,
  /** Share of dedicated VRAM a model can use. */
  vramShare: 0.9,
  /** Share of unified memory macOS lets the GPU use (approximate). */
  unifiedShare: 0.65,
  /** Share of system RAM available for a model running on the CPU. */
  cpuShare: 0.6,
  /** Extra system RAM usable when a model spills over from VRAM. */
  spillShare: 0.5,
  /** Balanced tier leaves this much of the budget free. */
  balancedHeadroom: 0.7,
  /** On CPU-only machines larger models are impractically slow. */
  cpuMaxParamsB: 14,
  cpuBalancedMaxParamsB: 4,
  diskMarginGb: 2,
  assumedRamGb: 8,
  /** Ollama's default context is 4096 tokens (docs.ollama.com/faq). */
  contextTokens: { normal: 4096, long: 32768 },
};

export type Accel = "gpu" | "unified" | "partial" | "cpu";

export interface Fit {
  model: CatalogModel;
  memoryGb: number;
  accel: Accel | null;
  diskOk: boolean | null;
}

export interface Tier {
  id: "light" | "balanced" | "quality";
  label: string;
  fit: Fit;
  tradeoff: string;
}

export interface Recommendation {
  ladder: "general" | "longContext" | "coding";
  tiers: Tier[];
  budget: { primaryGb: number; kind: Accel; assumedRam: boolean };
  contextTokens: number;
  warnings: string[];
}

export function ladderFor(tasks: AiTask[]): Recommendation["ladder"] {
  if (tasks.includes("coding") && !tasks.some(t => t === "planning" || t === "writing")) return "coding";
  if (tasks.includes("long-documents")) return "longContext";
  return "general";
}

export function estimateMemoryGb(m: CatalogModel, contextTokens: number): number {
  const gb = m.downloadGb * RULES.weightOverhead + m.paramsB * RULES.kvGbPerBParam * (contextTokens / 4096) + RULES.runtimeGb;
  return Math.round(gb * 10) / 10;
}

function deviceKind(vendor: GpuVendor, vramGb: number | null): "discrete" | "unified" | "cpu" {
  if (vendor === "apple") return "unified";
  if ((vendor === "nvidia" || vendor === "amd") && vramGb && vramGb > 0) return "discrete";
  return "cpu";
}

export function recommend(profile: HardwareProfile): Recommendation {
  const ladderId = ladderFor(profile.tasks);
  const ladder = CATALOG[ladderId];
  const contextTokens = profile.tasks.includes("long-documents") ? RULES.contextTokens.long : RULES.contextTokens.normal;
  const warnings: string[] = [];
  const assumedRam = profile.ramGb.value == null;
  const ram = profile.ramGb.value ?? RULES.assumedRamGb;
  if (assumedRam) warnings.push(`We don’t know your RAM, so we assumed ${RULES.assumedRamGb} GB. Enter it for better advice.`);
  if (profile.ramGb.source === "detected" && ram >= 8) warnings.push("Your browser can only report up to 8 GB of RAM. If you have more, enter it.");
  const vendor = profile.gpuVendor.value;
  const vram = profile.vramGb.value;
  const kind = deviceKind(vendor, vram);
  if ((vendor === "nvidia" || vendor === "amd") && !vram) warnings.push("Enter your graphics card’s dedicated memory (VRAM) to get GPU-based advice. Until then we assume the CPU does the work.");
  if (vendor === "amd") warnings.push("Ollama’s AMD support depends on your card and driver (ROCm or Vulkan). Check docs.ollama.com/gpu.");
  if (vendor === "nvidia") warnings.push("Ollama needs an NVIDIA GPU with compute capability 5.0+ and a recent driver (docs.ollama.com/gpu).");

  const gpuBudget = kind === "discrete" ? (vram ?? 0) * RULES.vramShare : kind === "unified" ? ram * RULES.unifiedShare : 0;
  const cpuBudget = ram * RULES.cpuShare;
  const spillBudget = gpuBudget + ram * RULES.spillShare;
  const disk = profile.diskFreeGb.value;

  const fits: Fit[] = ladder.map(model => {
    const memoryGb = estimateMemoryGb(model, contextTokens);
    let accel: Accel | null = null;
    if (kind === "discrete") accel = memoryGb <= gpuBudget ? "gpu" : memoryGb <= spillBudget ? "partial" : null;
    else if (kind === "unified") accel = memoryGb <= gpuBudget ? "unified" : null;
    else accel = memoryGb <= cpuBudget && model.paramsB <= RULES.cpuMaxParamsB ? "cpu" : null;
    const diskOk = disk == null ? null : disk >= model.downloadGb + RULES.diskMarginGb;
    return { model, memoryGb, accel, diskOk };
  });

  const usable = fits.filter(f => f.accel && f.diskOk !== false);
  if (disk != null && fits.some(f => f.accel && f.diskOk === false)) warnings.push("Some models that would run are hidden because you don’t have enough free disk space.");
  const primaryGb = kind === "cpu" ? cpuBudget : gpuBudget;
  const budget = { primaryGb: Math.round(primaryGb * 10) / 10, kind: (kind === "discrete" ? "gpu" : kind === "unified" ? "unified" : "cpu") as Accel, assumedRam };
  if (!usable.length) {
    warnings.push("None of the suggested models is likely to run well on this computer. You can still try the smallest one, or use a cloud provider.");
    return { ladder: ladderId, tiers: [], budget, contextTokens, warnings };
  }

  const fast = usable.filter(f => f.accel !== "partial");
  const quality = (fast.length ? fast : usable).at(-1)!;
  const balancedPool = fast.filter(
    f => f.memoryGb <= primaryGb * RULES.balancedHeadroom && (kind !== "cpu" || f.model.paramsB <= RULES.cpuBalancedMaxParamsB)
  );
  let balanced = balancedPool.at(-1) ?? fast[0] ?? usable[0];
  const light = (fast[0] ?? usable[0]);
  if (balanced === quality && fast.length > 1) balanced = fast[fast.indexOf(quality) - 1];

  const order = [light, balanced, quality];
  const seen = new Set<string>();
  const tiers: Tier[] = [];
  const meta = {
    light: { label: "Lightweight", tradeoff: "Fastest and smallest download. Simpler answers; fine for short planning requests." },
    balanced: { label: "Balanced", tradeoff: "Good quality while leaving memory for your other apps. The best starting point for most people." },
    quality: { label: "Higher quality", tradeoff: "Best answers this computer can likely handle. Bigger download, slower replies, uses most of the available memory." },
  } as const;
  (["light", "balanced", "quality"] as const).forEach((id, i) => {
    const f = order[i];
    if (seen.has(f.model.tag)) return;
    seen.add(f.model.tag);
    tiers.push({ id, label: meta[id].label, fit: f, tradeoff: meta[id].tradeoff });
  });
  if (quality.accel === "partial") warnings.push("The largest option only fits by sharing work with the CPU, so it will be noticeably slower.");
  if (kind === "cpu") warnings.push("Without a supported GPU, models run on the CPU. Expect replies to take longer, especially with bigger models.");
  return { ladder: ladderId, tiers, budget, contextTokens, warnings };
}

export function accelLabel(a: Accel | null): string {
  switch (a) {
    case "gpu":
      return "Runs on your graphics card";
    case "unified":
      return "Runs on your Mac’s GPU (unified memory)";
    case "partial":
      return "Split between GPU and CPU (slower)";
    case "cpu":
      return "Runs on the CPU (slower)";
    default:
      return "Unlikely to fit";
  }
}
