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

export type MicStatus =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "stopped"
  | "denied"
  | "unsupported"
  | "error";

export interface TranscriptEntry {
  id: number;
  text: string;
}

export interface SavedNote {
  id: string;
  title: string;
  text: string;
  summary: MeetingNotes;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceStatus {
  sttMode: "live" | "demo";
  llmMode: "live" | "demo";
}
