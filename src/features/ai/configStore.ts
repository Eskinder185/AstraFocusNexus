/**
 * Remembers NON-SECRET AI preferences, and only when the user opts in
 * ("Remember these settings on this device"): provider, base URL and model name.
 *
 * - API keys are never stored (they stay in memory; see AIConnectionProvider).
 * - Permission to send requests is never stored: after a reload the user must allow the
 *   destination again and run a check before anything is sent.
 * - There is no automatic request on page load.
 */
import { validateEndpoint } from "./endpoint";
import { PROVIDERS, type ProviderId } from "./providers";

export const AI_CONFIG_KEY = "astra.ai.config.v1";

export interface SavedAIConfig {
  v: 2;
  provider: ProviderId;
  baseUrl: string;
  model: string;
}

export function loadAIConfig(): SavedAIConfig | null {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Omit<Partial<SavedAIConfig>, "v"> & { v?: number };
    if ((c.v !== 1 && c.v !== 2) || typeof c.provider !== "string" || !(c.provider in PROVIDERS) || typeof c.baseUrl !== "string") return null;
    const v = validateEndpoint(c.baseUrl);
    if (!v.ok) return null;
    return { v: 2, provider: c.provider as ProviderId, baseUrl: v.baseUrl, model: typeof c.model === "string" ? c.model.slice(0, 200) : "" };
  } catch {
    return null;
  }
}

/** Saves provider, URL and model. Only call this when the user has opted in. */
export function saveAIConfig(c: Omit<SavedAIConfig, "v">): void {
  try {
    const v = validateEndpoint(c.baseUrl);
    if (!v.ok) {
      localStorage.removeItem(AI_CONFIG_KEY);
      return;
    }
    const data: SavedAIConfig = { v: 2, provider: c.provider, baseUrl: v.baseUrl, model: c.model.trim().slice(0, 200) };
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable: settings just won't be remembered */
  }
}

export function clearAIConfig(): void {
  try {
    localStorage.removeItem(AI_CONFIG_KEY);
  } catch {
    /* ignore */
  }
}
