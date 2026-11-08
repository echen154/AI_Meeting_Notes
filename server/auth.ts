import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";

// Optional single-password protection for hosted deployments.
// When APP_PASSWORD is unset (local use), every request is allowed.

const APP_PASSWORD = process.env.APP_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || randomBytes(32).toString("hex");
const COOKIE_NAME = "mn_session";
const SESSION_DAYS = 30;

const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; firstAt: number }>();

export function isAuthRequired(): boolean {
  return APP_PASSWORD.length > 0;
}

function sign(value: string): string {
  return createHmac("sha256", SESSION_SECRET).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  // Hash first so inputs of different lengths still compare in constant time.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function hasValidSession(req: Request): boolean {
  const token = readCookie(req, COOKIE_NAME);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.firstAt > ATTEMPT_WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export const authRouter = Router();

authRouter.get("/session", (req, res) => {
  res.json({ required: isAuthRequired(), authenticated: !isAuthRequired() || hasValidSession(req) });
});

authRouter.post("/login", (req, res) => {
  if (!isAuthRequired()) {
    res.json({ ok: true });
    return;
  }
  if (tooManyAttempts(req.ip ?? "unknown")) {
    res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    return;
  }
  const password = req.body?.password;
  if (typeof password !== "string" || !safeEqual(password, APP_PASSWORD)) {
    res.status(401).json({ error: "Wrong password." });
    return;
  }
  attempts.delete(req.ip ?? "unknown");
  const expires = String(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  res.cookie(COOKIE_NAME, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: req.secure,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
  res.json({ ok: true });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

// Blocks every other /api route until the user has logged in.
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!isAuthRequired() || hasValidSession(req)) {
    next();
    return;
  }
  res.status(401).json({ error: "Please log in." });
}
