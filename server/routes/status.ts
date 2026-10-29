import { Router } from "express";
import { isSttDemoMode } from "../providers/stt.js";
import { isLlmDemoMode } from "../providers/llm.js";

export const statusRouter = Router();

statusRouter.get("/", (_req, res) => {
  res.json({
    sttMode: isSttDemoMode() ? "demo" : "live",
    llmMode: isLlmDemoMode() ? "demo" : "live",
  });
});
