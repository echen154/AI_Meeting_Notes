import { Router } from "express";
import { isSttDemoMode } from "../providers/stt.js";
import { isLlmDemoMode } from "../providers/llm.js";

export function statusRouter(notesStorage: "server" | "browser") {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      sttMode: isSttDemoMode() ? "demo" : "live",
      llmMode: isLlmDemoMode() ? "demo" : "live",
      notesStorage,
    });
  });

  return router;
}
