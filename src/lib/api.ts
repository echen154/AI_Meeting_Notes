import type { MeetingNotes, SavedNote, ServiceStatus } from "../types";

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return new Error(data.error);
  } catch {
    // Non-JSON error body; use the fallback message.
  }
  return new Error(fallback);
}

export async function fetchServiceStatus(): Promise<ServiceStatus> {
  const res = await fetch("/api/status");
  if (!res.ok) throw new Error("Failed to load service status");
  return res.json();
}

export async function transcribeSegment(
  blob: Blob,
  resetDemo: boolean,
  previousText: string,
): Promise<{ text: string; demo: boolean }> {
  const form = new FormData();
  form.append("audio", blob, "segment.webm");
  if (resetDemo) form.append("resetDemo", "true");
  if (previousText) form.append("previousText", previousText.slice(-2000));

  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) throw await errorFrom(res, "Transcription request failed");
  return res.json();
}

export async function requestNotesUpdate(
  existingNotes: MeetingNotes,
  newTranscript: string,
): Promise<MeetingNotes> {
  const res = await fetch("/api/notes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ existingNotes, newTranscript }),
  });
  if (!res.ok) throw new Error("Notes update request failed");
  const data = await res.json();
  return data.notes;
}

export async function fetchSavedNotes(): Promise<SavedNote[]> {
  const res = await fetch("/api/library");
  if (!res.ok) throw await errorFrom(res, "Couldn't load saved notes");
  return (await res.json()).notes;
}

export async function createSavedNote(input: {
  title?: string;
  text: string;
  summary: MeetingNotes;
}): Promise<SavedNote> {
  const res = await fetch("/api/library", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw await errorFrom(res, "Couldn't save the note");
  return (await res.json()).note;
}

export async function updateSavedNote(
  id: string,
  changes: { title?: string; text?: string },
): Promise<SavedNote> {
  const res = await fetch(`/api/library/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw await errorFrom(res, "Couldn't update the note");
  return (await res.json()).note;
}

export async function deleteSavedNote(id: string): Promise<void> {
  const res = await fetch(`/api/library/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw await errorFrom(res, "Couldn't delete the note");
}
