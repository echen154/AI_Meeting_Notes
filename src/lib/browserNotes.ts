import type { MeetingNotes, SavedNote } from "../types";

// Saved-notes storage in the browser (localStorage), used when the server is
// hosted somewhere its disk doesn't persist. Mirrors the /api/library calls.

const STORAGE_KEY = "meeting-notes:saved:v1";

function read(): SavedNote[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(notes: SavedNote[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    throw new Error("Couldn't save to this browser's storage. It may be full or blocked.");
  }
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function titleFrom(text: string): string {
  const firstSentence = text.trim().split(/(?<=[.?!])\s/)[0] ?? "";
  const words = firstSentence.replace(/[.?!]$/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "Untitled note";
  return words.length > 8 ? `${words.slice(0, 8).join(" ")}…` : words.join(" ");
}

export function listBrowserNotes(): SavedNote[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createBrowserNote(input: { text: string; summary: MeetingNotes }): SavedNote {
  const now = new Date().toISOString();
  const note: SavedNote = {
    id: crypto.randomUUID(),
    title: titleFrom(input.text),
    text: input.text,
    summary: input.summary,
    wordCount: countWords(input.text),
    createdAt: now,
    updatedAt: now,
  };
  write([...read(), note]);
  return note;
}

export function updateBrowserNote(
  id: string,
  changes: { title?: string; text?: string },
): SavedNote {
  const notes = read();
  const existing = notes.find((n) => n.id === id);
  if (!existing) throw new Error("Note not found.");
  const text = changes.text ?? existing.text;
  const updated: SavedNote = {
    ...existing,
    title: changes.title !== undefined ? changes.title.trim() || "Untitled note" : existing.title,
    text,
    wordCount: countWords(text),
    updatedAt: new Date().toISOString(),
  };
  write(notes.map((n) => (n.id === id ? updated : n)));
  return updated;
}

export function deleteBrowserNote(id: string): void {
  write(read().filter((n) => n.id !== id));
}
