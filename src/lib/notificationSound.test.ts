import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const values = new Map<string, string>();
const notes: number[] = [];
const levels: number[] = [];

class FakeAudioContext {
  state: AudioContextState = "running";
  currentTime = 0;
  destination = {};
  resume = vi.fn(async () => { this.state = "running"; });
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: (value: number) => notes.push(value) },
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: (value: number) => { if (value > 0.001) levels.push(value); },
      },
      connect: vi.fn(),
    };
  }
}

beforeEach(() => {
  values.clear();
  notes.length = 0;
  levels.length = 0;
  vi.stubGlobal("window", {});
  vi.stubGlobal("AudioContext", FakeAudioContext);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
  vi.resetModules();
});
afterEach(() => vi.unstubAllGlobals());

describe("notification chime", () => {
  it("uses a gentle 30% default and plays exactly once per timer event", async () => {
    const sound = await import("./notificationSound");
    expect(sound.readSoundPreferences()).toEqual({ enabled: true, volume: 0.3, taskCompletion: false });
    sound.unlockNotificationAudio();
    expect(await sound.playNotificationSound("f-123")).toBe(true);
    expect(await sound.playNotificationSound("f-123")).toBe(false);
    expect(notes).toEqual([523.25, 659.25]);
    expect(levels[0]).toBeCloseTo(0.048);
  });

  it("persists volume and mute, and preview uses saved volume", async () => {
    const sound = await import("./notificationSound");
    sound.saveSoundPreferences({ enabled: true, volume: 0.5, taskCompletion: false });
    sound.unlockNotificationAudio();
    expect(await sound.previewNotificationSound()).toBe(true);
    expect(levels[0]).toBeCloseTo(0.08);
    sound.saveSoundPreferences({ enabled: false, volume: 0.5, taskCompletion: false });
    expect(await sound.previewNotificationSound()).toBe(false);
    expect(notes).toHaveLength(2);
    vi.resetModules();
    const reloaded = await import("./notificationSound");
    expect(reloaded.readSoundPreferences()).toMatchObject({ enabled: false, volume: 0.5 });
  });

  it("keeps task completion silent unless opted in", async () => {
    const sound = await import("./notificationSound");
    sound.unlockNotificationAudio();
    expect(await sound.playNotificationSound("task-1", "task")).toBe(false);
    sound.saveSoundPreferences({ enabled: true, volume: 0.3, taskCompletion: true });
    expect(await sound.playNotificationSound("task-1", "task")).toBe(true);
    expect(levels[0]).toBeCloseTo(0.16 * 0.3 * 0.55);
  });

  it("fails quietly when the browser blocks audio", async () => {
    class BlockedAudioContext extends FakeAudioContext {
      state: AudioContextState = "suspended";
      resume = vi.fn(async () => { throw new Error("NotAllowedError"); });
    }
    vi.stubGlobal("AudioContext", BlockedAudioContext);
    const sound = await import("./notificationSound");
    sound.unlockNotificationAudio();
    expect(await sound.playNotificationSound("f-blocked")).toBe(false);
    expect(notes).toHaveLength(0);
  });
});
