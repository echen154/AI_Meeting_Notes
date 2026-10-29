import { NOTE_SECTIONS, hasAnyNotes } from "../lib/formatNotes";
import type { MeetingNotes } from "../types";

export function SummarySections({
  notes,
  emptyText = "The AI summary will appear here as the conversation goes on.",
}: {
  notes: MeetingNotes;
  emptyText?: string;
}) {
  if (!hasAnyNotes(notes)) {
    return <p className="text-sm text-faint">{emptyText}</p>;
  }

  return (
    <div className="space-y-5">
      {NOTE_SECTIONS.map(({ key, heading }) => {
        const items = notes[key];
        if (items.length === 0) return null;
        return (
          <section key={key}>
            <h4 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              {heading}
            </h4>
            <ul className="space-y-1.5 text-[15px] leading-relaxed text-ink">
              {items.map((item, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-faint" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
