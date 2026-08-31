import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CafeEvent } from "@/lib/supabase";

// Dev-only fallback, same pattern as lib/localCafeStore.ts — used until
// Supabase is configured. Starts empty; there's no seed data for events.
// On a serverless deploy (Vercel etc.) the filesystem outside /tmp is
// read-only, so writes fall back to an in-memory cache instead of throwing.
const STORE_DIR = path.join(process.cwd(), "local-data");
const STORE_PATH = path.join(STORE_DIR, "events.json");

let memoryCache: CafeEvent[] | null = null;

function ensureStore(): CafeEvent[] {
  if (memoryCache) return memoryCache;

  if (existsSync(STORE_PATH)) {
    return JSON.parse(readFileSync(STORE_PATH, "utf8")) as CafeEvent[];
  }

  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, "[]");
  } catch {
    memoryCache = [];
  }
  return [];
}

function writeStore(events: CafeEvent[]) {
  try {
    mkdirSync(STORE_DIR, { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify(events, null, 2));
    memoryCache = null;
  } catch {
    memoryCache = events;
  }
}

export function localGetAllEvents(): CafeEvent[] {
  return ensureStore().sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );
}

export function localInsertEvent(
  input: Partial<CafeEvent> & { name: string; event_date: string }
): CafeEvent {
  const events = ensureStore();
  const event: CafeEvent = {
    id: randomUUID(),
    name: input.name,
    event_date: input.event_date,
    location: input.location ?? null,
    description: input.description ?? null,
    created_at: new Date().toISOString(),
  };
  events.push(event);
  writeStore(events);
  return event;
}

export function localDeleteEvent(id: string): boolean {
  const events = ensureStore();
  const next = events.filter((e) => e.id !== id);
  if (next.length === events.length) return false;
  writeStore(next);
  return true;
}
