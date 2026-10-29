import { Router } from "express";
import { updateNotes } from "../providers/llm.js";
import { EMPTY_NOTES, isValidNotes } from "../types.js";

export const notesRouter = Router();

notesRouter.post("/", async (req, res) => {
  try {
    const { existingNotes, newTranscript } = req.body ?? {};

    if (typeof newTranscript !== "string") {
      res.status(400).json({ error: "'newTranscript' must be a string." });
      return;
    }

    const baseNotes = isValidNotes(existingNotes) ? existingNotes : EMPTY_NOTES;
    const notes = await updateNotes(baseNotes, newTranscript);
    res.json({ notes });
  } catch (error) {
    console.error("Notes update failed:", error);
    res.status(502).json({ error: "Notes update failed." });
  }
});
