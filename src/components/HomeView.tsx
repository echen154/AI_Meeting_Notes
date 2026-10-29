import { useEffect, useRef } from "react";
import { groupByDay } from "../lib/dates";
import type { MeetingNotes, MicStatus, SavedNote, TranscriptEntry } from "../types";
import { NoteListItem } from "./NoteListItem";
import { StatusIndicator } from "./StatusIndicator";
import { SummarySections } from "./SummarySections";

interface Props {
  status: MicStatus;
  transcript: TranscriptEntry[];
  liveNotes: MeetingNotes;
  isTranscribing: boolean;
  isUpdatingNotes: boolean;
  savedNotes: SavedNote[];
  onStart: () => void;
  onStop: () => void;
  onOpenNote: (id: string) => void;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeView({
  status,
  transcript,
  liveNotes,
  isTranscribing,
  isUpdatingNotes,
  savedNotes,
  onStart,
  onStop,
  onOpenNote,
}: Props) {
  const isRecording = status === "recording" || status === "requesting-permission";
  const totalWords = savedNotes.reduce((sum, n) => sum + n.wordCount, 0);
  const showLive = isRecording || transcript.length > 0;

  const textRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = textRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript]);

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 md:px-10 md:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-serif text-4xl text-ink md:text-5xl">{greeting()}</h1>
        <div className="flex gap-2 text-sm">
          <span className="rounded-full border border-line bg-card px-3 py-1 text-muted">
            <span className="font-medium text-ink">{totalWords.toLocaleString()}</span> words
          </span>
          <span className="rounded-full border border-line bg-card px-3 py-1 text-muted">
            <span className="font-medium text-ink">{savedNotes.length}</span>{" "}
            {savedNotes.length === 1 ? "note" : "notes"}
          </span>
        </div>
      </header>

      <section className="mt-8 rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[15px] text-ink">
              {isRecording ? "Listening to your meeting…" : "Start a meeting and we'll take the notes."}
            </p>
            <div className="mt-1">
              <StatusIndicator status={status} />
            </div>
          </div>
          {!isRecording ? (
            <button
              onClick={onStart}
              className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-paper transition hover:opacity-85 active:scale-95"
            >
              Start Taking Notes
            </button>
          ) : (
            <button
              onClick={onStop}
              className="inline-flex items-center gap-2 rounded-full bg-rec px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85 active:scale-95"
            >
              <span className="h-2.5 w-2.5 rounded-[3px] bg-white" />
              Stop
            </button>
          )}
        </div>

        {showLive && (
          <div className="mt-6 grid gap-6 border-t border-line pt-6 md:grid-cols-[3fr_2fr]">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-faint">
                <span className="font-medium tracking-wide uppercase">Transcript</span>
                {isTranscribing && <span>Polishing…</span>}
              </div>
              <div ref={textRef} className="max-h-72 overflow-y-auto pr-1">
                {transcript.length === 0 ? (
                  <p className="text-sm text-faint">Your words will appear here, cleaned up.</p>
                ) : (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">
                    {transcript.map((e) => e.text).join(" ")}
                  </p>
                )}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-faint">
                <span className="font-medium tracking-wide uppercase">Summary</span>
                {isUpdatingNotes && <span>Updating…</span>}
              </div>
              <SummarySections notes={liveNotes} />
            </div>
          </div>
        )}

        <p className="mt-5 text-xs leading-relaxed text-faint">
          Your microphone is only used after you click Start, and stops as soon as you click
          Stop. Only record when everyone present has agreed to it.
        </p>
      </section>

      <section className="mt-10">
        {savedNotes.length === 0 ? (
          <p className="text-sm text-faint">
            Your notes will show up here, grouped by day, after your first recording.
          </p>
        ) : (
          groupByDay(savedNotes.slice(0, 30)).map((group) => (
            <div key={group.label} className="mb-6">
              <h2 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted uppercase">
                {group.label}
              </h2>
              <div className="rounded-2xl border border-line bg-card p-1.5">
                {group.items.map((note) => (
                  <NoteListItem key={note.id} note={note} onSelect={() => onOpenNote(note.id)} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
