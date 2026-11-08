import { useState, type FormEvent } from "react";
import { login } from "../lib/api";

export function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't log in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-line bg-card p-8 shadow-sm"
      >
        <h1 className="font-serif text-4xl text-ink">Meeting Notes</h1>
        <p className="mt-2 text-sm text-muted">Enter your password to continue.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          aria-label="Password"
          placeholder="Password"
          className="mt-6 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
        />
        {error && <p className="mt-3 text-sm text-rec">{error}</p>}
        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded-full bg-ink py-2.5 text-sm font-medium text-paper transition hover:opacity-85 disabled:opacity-40"
        >
          {busy ? "Checking…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
