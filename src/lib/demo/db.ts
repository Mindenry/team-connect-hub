import { createDemoDb, type DemoDb } from "./seed";
import { DEMO_STORAGE_KEY } from "./config";

let cached: DemoDb | null = null;

function safeParse(raw: string | null): DemoDb | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1 && Array.isArray(parsed.users)) {
      return parsed as DemoDb;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return null;
}

export function getDemoDb(): DemoDb {
  if (cached) return cached;
  if (typeof window !== "undefined") {
    cached = safeParse(window.localStorage.getItem(DEMO_STORAGE_KEY));
  }
  if (!cached) {
    cached = createDemoDb();
    persistNow(cached);
  }
  return cached;
}

function persistNow(db: DemoDb) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(db));
  } catch (err) {
    // Storage can be full if a user uploads a big file — drop saved copies of
    // large data URLs but keep the demo running.
    console.warn("[demo] Could not persist demo data", err);
  }
}

/** Persist immediately so a quick refresh never loses a demo action. */
export function saveDemoDb() {
  if (typeof window === "undefined" || !cached) return;
  persistNow(cached);
}

export function resetDemoDb() {
  cached = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  const fresh = getDemoDb();
  return fresh;
}

let seq = 0;
export function uid(prefix = "id"): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
