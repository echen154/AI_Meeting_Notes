import { completeText, isChatAvailable } from "./chatClient.js";

// Turns raw speech-to-text output into clean, readable text: removes filler
// words, applies spoken self-corrections ("2pm, no wait, 3pm" -> "3pm"), and
// fixes punctuation and capitalization -- without summarizing or rewording.

const SYSTEM_PROMPT = `You clean up raw speech-to-text output so it reads like polished written text.

Rules:
- Remove filler words and verbal tics (um, uh, like, you know, I mean, sort of) when they add no meaning.
- Apply spoken self-corrections: when the speaker corrects themselves ("Tuesday, scratch that, Wednesday", "at two, no wait, three"), keep only the corrected version.
- Remove false starts, stutters, and accidentally repeated words.
- Fix punctuation, capitalization, and obvious transcription spelling errors.
- Keep the speaker's own words, meaning, and tone. Do not summarize, shorten ideas, add content, or answer questions in the text.
- If the text contains a spoken list, you may format it as a list.
- If there is nothing meaningful (only filler or silence), return an empty response.

Return only the cleaned text, with no preamble or quotes.`;

export async function cleanTranscript(raw: string, previousText = ""): Promise<string> {
  const text = raw.trim();
  if (!text) return "";

  if (!isChatAvailable()) return ruleBasedCleanup(text);

  try {
    const context = previousText.trim().slice(-400);
    const cleaned = await completeText({
      system: SYSTEM_PROMPT,
      user: context
        ? `For context only, the text just before this (do not repeat it):\n"""\n${context}\n"""\n\nClean up this new segment:\n"""\n${text}\n"""`
        : `Clean up this segment:\n"""\n${text}\n"""`,
    });
    return cleaned.trim().replace(/^"""\s*|\s*"""$/g, "");
  } catch (error) {
    // Cleanup is a nice-to-have; never lose the transcript because it failed.
    console.error("Text cleanup failed, using rule-based cleanup:", error);
    return ruleBasedCleanup(text);
  }
}

// --- Rule-based fallback, used when no Anthropic key is configured ---

const FILLERS = /,?\s*\b(?:um+|uh+|erm+|uh-huh|hmm+|ah+)\b[,.]?/gi;
const SOFT_FILLERS = /,?\s*\b(?:you know|I mean|like)\b,\s*/gi;
const CORRECTIONS = /[,.]?\s*\b(?:scratch that|no wait|actually no|sorry,? I meant?)\b[,.]?\s*/i;
const REPEATED_WORD = /\b(\w+)(\s+\1\b)+/gi;

export function ruleBasedCleanup(input: string): string {
  let text = input;

  // Apply each spoken correction. A short fix ("Tuesday, no wait, on Friday")
  // replaces the same number of trailing words; a longer one replaces the
  // whole sentence it corrects.
  let match = CORRECTIONS.exec(text);
  while (match) {
    const before = text.slice(0, match.index).replace(/[.?!,]\s*$/, "");
    const after = text.slice(match.index + match[0].length);
    const fixWords = (after.split(/[.?!,]/)[0] ?? "").trim().split(/\s+/).filter(Boolean);

    if (fixWords.length > 0 && fixWords.length <= 3) {
      const beforeWords = before.split(/\s+/);
      const kept = beforeWords.slice(0, Math.max(0, beforeWords.length - fixWords.length));
      text = `${kept.join(" ")} ${after}`.trim();
    } else {
      const lastBoundary = Math.max(
        before.lastIndexOf(". "),
        before.lastIndexOf("? "),
        before.lastIndexOf("! "),
      );
      const kept = lastBoundary >= 0 ? before.slice(0, lastBoundary + 1) : "";
      text = `${kept} ${capitalize(after)}`.trim();
    }
    match = CORRECTIONS.exec(text);
  }

  text = text
    .replace(FILLERS, "")
    .replace(SOFT_FILLERS, " ")
    .replace(REPEATED_WORD, "$1")
    .replace(/\s+([,.?!])/g, "$1")
    .replace(/,([.?!])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.]+/, "")
    .replace(/(^|[.?!]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .trim();

  if (text && !/[.?!]$/.test(text)) text += ".";
  return /\w/.test(text) ? text : "";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
