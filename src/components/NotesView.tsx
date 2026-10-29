import { useMemo, useState } from "react";
import { groupByDay } from "../lib/dates";
import type { SavedNote } from "../types";
import { NoteDetail } from "./NoteDetail";
import { NoteListItem } from "./NoteListItem";

export function NotesView({
  notes,
  selectedId,
  onSelect,
  onSave,
  onDelete,
}: {
  notes: SavedNote[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSave: (id: string, changes: { title?: string; text?: string }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const selected = notes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1">
      <div
        className={`w-full shrink-0 flex-col border-line md:flex md:h-screen md:w-80 md:border-r ${
          selected ? "hidden" : "flex"
        }`}
      >
        <div className="px-4 pt-6 pb-3">
          <h1 className="mb-4 font-serif text-3xl text-ink">Notes</h1>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-faint focus:border-accent"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-faint">
              {notes.length === 0 ? "No notes yet. Record a meeting from Home." : "No matching notes."}
            </p>
          ) : (
            groupByDay(filtered).map((group) => (
              <div key={group.label} className="mt-3">
                <h2 className="mb-1 px-3 text-xs font-medium tracking-wide text-muted uppercase">
                  {group.label}
                </h2>
                {group.items.map((note) => (
                  <NoteListItem
                    key={note.id}
                    note={note}
                    selected={note.id === selectedId}
                    onSelect={() => onSelect(note.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`min-w-0 flex-1 overflow-y-auto md:h-screen ${selected ? "block" : "hidden md:block"}`}>
        {selected ? (
          <NoteDetail
            key={selected.id}
            note={selected}
            onSave={(changes) => onSave(selected.id, changes)}
            onDelete={async () => {
              await onDelete(selected.id);
              onSelect(null);
            }}
            onBack={() => onSelect(null)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-10 text-sm text-faint">
            Select a note to read or edit it.
          </div>
        )}
      </div>
    </div>
  );
}
