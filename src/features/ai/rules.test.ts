import { describe, expect, it } from "vitest";
import { connectionReducer, initialConnection, sendBlocker, type ConnectionState } from "./connectionState";
import { isLoopbackHost, validateEndpoint } from "./endpoint";
import { MAX_MINUTES, MAX_SUGGESTIONS, parseSuggestions } from "./goalBreakdown";

describe("validateEndpoint", () => {
  it("accepts HTTPS and loopback HTTP, normalising trailing slashes", () => {
    expect(validateEndpoint("https://api.openai.com/v1/")).toMatchObject({ ok: true, baseUrl: "https://api.openai.com/v1", isLoopback: false });
    expect(validateEndpoint("http://127.0.0.1:11434/v1")).toMatchObject({ ok: true, isLoopback: true });
    expect(validateEndpoint("http://localhost:1234/v1")).toMatchObject({ ok: true, isLoopback: true });
    expect(validateEndpoint("http://[::1]:8080/v1")).toMatchObject({ ok: true, isLoopback: true });
  });
  it("rejects remote plain HTTP, including LAN addresses", () => {
    expect(validateEndpoint("http://api.example.com/v1").ok).toBe(false);
    expect(validateEndpoint("http://192.168.1.20:11434/v1").ok).toBe(false);
  });
  it("rejects embedded credentials, other schemes, queries and junk", () => {
    expect(validateEndpoint("https://user:pass@api.example.com/v1").ok).toBe(false);
    expect(validateEndpoint("https://api.example.com/v1?key=abc").ok).toBe(false);
    expect(validateEndpoint("https://api.example.com/v1#x").ok).toBe(false);
    expect(validateEndpoint("ftp://example.com").ok).toBe(false);
    expect(validateEndpoint("javascript:alert(1)").ok).toBe(false);
    expect(validateEndpoint("file:///etc/passwd").ok).toBe(false);
    expect(validateEndpoint("not a url").ok).toBe(false);
    expect(validateEndpoint("").ok).toBe(false);
  });
  it("doesn't treat look-alike hosts as loopback", () => {
    expect(isLoopbackHost("127.0.0.1.evil.com")).toBe(false);
    expect(isLoopbackHost("localhost.evil.com")).toBe(false);
    expect(isLoopbackHost("127.0.0.999")).toBe(false);
  });
});

describe("connection state", () => {
  const connected = (): ConnectionState => {
    let s = initialConnection("openai");
    s = connectionReducer(s, { type: "apiKey", apiKey: "sk-test" });
    s = connectionReducer(s, { type: "model", model: "m" });
    s = connectionReducer(s, { type: "consent", value: true });
    return connectionReducer(s, { type: "status", status: { kind: "connected", checkedAt: 1, detail: "ok" } });
  };

  it("blocks sending until the user consents", () => {
    let s = initialConnection("openai");
    s = connectionReducer(s, { type: "apiKey", apiKey: "sk-test" });
    s = connectionReducer(s, { type: "model", model: "m" });
    expect(sendBlocker(s)).toMatch(/Confirm/);
    s = connectionReducer(s, { type: "consent", value: true });
    expect(sendBlocker(s)).toBeNull();
  });

  it("changing the base URL clears key, status, models and consent", () => {
    const s = connectionReducer({ ...connected(), models: [{ id: "m" }] }, { type: "baseUrl", baseUrl: "https://other.example.com/v1" });
    expect(s.apiKey).toBe("");
    expect(s.consentFor).toBeNull();
    expect(s.status.kind).toBe("idle");
    expect(s.models).toBeNull();
    expect(sendBlocker(s)).not.toBeNull();
  });

  it("changing the provider clears the destination and model", () => {
    const s = connectionReducer(connected(), { type: "provider", provider: "ollama" });
    expect(s).toMatchObject({ apiKey: "", consentFor: null, model: "", baseUrl: "http://127.0.0.1:11434" });
  });

  it("changing the model keeps consent but drops verified status", () => {
    const s = connectionReducer(connected(), { type: "model", model: "other" });
    expect(s.status.kind).toBe("idle");
    expect(s.consentFor).not.toBeNull();
    expect(s.apiKey).toBe("sk-test");
  });

  it("consent is bound to the exact URL and can't be given for an invalid one", () => {
    let s = connectionReducer(initialConnection("custom"), { type: "baseUrl", baseUrl: "http://evil.example.com" });
    s = connectionReducer(s, { type: "consent", value: true });
    expect(s.consentFor).toBeNull();
  });

  it("clear resets everything", () => {
    expect(connectionReducer(connected(), { type: "clear" })).toEqual(initialConnection("openai"));
  });

  it("requires a key for OpenAI but not Ollama", () => {
    let s = connectionReducer(initialConnection("openai"), { type: "model", model: "m" });
    s = connectionReducer(s, { type: "consent", value: true });
    expect(sendBlocker(s)).toMatch(/API key/);
    let o = connectionReducer(initialConnection("ollama"), { type: "model", model: "m" });
    o = connectionReducer(o, { type: "consent", value: true });
    expect(sendBlocker(o)).toBeNull();
  });
});

describe("parseSuggestions", () => {
  it("parses a structured reply", () => {
    const r = parseSuggestions(JSON.stringify({ tasks: [{ title: "B", description: "d", minutes: 45, order: 2 }, { title: "A", description: "", minutes: 20, order: 1 }] }));
    expect(r).toEqual({ ok: true, dropped: 0, tasks: [{ title: "A", description: "", minutes: 20, order: 1 }, { title: "B", description: "d", minutes: 45, order: 2 }] });
  });
  it("tolerates fences, prose and a bare array", () => {
    const r = parseSuggestions('Sure! Here you go:\n```json\n[{"title":"Read","description":"x","minutes":"25"}]\n```');
    expect(r).toMatchObject({ ok: true, tasks: [{ title: "Read", minutes: 25, order: 1 }] });
  });
  it("clamps durations, drops invalid items and caps the count", () => {
    const items = [{ title: "", minutes: 5 }, { title: "Huge", minutes: 99999 }, null, ...Array.from({ length: 20 }, (_, i) => ({ title: `T${i}`, minutes: 1 }))];
    const r = parseSuggestions(JSON.stringify({ tasks: items }));
    if (!r.ok) throw new Error("expected ok");
    expect(r.tasks).toHaveLength(MAX_SUGGESTIONS);
    expect(r.tasks[0].minutes).toBe(MAX_MINUTES);
    expect(r.tasks[1].minutes).toBe(5);
    expect(r.dropped).toBe(2 + (21 - MAX_SUGGESTIONS));
  });
  it("keeps markup as plain text (rendering is text-only) and strips control characters", () => {
    const r = parseSuggestions(JSON.stringify({ tasks: [{ title: "<img src=x onerror=alert(1)>\u0007", description: "a\nb", minutes: 10, order: 1 }] }));
    expect(r).toMatchObject({ ok: true, tasks: [{ title: "<img src=x onerror=alert(1)>", description: "a b" }] });
  });
  it("fails gracefully on non-JSON or empty replies", () => {
    expect(parseSuggestions("I can't help with that.").ok).toBe(false);
    expect(parseSuggestions('{"tasks": []}').ok).toBe(false);
    expect(parseSuggestions('{"foo": 1}').ok).toBe(false);
  });
});
