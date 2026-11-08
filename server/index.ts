import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter, requireAuth } from "./auth.js";
import { libraryRouter } from "./routes/library.js";
import { notesRouter } from "./routes/notes.js";
import { statusRouter } from "./routes/status.js";
import { transcribeRouter } from "./routes/transcribe.js";

const PORT = Number(process.env.PORT) || 8787;
// This server handles live meeting audio/transcripts and proxies paid API
// keys, so it should not accept cross-origin requests from arbitrary pages
// the user happens to have open. Default covers the Vite dev server; the
// built app is served from this same origin in production, which needs no
// CORS grant at all.
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// "browser" keeps saved notes in the user's browser instead of data/notes.json,
// for hosts whose disk is wiped on restart.
const NOTES_STORAGE = process.env.NOTES_STORAGE === "browser" ? "browser" : "server";

const app = express();
// Hosts like Render terminate HTTPS at a proxy; trust it so secure cookies work.
app.set("trust proxy", 1);
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});
app.use("/api/auth", authRouter);
app.use("/api", requireAuth);

app.use("/api/transcribe", transcribeRouter);
app.use("/api/notes", notesRouter);
if (NOTES_STORAGE === "server") app.use("/api/library", libraryRouter);
app.use("/api/status", statusRouter(NOTES_STORAGE));

// Serve the built frontend when running `npm run build && npm start`.
const dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(dirname, "..", "dist");
app.use(express.static(distDir));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) res.status(404).send("Not built yet. Run `npm run dev` for development.");
  });
});

app.listen(PORT, () => {
  console.log(`AI Meeting Notes server listening on http://localhost:${PORT}`);
});
