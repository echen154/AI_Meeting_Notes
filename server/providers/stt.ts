import OpenAI from "openai";
import { GROQ_BASE_URL } from "./chatClient.js";
import { DEMO_TRANSCRIPT_LINES } from "./demoScript.js";

export interface TranscribeResult {
  text: string;
  demo: boolean;
}

// OpenAI is used when its key is set; otherwise Groq, whose audio API is
// OpenAI-compatible, so the same SDK works with a different base URL.
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

export const sttProviderName: "OpenAI" | "Groq" | null = OPENAI_API_KEY
  ? "OpenAI"
  : GROQ_API_KEY
    ? "Groq"
    : null;

const STT_MODEL =
  sttProviderName === "Groq"
    ? process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo"
    : process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe";

const client =
  sttProviderName === "OpenAI"
    ? new OpenAI({ apiKey: OPENAI_API_KEY })
    : sttProviderName === "Groq"
      ? new OpenAI({ apiKey: GROQ_API_KEY, baseURL: GROQ_BASE_URL })
      : null;

// Module-level cursor for demo mode. Fine for a single-user local MVP;
// reset() is called whenever a new recording session starts.
let demoCursor = 0;

export function resetDemoTranscript() {
  demoCursor = 0;
}

export function isSttDemoMode() {
  return client === null;
}

export async function transcribeAudio(
  buffer: Buffer,
  mimeType: string,
): Promise<TranscribeResult> {
  if (!client) {
    return { text: nextDemoLine(), demo: true };
  }

  if (buffer.length === 0) {
    return { text: "", demo: false };
  }

  const extension = mimeType.includes("mp4")
    ? "mp4"
    : mimeType.includes("ogg")
      ? "ogg"
      : mimeType.includes("wav")
        ? "wav"
        : "webm";

  const file = new File([buffer], `segment.${extension}`, { type: mimeType });

  const response = await client.audio.transcriptions.create({
    file,
    model: STT_MODEL,
  });

  return { text: (response.text ?? "").trim(), demo: false };
}

function nextDemoLine(): string {
  if (demoCursor >= DEMO_TRANSCRIPT_LINES.length) {
    // Meeting "ends"; simulate silence rather than looping forever.
    return "";
  }
  const line = DEMO_TRANSCRIPT_LINES[demoCursor];
  demoCursor += 1;
  return line;
}
