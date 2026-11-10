/**
 * Remembers NON-SECRET AI settings for servers on this device only:
 * provider, local base URL, default model and the destination the user approved.
 *
 * - API keys are never stored (they stay in memory; see AIConnectionProvider).
 * - Remote endpoints (cloud providers, other machines) are not remembered at all, so a
 *   reload never reconnects to a remote service without the user setting it up again.
 * - A remembered setup is shown as "not checked yet" until the user tests it; there is
 *   no automatic request on page load.
 */
import { validateEndpoint } from "./endpoint";
import { PROVIDERS, type ProviderId } from "./providers";

export const AI_CONFIG_KEY = "astra.ai.config.v1";

export interface SavedAIConfig {
  v: 1;
  provider: ProviderId;
  baseUrl: string;
  model: string;
  consentFor: string | null;
}

export function loadAIConfig(): SavedAIConfig | null {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<SavedAIConfig>;
    if (c.v !== 1 || typeof c.provider !== "string" || !(c.provider in PROVIDERS) || typeof c.baseUrl !== "string") return null;
    const v = validateEndpoint(c.baseUrl);
    if (!v.ok || !v.isLoopback) return null;
    return {
      v: 1,
      provider: c.provider as ProviderId,
      baseUrl: v.baseUrl,
      model: typeof c.model === "string" ? c.model.slice(0, 200) : "",
      consentFor: c.consentFor === v.baseUrl ? v.baseUrl : null,
    };
  } catch {
    return null;
  }
}

/** Saves when the endpoint is on this device; otherwise removes any saved setup. */
export function saveAIConfig(c: Omit<SavedAIConfig, "v">): void {
  try {
    const v = validateEndpoint(c.baseUrl);
    if (!v.ok || !v.isLoopback) {
      localStorage.removeItem(AI_CONFIG_KEY);
      return;
    }
    const data: SavedAIConfig = { v: 1, provider: c.provider, baseUrl: v.baseUrl, model: c.model.trim(), consentFor: c.consentFor === v.baseUrl ? v.baseUrl : null };
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
