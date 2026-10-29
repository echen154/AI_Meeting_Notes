import { timeLabel } from "../lib/dates";
import type { SavedNote } from "../types";

export function NoteListItem({
  note,
  selected = false,
  onSelect,
}: {
  note: SavedNote;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full gap-4 rounded-lg px-3 py-3 text-left transition ${
        selected ? "bg-accent-soft" : "hover:bg-hover"
      }`}
    >
      <span className="w-16 shrink-0 pt-0.5 text-xs text-faint tabular-nums">
        {timeLabel(note.createdAt)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{note.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm leading-relaxed text-muted">
          {note.text}
        </span>
      </span>
    </button>
  );
}
