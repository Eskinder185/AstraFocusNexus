/**
 * "Find AI on this device": checks well-known local ports, only when the user asks.
 * Requests are GETs to loopback addresses and carry no personal data or keys.
 *
 * A browser can't distinguish "nothing is running" from "something is running but
 * blocked this website (CORS)" — both surface as a network error — so a miss is
 * reported as "not reachable from this page", never as "not installed".
 */
import { AIError, requestJson, type Fetch, type ModelInfo } from "./client";
import { parseTags } from "./ollama";
import type { ProviderId } from "./providers";

export interface ScanTarget {
  id: string;
  label: string;
  provider: ProviderId;
  baseUrl: string;
  probePath: string;
}

export const SCAN_TARGETS: ScanTarget[] = [
  { id: "ollama", label: "Ollama", provider: "ollama", baseUrl: "http://127.0.0.1:11434", probePath: "/api/tags" },
  { id: "lmstudio", label: "LM Studio", provider: "lmstudio", baseUrl: "http://127.0.0.1:1234/v1", probePath: "/models" },
  { id: "llamacpp", label: "llama.cpp server or other OpenAI-compatible", provider: "custom", baseUrl: "http://127.0.0.1:8080/v1", probePath: "/models" },
];

export const SCAN_TIMEOUT_MS = 4000;

export type ScanResult =
  | { target: ScanTarget; status: "found"; models: ModelInfo[]; latencyMs: number }
  | { target: ScanTarget; status: "blocked"; message: string }
  | { target: ScanTarget; status: "unreachable" }
  | { target: ScanTarget; status: "error"; message: string };

export async function scanTarget(target: ScanTarget, fetchImpl: Fetch, signal?: AbortSignal): Promise<ScanResult> {
  const start = performance.now();
  try {
    const body = await requestJson(fetchImpl, `${target.baseUrl}${target.probePath}`, { method: "GET", apiKey: "", signal, timeoutMs: SCAN_TIMEOUT_MS });
    const models: ModelInfo[] =
      target.provider === "ollama"
        ? parseTags(body)
        : Array.isArray((body as { data?: unknown }).data)
          ? (body as { data: { id?: unknown }[] }).data.flatMap(m => (typeof m?.id === "string" ? [{ id: m.id }] : []))
          : [];
    return { target, status: "found", models, latencyMs: Math.round(performance.now() - start) };
  } catch (e) {
    if (e instanceof AIError) {
      if (e.kind === "network" || e.kind === "timeout") return { target, status: "unreachable" };
      if (e.kind === "forbidden") return { target, status: "blocked", message: "It answered but refused this website. Allow this site in its settings (CORS)." };
      if (e.kind === "cancelled") throw e;
      return { target, status: "error", message: e.message };
    }
    return { target, status: "error", message: "Unexpected response." };
  }
}

export function scanDevice(fetchImpl: Fetch = (...a) => fetch(...a), signal?: AbortSignal): Promise<ScanResult[]> {
  return Promise.all(SCAN_TARGETS.map(t => scanTarget(t, fetchImpl, signal)));
}
