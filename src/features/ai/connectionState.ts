/**
 * In-memory AI connection state. Pure reducer so the privacy rules are unit-testable:
 * - Changing the provider or base URL clears the key, status, model list and consent.
 * - Changing the model clears the verified status (not the key).
 * - Nothing may be sent until the user has consented to the current destination.
 * This state is never written to storage; a reload starts from `initialConnection()`.
 */
import { validateEndpoint } from "./endpoint";
import { PROVIDERS, type ProviderId } from "./providers";

export type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "connected"; checkedAt: number; detail: string }
  | { kind: "error"; message: string };

export interface ConnectionState {
  provider: ProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  /** The exact base URL the user agreed to send requests to, or null. */
  consentFor: string | null;
  status: ConnectionStatus;
  models: string[] | null;
}

export type ConnectionAction =
  | { type: "provider"; provider: ProviderId }
  | { type: "baseUrl"; baseUrl: string }
  | { type: "model"; model: string }
  | { type: "apiKey"; apiKey: string }
  | { type: "consent"; value: boolean }
  | { type: "status"; status: ConnectionStatus }
  | { type: "models"; models: string[] | null }
  | { type: "clear" };

export function initialConnection(provider: ProviderId = "ollama"): ConnectionState {
  return {
    provider,
    baseUrl: PROVIDERS[provider].defaultBaseUrl,
    model: "",
    apiKey: "",
    consentFor: null,
    status: { kind: "idle" },
    models: null,
  };
}

const resetDestination = (s: ConnectionState): ConnectionState => ({
  ...s,
  apiKey: "",
  consentFor: null,
  status: { kind: "idle" },
  models: null,
});

export function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case "provider":
      if (action.provider === state.provider) return state;
      return { ...resetDestination(state), provider: action.provider, baseUrl: PROVIDERS[action.provider].defaultBaseUrl, model: "" };
    case "baseUrl":
      if (action.baseUrl === state.baseUrl) return state;
      return { ...resetDestination(state), baseUrl: action.baseUrl };
    case "model":
      if (action.model === state.model) return state;
      return { ...state, model: action.model, status: state.status.kind === "testing" ? state.status : { kind: "idle" } };
    case "apiKey":
      if (action.apiKey === state.apiKey) return state;
      return { ...state, apiKey: action.apiKey, status: state.status.kind === "testing" ? state.status : { kind: "idle" } };
    case "consent": {
      const v = validateEndpoint(state.baseUrl);
      return { ...state, consentFor: action.value && v.ok ? v.baseUrl : null };
    }
    case "status":
      return { ...state, status: action.status };
    case "models":
      return { ...state, models: action.models };
    case "clear":
      return initialConnection(state.provider);
  }
}

/** Why a request may not be sent yet, or null when it may. */
export function sendBlocker(state: ConnectionState, needModel = true): string | null {
  const v = validateEndpoint(state.baseUrl);
  if (!v.ok) return v.error;
  if (state.consentFor !== v.baseUrl) return `Confirm that AstraFocus may send requests to ${v.host}.`;
  if (PROVIDERS[state.provider].keyRequired && !state.apiKey.trim()) return "Enter your API key.";
  if (needModel && !state.model.trim()) return "Enter a model name.";
  return null;
}

export const isConnected = (s: ConnectionState) => s.status.kind === "connected" && sendBlocker(s) === null;
