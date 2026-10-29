import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EMPTY_NOTES, type MeetingNotes, type SavedNote } from "../types.js";

// Saved notes live in a JSON file next to the project (data/notes.json).
// Fine for a single-user local app; swap for a database if this goes multi-user.

const dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.NOTES_DATA_DIR || path.join(dirname, "..", "..", "data");
const DATA_FILE = path.join(DATA_DIR, "notes.json");

let cache: SavedNote[] | null = null;
// Serialize writes so concurrent requests can't interleave and lose data.
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<SavedNote[]> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8"));
    cache = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    cache = [];
  }
  return cache;
}

function persist(notes: SavedNote[]): Promise<void> {
  writeChain = writeChain.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(notes, null, 2), "utf8");
    await rename(tmp, DATA_FILE);
  });
  return writeChain;
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function titleFrom(text: string): string {
  const firstSentence = text.trim().split(/(?<=[.?!])\s/)[0] ?? "";
  const words = firstSentence.replace(/[.?!]$/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled note";
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}…` : words.join(" ");
}

export async function listNotes(): Promise<SavedNote[]> {
  const notes = await load();
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createNote(input: {
  title?: string;
  text: string;
  summary?: MeetingNotes;
}): Promise<SavedNote> {
  const notes = await load();
  const now = new Date().toISOString();
  const note: SavedNote = {
    id: randomUUID(),
    title: input.title?.trim() || titleFrom(input.text),
    text: input.text,
    summary: input.summary ?? EMPTY_NOTES,
    wordCount: countWords(input.text),
    createdAt: now,
    updatedAt: now,
  };
  cache = [...notes, note];
  await persist(cache);
  return note;
}

export async function updateNote(
  id: string,
  changes: { title?: string; text?: string; summary?: MeetingNotes },
): Promise<SavedNote | null> {
  const notes = await load();
  const existing = notes.find((n) => n.id === id);
  if (!existing) return null;

  const text = changes.text ?? existing.text;
  const updated: SavedNote = {
    ...existing,
    title: changes.title !== undefined ? changes.title.trim() || "Untitled note" : existing.title,
    text,
    summary: changes.summary ?? existing.summary,
    wordCount: countWords(text),
    updatedAt: new Date().toISOString(),
  };
  cache = notes.map((n) => (n.id === id ? updated : n));
  await persist(cache);
  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await load();
  if (!notes.some((n) => n.id === id)) return false;
  cache = notes.filter((n) => n.id !== id);
  await persist(cache);
  return true;
}
