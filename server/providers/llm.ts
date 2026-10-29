import { EMPTY_NOTES, type MeetingNotes } from "../types.js";
import { completeJson, isChatAvailable } from "./chatClient.js";

export function isLlmDemoMode() {
  return !isChatAvailable();
}

const NOTES_SCHEMA = {
  type: "object",
  properties: {
    key_points: { type: "array", items: { type: "string" } },
    important_details: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
    action_items: { type: "array", items: { type: "string" } },
    questions: { type: "array", items: { type: "string" } },
  },
  required: ["key_points", "important_details", "decisions", "action_items", "questions"],
};

const SYSTEM_PROMPT = `You maintain live notes for an ongoing meeting from a rolling transcript.

You will receive the existing notes as JSON and a new chunk of transcript that was just spoken.
Update the notes by integrating anything new and important. Do not start over.

Rules:
- Preserve every still-relevant item already in the existing notes. Never silently drop something important from earlier just because new transcript arrived.
- Only add information that is actually present in the transcript. Never invent or assume anything.
- Do not turn casual remarks into formal decisions or action items.
- Avoid duplicate or near-duplicate entries; merge instead of repeating.
- Skip filler, small talk, and greetings.
- Keep entries short and concrete. Prefer specific names, numbers, and dates over vague statements.
- key_points: the main ideas and takeaways.
- important_details: specific facts, numbers, dates, names.
- decisions: things the group actually agreed on or decided.
- action_items: concrete follow-up tasks, ideally with an owner and/or deadline.
- questions: open questions or things flagged for follow-up.
- Leave a category as an empty array if there is nothing genuine for it.

Return the complete, updated notes object.`;

export async function updateNotes(
  existingNotes: MeetingNotes,
  newTranscript: string,
): Promise<MeetingNotes> {
  if (!newTranscript.trim()) {
    return existingNotes;
  }

  if (!isChatAvailable()) {
    return demoUpdateNotes(existingNotes, newTranscript);
  }

  const result = await completeJson({
    system: SYSTEM_PROMPT,
    schema: NOTES_SCHEMA,
    maxTokens: 2048,
    user: `EXISTING NOTES (JSON):\n${JSON.stringify(existingNotes)}\n\nNEW TRANSCRIPT SINCE LAST UPDATE:\n"""\n${newTranscript}\n"""`,
  });

  if (!result || typeof result !== "object") {
    return existingNotes;
  }

  return normalizeNotes(result as Partial<MeetingNotes>, existingNotes);
}

function normalizeNotes(
  candidate: Partial<MeetingNotes>,
  fallback: MeetingNotes,
): MeetingNotes {
  const pick = (key: keyof MeetingNotes) =>
    Array.isArray(candidate[key])
      ? (candidate[key] as string[]).filter((s) => typeof s === "string" && s.trim().length > 0)
      : fallback[key];

  return {
    key_points: pick("key_points"),
    important_details: pick("important_details"),
    decisions: pick("decisions"),
    action_items: pick("action_items"),
    questions: pick("questions"),
  };
}

// --- Demo mode: a small rule-based extractor so the app works with no keys ---

const DECISION_HINTS = ["decided", "decide", "agreed", "we'll go with", "approved"];
const ACTION_HINTS = [
  "will take",
  "will send",
  "will own",
  "action item",
  "i'll take",
  "someone needs to",
  "by friday",
  "by wednesday",
  "targeting",
];
const DETAIL_HINTS = /\d/;

function demoUpdateNotes(existing: MeetingNotes, newTranscript: string): MeetingNotes {
  const notes: MeetingNotes = {
    key_points: [...existing.key_points],
    important_details: [...existing.important_details],
    decisions: [...existing.decisions],
    action_items: [...existing.action_items],
    questions: [...existing.questions],
  };

  const sentences = newTranscript
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    let bucket: keyof MeetingNotes = "key_points";

    if (sentence.endsWith("?")) {
      bucket = "questions";
    } else if (DECISION_HINTS.some((h) => lower.includes(h))) {
      bucket = "decisions";
    } else if (ACTION_HINTS.some((h) => lower.includes(h))) {
      bucket = "action_items";
    } else if (DETAIL_HINTS.test(sentence)) {
      bucket = "important_details";
    }

    const isDuplicate = notes[bucket].some(
      (existingEntry) =>
        existingEntry.toLowerCase().includes(lower.slice(0, 20)) ||
        lower.includes(existingEntry.toLowerCase().slice(0, 20)),
    );
    if (!isDuplicate) {
      notes[bucket] = [...notes[bucket], sentence];
    }
  }

  // Keep key_points from growing unbounded; other categories tend to stay small.
  if (notes.key_points.length > 12) {
    notes.key_points = notes.key_points.slice(-12);
  }

  return notes;
}

export function emptyNotes(): MeetingNotes {
  return { ...EMPTY_NOTES };
}
