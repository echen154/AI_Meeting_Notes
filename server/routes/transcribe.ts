import { Router } from "express";
import multer from "multer";
import OpenAI from "openai";
import { cleanTranscript } from "../providers/cleanup.js";
import { resetDemoTranscript, sttProviderName, transcribeAudio } from "../providers/stt.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const transcribeRouter = Router();

transcribeRouter.post("/", upload.single("audio"), async (req, res) => {
  try {
    if (req.body?.resetDemo === "true") {
      resetDemoTranscript();
    }

    if (!req.file) {
      res.status(400).json({ error: "Missing 'audio' file in request." });
      return;
    }

    const previousText =
      typeof req.body?.previousText === "string" ? req.body.previousText.slice(-2000) : "";

    const result = await transcribeAudio(req.file.buffer, req.file.mimetype);
    const text = await cleanTranscript(result.text, previousText);
    res.json({ text, raw: result.text, demo: result.demo });
  } catch (error) {
    console.error("Transcription failed:", error);
    res.status(502).json({ error: describeSttError(error) });
  }
});

// Turn provider errors into a reason the user can act on.
function describeSttError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    const name = sttProviderName ?? "The speech-to-text service";
    if (error.code === "insufficient_quota" || error.code === "credit_balance_exhausted") {
      return `Your ${name} account is out of credits. Add credits in its billing settings.`;
    }
    if (error.status === 401) {
      const envVar = sttProviderName === "Groq" ? "GROQ_API_KEY" : "OPENAI_API_KEY";
      return `${name} rejected the API key. Check ${envVar} in .env.`;
    }
    if (error.status === 429) return `${name} rate limit reached. Try again in a moment.`;
  }
  return "Transcription failed.";
}
