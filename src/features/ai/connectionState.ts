/**
 * AI connection state. Pure reducer so the privacy rules are unit-testable:
 * - Changing the provider or base URL clears the key, status, model list, diagnostics and consent.
 * - Changing the model clears the verified status and model details (not the key).
 * - Nothing may be sent until the user has consented to the current destination.
 * - "connected" is only ever set from a real, successful check in this session.
 * The API key and the permission are never persisted. If the user opts in (`remember`),
 * provider, URL and model are restored from configStore, always as "not checked yet".
 */
import type { ChatMetrics, ModelInfo } from "./client";
import { validateEndpoint } from "./endpoint";
import { PROVIDERS, type ProviderId } from "./providers";

export type ConnectionStatus =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "connected"; checkedAt: number; detail: string }
  | { kind: "error"; message: string };

export type DiagnosticId = "reach" | "model" | "details" | "inference";

export interface Diagnostic {
  id: DiagnosticId;
  label: string;
  state: "running" | "ok" | "fail" | "skipped";
  detail: string;
  ms?: number;
}

export interface InferenceResult {
  text: string;
  metrics: ChatMetrics;
  at: number;
}

export interface ConnectionState {
  provider: ProviderId;
  baseUrl: string;
  model: string;
  apiKey: string;
  /** The exact base URL the user agreed to send requests to, or null. */
  consentFor: string | null;
  status: ConnectionStatus;
  models: ModelInfo[] | null;
  /** Details of `model` from the server (capabilities, context length), when known. */
  modelDetails: ModelInfo | null;
  serverVersion: string | null;
  diagnostics: Diagnostic[];
  inference: InferenceResult | null;
  /** Settings were restored from a previous visit and haven't been checked this session. */
  restored: boolean;
  /** The user opted in to remembering provider, URL and model on this device. */
  remember: boolean;
}

export type ConnectionAction =
  | { type: "provider"; provider: ProviderId }
  | { type: "baseUrl"; baseUrl: string }
  | { type: "destination"; provider: ProviderId; baseUrl: string }
  | { type: "model"; model: string }
  | { type: "apiKey"; apiKey: string }
  | { type: "consent"; value: boolean }
  | { type: "status"; status: ConnectionStatus }
  | { type: "models"; models: ModelInfo[] | null }
  | { type: "modelDetails"; details: ModelInfo | null }
  | { type: "serverVersion"; version: string | null }
  | { type: "diagnostic"; diagnostic: Diagnostic }
  | { type: "resetDiagnostics" }
  | { type: "inference"; result: InferenceResult | null }
  | { type: "remember"; value: boolean }
  | { type: "disconnect" }
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
    modelDetails: null,
    serverVersion: null,
    diagnostics: [],
    inference: null,
    restored: false,
    remember: false,
  };
}

const resetDestination = (s: ConnectionState): ConnectionState => ({
  ...s,
  apiKey: "",
  consentFor: null,
  status: { kind: "idle" },
  models: null,
  modelDetails: null,
  serverVersion: null,
  diagnostics: [],
  inference: null,
  restored: false,
});

const unverified = (s: ConnectionState): ConnectionStatus => (s.status.kind === "testing" ? s.status : { kind: "idle" });

export function connectionReducer(state: ConnectionState, action: ConnectionAction): ConnectionState {
  switch (action.type) {
    case "provider":
      if (action.provider === state.provider) return state;
      return { ...resetDestination(state), provider: action.provider, baseUrl: PROVIDERS[action.provider].defaultBaseUrl, model: "" };
    case "baseUrl":
      if (action.baseUrl === state.baseUrl) return state;
      return { ...resetDestination(state), baseUrl: action.baseUrl };
    case "destination":
      if (action.provider === state.provider && action.baseUrl === state.baseUrl) return state;
      return { ...resetDestination(state), provider: action.provider, baseUrl: action.baseUrl, model: "" };
    case "model":
      if (action.model === state.model) return state;
      return { ...state, model: action.model, status: unverified(state), modelDetails: null, diagnostics: [], inference: null };
    case "apiKey":
      if (action.apiKey === state.apiKey) return state;
      return { ...state, apiKey: action.apiKey, status: unverified(state), diagnostics: [], inference: null };
    case "consent": {
      const v = validateEndpoint(state.baseUrl);
      const consentFor = action.value && v.ok ? v.baseUrl : null;
      return consentFor ? { ...state, consentFor } : { ...state, consentFor: null, status: unverified(state) };
    }
    case "status":
      return { ...state, status: action.status, restored: action.status.kind === "connected" ? false : state.restored };
    case "models":
      return { ...state, models: action.models };
    case "modelDetails":
      return { ...state, modelDetails: action.details };
    case "serverVersion":
      return { ...state, serverVersion: action.version };
    case "diagnostic": {
      const rest = state.diagnostics.filter(d => d.id !== action.diagnostic.id);
      const order: DiagnosticId[] = ["reach", "model", "details", "inference"];
      return { ...state, diagnostics: [...rest, action.diagnostic].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) };
    }
    case "resetDiagnostics":
      return { ...state, diagnostics: [], inference: null };
    case "inference":
      return { ...state, inference: action.result };
    case "remember":
      return { ...state, remember: action.value };
    case "disconnect":
      // Forget the key and session results; keep the (non-secret) destination and model.
      return { ...state, apiKey: "", status: { kind: "idle" }, diagnostics: [], inference: null, consentFor: null };
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
  if (needModel && !state.model.trim()) return "Choose a model.";
  return null;
}

export const isConnected = (s: ConnectionState) => s.status.kind === "connected" && sendBlocker(s) === null;
