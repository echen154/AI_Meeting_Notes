export interface MeetingNotes {
  key_points: string[];
  important_details: string[];
  decisions: string[];
  action_items: string[];
  questions: string[];
}

export const EMPTY_NOTES: MeetingNotes = {
  key_points: [],
  important_details: [],
  decisions: [],
  action_items: [],
  questions: [],
};

const NOTE_KEYS: (keyof MeetingNotes)[] = [
  "key_points",
  "important_details",
  "decisions",
  "action_items",
  "questions",
];

export function isValidNotes(value: unknown): value is MeetingNotes {
  if (!value || typeof value !== "object") return false;
  return NOTE_KEYS.every((k) => {
    const list = (value as Record<string, unknown>)[k];
    return Array.isArray(list) && list.every((item) => typeof item === "string");
  });
}

// A finished recording session, saved to the user's notes library.
export interface SavedNote {
  id: string;
  title: string;
  text: string;
  summary: MeetingNotes;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}
