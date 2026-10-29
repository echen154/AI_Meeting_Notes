import type { MicStatus } from "../types";

const CONFIG: Record<MicStatus, { label: string; dot: string; pulse?: boolean }> = {
  idle: { label: "Ready", dot: "bg-faint" },
  "requesting-permission": { label: "Requesting microphone…", dot: "bg-amber-400", pulse: true },
  recording: { label: "Listening", dot: "bg-rec", pulse: true },
  stopped: { label: "Stopped", dot: "bg-faint" },
  denied: { label: "Microphone permission denied", dot: "bg-rec" },
  unsupported: { label: "Microphone capture not supported in this browser", dot: "bg-rec" },
  error: { label: "Something went wrong", dot: "bg-rec" },
};

export function StatusIndicator({ status }: { status: MicStatus }) {
  const config = CONFIG[status];
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted">
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full ${config.dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`} />
      </span>
      {config.label}
    </div>
  );
}
