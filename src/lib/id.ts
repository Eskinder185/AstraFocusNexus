export function createId(prefix: string): string {
  const c = typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined;
  const rand = c?.randomUUID ? c.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2, 14);
  return `${prefix}_${rand}`;
}
