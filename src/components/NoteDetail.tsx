import { useState } from "react";
import { dayLabel, timeLabel } from "../lib/dates";
import { formatSavedNoteAsText } from "../lib/formatNotes";
import type { SavedNote } from "../types";
import { SummarySections } from "./SummarySections";

// Render with key={note.id} so the drafts reset when switching notes.
export function NoteDetail({
  note,
  onSave,
  onDelete,
  onBack,
}: {
  note: SavedNote;
  onSave: (changes: { title?: string; text?: string }) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onBack: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [text, setText] = useState(note.text);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const saveIfChanged = async () => {
    const changes: { title?: string; text?: string } = {};
    if (title.trim() !== note.title) changes.title = title;
    if (text !== note.text) changes.text = text;
    if (Object.keys(changes).length === 0) return;
    setSaveState("saving");
    try {
      await onSave(changes);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatSavedNoteAsText({ ...note, title, text }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${note.title}"? This can't be undone.`)) return;
    await onDelete();
  };

  const buttonClass =
    "rounded-lg border border-line bg-card px-3 py-1.5 text-sm text-muted transition hover:bg-hover hover:text-ink";

  return (
    <article className="mx-auto w-full max-w-2xl px-5 py-8 md:px-10 md:py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <button onClick={onBack} className={`${buttonClass} md:hidden`}>
          ← All notes
        </button>
        <span className="text-xs text-faint">
          {dayLabel(note.createdAt)} · {timeLabel(note.createdAt)} · {note.wordCount} words
          {saveState === "saving" && " · Saving…"}
          {saveState === "saved" && " · Saved"}
          {saveState === "error" && " · Couldn't save"}
        </span>
        <div className="flex gap-2">
          <button onClick={handleCopy} className={buttonClass}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={handleDelete} className={`${buttonClass} hover:text-rec`}>
            Delete
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={saveIfChanged}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        maxLength={200}
        aria-label="Note title"
        className="w-full bg-transparent font-serif text-4xl text-ink outline-none placeholder:text-faint"
        placeholder="Untitled note"
      />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={saveIfChanged}
        aria-label="Note text"
        rows={Math.max(6, Math.ceil(text.length / 70))}
        className="mt-5 w-full resize-none bg-transparent text-[16px] leading-[1.75] text-ink outline-none"
      />

      <section className="mt-8 rounded-2xl border border-line bg-card p-6">
        <h3 className="mb-4 font-serif text-2xl text-ink">Summary</h3>
        <SummarySections notes={note.summary} emptyText="No summary for this note." />
      </section>
    </article>
  );
}
