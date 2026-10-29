import { Router } from "express";
import { createNote, deleteNote, listNotes, updateNote } from "../storage/noteStore.js";
import { isValidNotes } from "../types.js";

const MAX_TITLE = 200;
const MAX_TEXT = 200_000;

export const libraryRouter = Router();

libraryRouter.get("/", async (_req, res) => {
  try {
    res.json({ notes: await listNotes() });
  } catch (error) {
    console.error("Loading notes failed:", error);
    res.status(500).json({ error: "Couldn't load saved notes." });
  }
});

libraryRouter.post("/", async (req, res) => {
  const { title, text, summary } = req.body ?? {};
  if (typeof text !== "string" || text.length > MAX_TEXT) {
    res.status(400).json({ error: "'text' must be a string." });
    return;
  }
  if (title !== undefined && (typeof title !== "string" || title.length > MAX_TITLE)) {
    res.status(400).json({ error: "'title' must be a short string." });
    return;
  }
  if (summary !== undefined && !isValidNotes(summary)) {
    res.status(400).json({ error: "'summary' is malformed." });
    return;
  }
  try {
    res.status(201).json({ note: await createNote({ title, text, summary }) });
  } catch (error) {
    console.error("Saving note failed:", error);
    res.status(500).json({ error: "Couldn't save the note." });
  }
});

libraryRouter.patch("/:id", async (req, res) => {
  const { title, text, summary } = req.body ?? {};
  if (title !== undefined && (typeof title !== "string" || title.length > MAX_TITLE)) {
    res.status(400).json({ error: "'title' must be a short string." });
    return;
  }
  if (text !== undefined && (typeof text !== "string" || text.length > MAX_TEXT)) {
    res.status(400).json({ error: "'text' must be a string." });
    return;
  }
  if (summary !== undefined && !isValidNotes(summary)) {
    res.status(400).json({ error: "'summary' is malformed." });
    return;
  }
  try {
    const note = await updateNote(req.params.id, { title, text, summary });
    if (!note) {
      res.status(404).json({ error: "Note not found." });
      return;
    }
    res.json({ note });
  } catch (error) {
    console.error("Updating note failed:", error);
    res.status(500).json({ error: "Couldn't update the note." });
  }
});

libraryRouter.delete("/:id", async (req, res) => {
  try {
    if (!(await deleteNote(req.params.id))) {
      res.status(404).json({ error: "Note not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    console.error("Deleting note failed:", error);
    res.status(500).json({ error: "Couldn't delete the note." });
  }
});
