import type { ReactNode } from "react";
import type { ServiceStatus } from "../types";

export type View = "home" | "notes";

function HomeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
      <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1V9.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
      <rect x="4" y="3" width="12" height="14" rx="2" />
      <path d="M7 7.5h6M7 10.5h6M7 13.5h3.5" strokeLinecap="round" />
    </svg>
  );
}

function WaveMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
      {[3, 7, 11, 15, 19].map((x, i) => {
        const h = [6, 12, 16, 10, 5][i];
        return <rect key={x} x={x} y={12 - h / 2} width="2.2" height={h} rx="1.1" />;
      })}
    </svg>
  );
}

export function Sidebar({
  view,
  onNavigate,
  noteCount,
  serviceStatus,
}: {
  view: View;
  onNavigate: (view: View) => void;
  noteCount: number;
  serviceStatus: ServiceStatus | null;
}) {
  const items: { id: View; label: string; icon: ReactNode; badge?: number }[] = [
    { id: "home", label: "Home", icon: <HomeIcon /> },
    { id: "notes", label: "Notes", icon: <NotesIcon />, badge: noteCount },
  ];

  const demoParts = [
    serviceStatus?.sttMode === "demo" && "simulated transcript",
    serviceStatus?.llmMode === "demo" && "basic cleanup & summary",
  ].filter(Boolean);

  return (
    <aside className="flex shrink-0 flex-col border-line bg-sidebar md:h-screen md:w-60 md:border-r">
      <div className="flex items-center gap-2 px-5 pt-5 pb-3 text-ink md:pt-6 md:pb-6">
        <WaveMark />
        <span className="font-serif text-2xl leading-none">Meeting Notes</span>
      </div>

      <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
        {items.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-card font-medium text-ink shadow-sm" : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              {item.icon}
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? <span className="text-xs text-faint">{item.badge}</span> : null}
            </button>
          );
        })}
      </nav>

      {demoParts.length > 0 && (
        <div className="mx-3 mt-auto mb-4 hidden rounded-lg border border-line bg-card px-3 py-2.5 text-xs leading-relaxed text-muted md:block">
          <span className="font-medium text-ink">Demo mode</span>
          <br />
          Using {demoParts.join(" and ")}. Add API keys in .env for the real thing.
        </div>
      )}
    </aside>
  );
}
