/**
 * Provider presets. All four speak the OpenAI-compatible Chat Completions API
 * (POST {base}/chat/completions, GET {base}/models), so they share one adapter.
 * Native Anthropic / Gemini APIs are intentionally not listed: they are not
 * OpenAI-compatible and no adapter for them exists here.
 *
 * Sources (checked Nov 2026):
 * - Ollama: docs.ollama.com/api/openai-compatibility — base http://localhost:11434/v1,
 *   key "required but ignored". CORS: pages on localhost / 127.0.0.1 are allowed by
 *   default (verified on Ollama 0.40.15); other sites need OLLAMA_ORIGINS (docs.ollama.com/faq).
 * - LM Studio: lmstudio.ai/docs/developer/openai-compat — base http://localhost:1234/v1,
 *   structured output via response_format json_schema; "Enable CORS" server setting.
 * - OpenAI: api.openai.com/v1, Bearer key; response_format json_schema {name, schema, strict}
 *   per the official openai-node types.
 */

export type ProviderId = "ollama" | "lmstudio" | "openai" | "custom";

/**
 * How we ask for JSON. "json_schema" sends response_format (documented for OpenAI
 * and LM Studio). "prompt" relies on instructions + tolerant parsing, because the
 * server's support for response_format is unknown or undocumented.
 */
export type StructuredMode = "json_schema" | "prompt";

export interface ProviderPreset {
  id: ProviderId;
  label: string;
  defaultBaseUrl: string;
  /** Shown as the model field placeholder. Never used as a default value. */
  modelPlaceholder: string;
  keyRequired: boolean;
  keyHint: string;
  /** Runs on this device by default. */
  local: boolean;
  structured: StructuredMode;
  setupHint: string;
}

export const PROVIDERS: Record<ProviderId, ProviderPreset> = {
  ollama: {
    id: "ollama",
    label: "Ollama (local)",
    defaultBaseUrl: "http://127.0.0.1:11434/v1",
    modelPlaceholder: "Exact name from `ollama list`",
    keyRequired: false,
    keyHint: "Not needed for a local Ollama server.",
    local: true,
    structured: "prompt",
    setupHint: "Start Ollama, then use Load models or type a name from `ollama list`.",
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (local)",
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    modelPlaceholder: "Model identifier shown in LM Studio",
    keyRequired: false,
    keyHint: "Only needed if you turned on “Require Authentication” in LM Studio.",
    local: true,
    structured: "json_schema",
    setupHint: "In LM Studio’s Developer tab, start the server and turn on Enable CORS.",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    modelPlaceholder: "Model ID from your OpenAI account",
    keyRequired: true,
    keyHint: "Create a key at platform.openai.com. Usage is billed to your OpenAI account.",
    local: false,
    structured: "json_schema",
    setupHint: "Use Load models to see the model IDs your key can access.",
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    defaultBaseUrl: "",
    modelPlaceholder: "Model ID your server expects",
    keyRequired: false,
    keyHint: "Leave empty if your server doesn’t need a key.",
    local: false,
    structured: "prompt",
    setupHint: "The server must implement /chat/completions and allow requests from this site (CORS).",
  },
};

export const PROVIDER_ORDER: ProviderId[] = ["ollama", "lmstudio", "openai", "custom"];
