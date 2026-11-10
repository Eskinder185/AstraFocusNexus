/**
 * Holds the AI connection in React state only — never localStorage, sessionStorage,
 * IndexedDB, URLs or exports. It survives in-app navigation and is gone on reload.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { AIError, defaultAdapter, type AIAdapter, type ChatMessage, type ConnectionTarget, type JsonSchemaFormat } from "./client";
import { connectionReducer, initialConnection, isConnected, sendBlocker, type ConnectionAction, type ConnectionState } from "./connectionState";
import { validateEndpoint } from "./endpoint";
import { PROVIDERS } from "./providers";

const TEST_CHAT_TIMEOUT_MS = 45_000;

interface AIConnectionValue {
  state: ConnectionState;
  dispatch: React.Dispatch<ConnectionAction>;
  connected: boolean;
  /** Verify the destination + model. Uses GET /models when available (no generation). */
  testConnection(): Promise<void>;
  loadModels(): Promise<void>;
  /** Cancel a running test or model load. */
  cancel(): void;
  /** Send one chat request to the approved destination. Throws AIError. */
  chat(messages: ChatMessage[], options?: { format?: JsonSchemaFormat; signal?: AbortSignal }): Promise<string>;
}

const Ctx = createContext<AIConnectionValue | null>(null);

const messageOf = (e: unknown) => (e instanceof AIError ? e.message : "Something went wrong. Try again.");

export const AIConnectionProvider: React.FC<{ children: React.ReactNode; adapter?: AIAdapter }> = ({ children, adapter = defaultAdapter }) => {
  const [state, dispatch] = useReducer(connectionReducer, undefined, () => initialConnection());
  const stateRef = useRef(state);
  stateRef.current = state;
  const inflight = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    inflight.current?.abort();
    inflight.current = null;
  }, []);

  // A destination change invalidates anything still in flight to the old one.
  useEffect(() => cancel, [state.provider, state.baseUrl, cancel]);

  const target = (s: ConnectionState): ConnectionTarget => ({
    baseUrl: s.baseUrl,
    model: s.model.trim(),
    apiKey: s.apiKey.trim(),
    structured: PROVIDERS[s.provider].structured,
  });

  /** Only apply a result if the user hasn't changed destination/model/key meanwhile. */
  const stillCurrent = (snap: ConnectionState) => {
    const now = stateRef.current;
    return now.baseUrl === snap.baseUrl && now.model === snap.model && now.apiKey === snap.apiKey && now.provider === snap.provider;
  };

  const testConnection = useCallback(async () => {
    const snap = stateRef.current;
    const blocked = sendBlocker(snap);
    if (blocked) {
      dispatch({ type: "status", status: { kind: "error", message: blocked } });
      return;
    }
    cancel();
    const controller = new AbortController();
    inflight.current = controller;
    dispatch({ type: "status", status: { kind: "testing" } });
    const t = target(snap);
    try {
      const models = await adapter.listModels(t, controller.signal);
      if (!stillCurrent(snap)) return;
      if (models) {
        dispatch({ type: "models", models });
        if (!models.includes(t.model)) {
          dispatch({
            type: "status",
            status: { kind: "error", message: `Connected, but the server has no model named “${t.model}”. ${models.length ? "Pick one from the list or check the exact name." : "The server reported no models."}` },
          });
          return;
        }
        dispatch({ type: "status", status: { kind: "connected", checkedAt: Date.now(), detail: `Found “${t.model}” on ${validateEndpoint(t.baseUrl).ok ? new URL(t.baseUrl).host : t.baseUrl}. No text was generated.` } });
      } else {
        // No model list on this server: a one-line generation is the only way to check.
        await adapter.chat(t, [{ role: "user", content: "Reply with the single word OK." }], { signal: controller.signal, timeoutMs: TEST_CHAT_TIMEOUT_MS });
        if (!stillCurrent(snap)) return;
        dispatch({ type: "status", status: { kind: "connected", checkedAt: Date.now(), detail: `“${t.model}” replied to a one-line test message.` } });
      }
    } catch (e) {
      if (!stillCurrent(snap)) return;
      if (e instanceof AIError && e.kind === "cancelled") dispatch({ type: "status", status: { kind: "idle" } });
      else dispatch({ type: "status", status: { kind: "error", message: messageOf(e) } });
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, [adapter, cancel]);

  const loadModels = useCallback(async () => {
    const snap = stateRef.current;
    const blocked = sendBlocker(snap, false);
    if (blocked) {
      dispatch({ type: "status", status: { kind: "error", message: blocked } });
      return;
    }
    cancel();
    const controller = new AbortController();
    inflight.current = controller;
    dispatch({ type: "status", status: { kind: "testing" } });
    try {
      const models = await adapter.listModels(target(snap), controller.signal);
      if (!stillCurrent(snap)) return;
      dispatch({ type: "models", models: models ?? [] });
      dispatch({
        type: "status",
        status: models
          ? models.length
            ? { kind: "idle" }
            : { kind: "error", message: "The server reported no models. For Ollama, run `ollama pull <model>` first." }
          : { kind: "error", message: "This server doesn’t list its models. Type the model name instead." },
      });
    } catch (e) {
      if (!stillCurrent(snap)) return;
      if (e instanceof AIError && e.kind === "cancelled") dispatch({ type: "status", status: { kind: "idle" } });
      else dispatch({ type: "status", status: { kind: "error", message: messageOf(e) } });
    } finally {
      if (inflight.current === controller) inflight.current = null;
    }
  }, [adapter, cancel]);

  const chat = useCallback<AIConnectionValue["chat"]>(
    async (messages, options = {}) => {
      const snap = stateRef.current;
      const blocked = sendBlocker(snap);
      if (blocked) throw new AIError("bad_request", blocked);
      return adapter.chat(target(snap), messages, options);
    },
    [adapter]
  );

  const value = useMemo<AIConnectionValue>(
    () => ({ state, dispatch, connected: isConnected(state), testConnection, loadModels, cancel, chat }),
    [state, testConnection, loadModels, cancel, chat]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useAIConnection(): AIConnectionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAIConnection must be used within AIConnectionProvider");
  return v;
}
