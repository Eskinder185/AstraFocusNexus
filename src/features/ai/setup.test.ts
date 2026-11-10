import { beforeEach, describe, expect, it } from "vitest";
import { AI_CONFIG_KEY, clearAIConfig, loadAIConfig, saveAIConfig } from "./configStore";
import { applySignals, emptyProfile, osFromPlatform, parseRenderer, type HardwareProfile } from "./hardware";
import { isLocalOrigin, modelSteps, ollamaInstallSteps, ollamaOriginSteps, ollamaServerSteps } from "./installGuide";
import { CATALOG, estimateMemoryGb, ladderFor, recommend } from "./recommend";
import { installMemoryStorage } from "./testUtils";

const manual = <T,>(value: T) => ({ value, source: "manual" as const });
function profile(p: Partial<{ ram: number | null; vendor: HardwareProfile["gpuVendor"]["value"]; vram: number | null; disk: number | null; tasks: HardwareProfile["tasks"] }>): HardwareProfile {
  const base = emptyProfile();
  return {
    ...base,
    ramGb: p.ram === undefined ? base.ramGb : manual(p.ram),
    gpuVendor: p.vendor ? manual(p.vendor) : base.gpuVendor,
    vramGb: p.vram === undefined ? base.vramGb : manual(p.vram),
    diskFreeGb: p.disk === undefined ? base.diskFreeGb : manual(p.disk),
    tasks: p.tasks ?? ["planning"],
  };
}
const tags = (r: ReturnType<typeof recommend>) => r.tiers.map(t => `${t.id}:${t.fit.model.tag}`);

describe("hardware detection", () => {
  it("parses common WebGL renderer strings", () => {
    expect(parseRenderer("ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)")).toEqual({ vendor: "nvidia", model: "NVIDIA GeForce RTX 3070" });
    expect(parseRenderer("ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)")).toEqual({ vendor: "apple", model: "Apple M2 Pro" });
    expect(parseRenderer("ANGLE (AMD, AMD Radeon RX 7800 XT (0x0000747E) Direct3D11 vs_5_0 ps_5_0, D3D11)")?.vendor).toBe("amd");
    expect(parseRenderer("Mesa Intel(R) UHD Graphics 620 (KBL GT2)")?.vendor).toBe("intel");
    expect(parseRenderer("Google SwiftShader")).toBeNull();
    expect(parseRenderer("")).toBeNull();
  });
  it("maps platforms to an OS", () => {
    expect(osFromPlatform("Windows")).toBe("windows");
    expect(osFromPlatform("macOS")).toBe("mac");
    expect(osFromPlatform("Linux x86_64")).toBe("linux");
    expect(osFromPlatform("Android")).toBe("other");
  });
  it("marks detected values, flags the 8 GB deviceMemory cap, and never overwrites manual input", () => {
    const p = applySignals(emptyProfile(), { platform: "Windows", hardwareConcurrency: 16, deviceMemory: 8, webglRenderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)" });
    expect(p.os).toMatchObject({ value: "windows", source: "detected" });
    expect(p.cpuThreads).toMatchObject({ value: 16, source: "detected" });
    expect(p.ramGb.source).toBe("detected");
    expect(p.ramGb.note).toMatch(/at least 8 GB/);
    expect(p.gpuVendor).toMatchObject({ value: "nvidia", source: "detected" });
    expect(p.vramGb.source).toBe("unknown"); // browsers can't see VRAM
    expect(p.diskFreeGb.source).toBe("unknown");
    expect(p.cpuModel.source).toBe("unknown");
    const withManual = applySignals({ ...emptyProfile(), ramGb: manual(32) }, { deviceMemory: 8 });
    expect(withManual.ramGb).toEqual({ value: 32, source: "manual" });
  });
});

describe("recommendations", () => {
  it("picks the ladder from intended tasks", () => {
    expect(ladderFor(["planning"])).toBe("general");
    expect(ladderFor(["coding"])).toBe("coding");
    expect(ladderFor(["planning", "coding"])).toBe("general");
    expect(ladderFor(["long-documents"])).toBe("longContext");
  });
  it("estimates more memory for longer context", () => {
    const m = CATALOG.general[2];
    expect(estimateMemoryGb(m, 32768)).toBeGreaterThan(estimateMemoryGb(m, 4096));
    expect(estimateMemoryGb(m, 4096)).toBeGreaterThan(m.downloadGb);
  });
  it("8 GB NVIDIA card: three distinct tiers, all on the GPU", () => {
    const r = recommend(profile({ ram: 32, vendor: "nvidia", vram: 8 }));
    expect(tags(r)).toEqual(["light:llama3.2:1b", "balanced:qwen3:4b", "quality:qwen3:8b"]);
    expect(r.tiers.every(t => t.fit.accel === "gpu")).toBe(true);
  });
  it("Apple Silicon 16 GB uses unified memory", () => {
    const r = recommend(profile({ ram: 16, vendor: "apple" }));
    expect(r.budget.kind).toBe("unified");
    expect(r.tiers.at(-1)!.fit.model.tag).toBe("qwen3:8b");
  });
  it("CPU-only machines get conservative picks and a speed warning", () => {
    const r = recommend(profile({ ram: 16, vendor: "intel" }));
    expect(r.budget.kind).toBe("cpu");
    expect(r.tiers.find(t => t.id === "balanced")!.fit.model.paramsB).toBeLessThanOrEqual(4);
    expect(r.warnings.join(" ")).toMatch(/CPU/);
  });
  it("a GPU without VRAM entered is treated as CPU and asks for VRAM", () => {
    const r = recommend(profile({ ram: 16, vendor: "nvidia", vram: null }));
    expect(r.budget.kind).toBe("cpu");
    expect(r.warnings.join(" ")).toMatch(/VRAM/);
  });
  it("assumes 8 GB when RAM is unknown, and says so", () => {
    const r = recommend(profile({}));
    expect(r.budget.assumedRam).toBe(true);
    expect(r.warnings[0]).toMatch(/assumed 8 GB/);
  });
  it("returns no tiers when nothing fits", () => {
    const r = recommend(profile({ ram: 2 }));
    expect(r.tiers).toEqual([]);
    expect(r.warnings.join(" ")).toMatch(/None of the suggested models/);
  });
  it("filters out models that don't fit on disk", () => {
    const r = recommend(profile({ ram: 32, vendor: "nvidia", vram: 24, disk: 5 }));
    expect(r.tiers.every(t => t.fit.model.downloadGb + 2 <= 5)).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/disk space/);
  });
  it("uses coding models for coding-only use", () => {
    const r = recommend(profile({ ram: 32, vendor: "nvidia", vram: 12, tasks: ["coding"] }));
    expect(r.tiers.every(t => t.fit.model.tag.startsWith("qwen2.5-coder:"))).toBe(true);
  });
});

describe("installation guide", () => {
  it("links to the official installers and commands per OS", () => {
    expect(ollamaInstallSteps("windows")[0].link?.href).toBe("https://ollama.com/download/OllamaSetup.exe");
    expect(ollamaInstallSteps("mac")[0].link?.href).toBe("https://ollama.com/download/Ollama.dmg");
    expect(ollamaInstallSteps("linux")[0].commands?.[0].text).toBe("curl -fsSL https://ollama.com/install.sh | sh");
    for (const os of ["windows", "mac", "linux"] as const) {
      for (const s of ollamaInstallSteps(os)) if (s.link) expect(new URL(s.link.href).protocol).toBe("https:");
    }
  });
  it("explains start/stop per OS", () => {
    expect(ollamaServerSteps("linux").flatMap(s => s.commands ?? []).map(c => c.text)).toEqual(["sudo systemctl start ollama", "sudo systemctl stop ollama", "systemctl status ollama"]);
    expect(ollamaServerSteps("windows").some(s => /system tray/.test(s.body))).toBe(true);
  });
  it("puts the chosen model into pull commands", () => {
    expect(modelSteps("qwen3:8b")[0].commands?.[0].text).toBe("ollama pull qwen3:8b");
  });
  it("uses the current origin for OLLAMA_ORIGINS on every OS", () => {
    const o = "https://eskinder185.github.io";
    const all = (os: "windows" | "mac" | "linux") => ollamaOriginSteps(os, o).flatMap(s => s.commands ?? []).map(c => c.text).join("\n");
    expect(all("windows")).toContain(`setx OLLAMA_ORIGINS "${o}"`);
    expect(all("mac")).toContain(`launchctl setenv OLLAMA_ORIGINS "${o}"`);
    expect(all("linux")).toContain(`Environment="OLLAMA_ORIGINS=${o}"`);
    for (const os of ["windows", "mac", "linux"] as const) expect(all(os)).not.toMatch(/OLLAMA_HOST|0\.0\.0\.0/);
  });
  it("knows when the page is already local", () => {
    expect(isLocalOrigin("http://localhost:5173")).toBe(true);
    expect(isLocalOrigin("http://127.0.0.1:4317")).toBe(true);
    expect(isLocalOrigin("https://eskinder185.github.io")).toBe(false);
  });
});

describe("config storage (opt-in)", () => {
  let store: Map<string, string>;
  beforeEach(() => {
    store = installMemoryStorage();
  });
  it("remembers provider, URL and model, never a permission or key", () => {
    saveAIConfig({ provider: "ollama", baseUrl: "http://127.0.0.1:11434/", model: "qwen3:8b", consentFor: "http://127.0.0.1:11434", apiKey: "sk-should-not-save" } as never);
    expect(loadAIConfig()).toEqual({ v: 2, provider: "ollama", baseUrl: "http://127.0.0.1:11434", model: "qwen3:8b" });
    expect(store.get(AI_CONFIG_KEY)).not.toMatch(/sk-should-not-save|consent/);
  });
  it("can remember a remote endpoint's address and model (non-secret) when opted in", () => {
    saveAIConfig({ provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt" });
    expect(loadAIConfig()).toMatchObject({ provider: "openai", baseUrl: "https://api.openai.com/v1" });
  });
  it("drops a permission saved by an older version", () => {
    store.set(AI_CONFIG_KEY, JSON.stringify({ v: 1, provider: "ollama", baseUrl: "http://127.0.0.1:11434", model: "x", consentFor: "http://127.0.0.1:11434" }));
    expect(loadAIConfig()).toEqual({ v: 2, provider: "ollama", baseUrl: "http://127.0.0.1:11434", model: "x" });
  });
  it("ignores tampered data on load", () => {
    store.set(AI_CONFIG_KEY, JSON.stringify({ v: 2, provider: "custom", baseUrl: "http://evil.example.com/v1", model: "x" }));
    expect(loadAIConfig()).toBeNull();
    store.set(AI_CONFIG_KEY, JSON.stringify({ v: 2, provider: "nope", baseUrl: "http://127.0.0.1:1" }));
    expect(loadAIConfig()).toBeNull();
    store.set(AI_CONFIG_KEY, "{not json");
    expect(loadAIConfig()).toBeNull();
  });
  it("clears", () => {
    saveAIConfig({ provider: "ollama", baseUrl: "http://127.0.0.1:11434", model: "m" });
    clearAIConfig();
    expect(store.size).toBe(0);
  });
});
