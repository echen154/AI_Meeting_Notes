import type { MeetingNotes, SavedNote } from "../types";

const SECTIONS: { key: keyof MeetingNotes; heading: string }[] = [
  { key: "key_points", heading: "Key Points" },
  { key: "important_details", heading: "Important Details" },
  { key: "decisions", heading: "Decisions" },
  { key: "action_items", heading: "Action Items" },
  { key: "questions", heading: "Questions / Follow-ups" },
];

export function formatNotesAsText(notes: MeetingNotes): string {
  const parts: string[] = [];
  for (const { key, heading } of SECTIONS) {
    const items = notes[key];
    if (!items || items.length === 0) continue;
    parts.push(`### ${heading}`);
    parts.push(...items.map((item) => `- ${item}`));
    parts.push("");
  }
  return parts.join("\n").trim();
}

export function formatSavedNoteAsText(note: SavedNote): string {
  const summary = formatNotesAsText(note.summary);
  return [`# ${note.title}`, note.text.trim(), summary && `## Summary\n\n${summary}`]
    .filter(Boolean)
    .join("\n\n");
}

export function hasAnyNotes(notes: MeetingNotes): boolean {
  return SECTIONS.some(({ key }) => notes[key].length > 0);
}

export { SECTIONS as NOTE_SECTIONS };
