import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchServiceStatus,
  requestNotesUpdate,
  transcribeSegment,
} from "../lib/api";
import {
  EMPTY_NOTES,
  type MeetingNotes,
  type MicStatus,
  type ServiceStatus,
  type TranscriptEntry,
} from "../types";

const SEGMENT_MS = 8000;
const NOTES_CHECK_INTERVAL_MS = 5000;
const NOTES_MIN_INTERVAL_MS = 30000;
const NOTES_CHAR_THRESHOLD = 600;

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of CANDIDATE_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

export interface CompletedSession {
  text: string;
  notes: MeetingNotes;
}

export function useMeetingSession(
  onSessionComplete?: (session: CompletedSession) => void,
) {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [notes, setNotes] = useState<MeetingNotes>(EMPTY_NOTES);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingRef = useRef(false);
  const mimeTypeRef = useRef<string>("audio/webm");
  const isFirstSegmentRef = useRef(true);
  const transcribeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingTranscriptRef = useRef("");
  const lastNotesUpdateAtRef = useRef(0);
  const notesRef = useRef(notes);
  const notesTimerRef = useRef<number | null>(null);
  const entryIdRef = useRef(0);
  const transcriptTextRef = useRef("");
  const onCompleteRef = useRef(onSessionComplete);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    onCompleteRef.current = onSessionComplete;
  }, [onSessionComplete]);

  useEffect(() => {
    fetchServiceStatus()
      .then(setServiceStatus)
      .catch(() => setServiceStatus(null));
  }, []);

  const appendTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    entryIdRef.current += 1;
    setTranscript((prev) => [...prev, { id: entryIdRef.current, text }]);
    transcriptTextRef.current = `${transcriptTextRef.current} ${text}`.trim();
    pendingTranscriptRef.current = `${pendingTranscriptRef.current} ${text}`.trim();
  }, []);

  const runNotesUpdateIfDue = useCallback(async (force = false) => {
    const pending = pendingTranscriptRef.current;
    if (!pending) return;

    const timeSinceLast = Date.now() - lastNotesUpdateAtRef.current;
    const dueByTime = timeSinceLast >= NOTES_MIN_INTERVAL_MS;
    const dueBySize = pending.length >= NOTES_CHAR_THRESHOLD;
    if (!force && !dueByTime && !dueBySize) return;

    pendingTranscriptRef.current = "";
    setIsUpdatingNotes(true);
    try {
      const updated = await requestNotesUpdate(notesRef.current, pending);
      notesRef.current = updated;
      setNotes(updated);
      lastNotesUpdateAtRef.current = Date.now();
    } catch (err) {
      console.error(err);
      // Put the transcript back so it gets folded into the next attempt.
      pendingTranscriptRef.current = `${pending} ${pendingTranscriptRef.current}`.trim();
      setErrorMessage("Couldn't update notes just now — will retry shortly.");
    } finally {
      setIsUpdatingNotes(false);
    }
  }, []);

  const queueTranscription = useCallback(
    (blob: Blob, resetDemo: boolean) => {
      transcribeQueueRef.current = transcribeQueueRef.current.then(async () => {
        setIsTranscribing(true);
        try {
          const { text } = await transcribeSegment(
            blob,
            resetDemo,
            transcriptTextRef.current,
          );
          appendTranscript(text);
        } catch (err) {
          console.error(err);
          const reason = err instanceof Error ? err.message : "";
          setErrorMessage(`Couldn't transcribe the last audio segment. ${reason}`.trim());
        } finally {
          setIsTranscribing(false);
        }
      });
    },
    [appendTranscript],
  );

  const recordNextSegment = useCallback(
    function recordSegment() {
      if (!recordingRef.current || !streamRef.current) return;

      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: mimeTypeRef.current,
      });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeTypeRef.current });
        const resetDemo = isFirstSegmentRef.current;
        isFirstSegmentRef.current = false;
        if (blob.size > 0) queueTranscription(blob, resetDemo);

        if (recordingRef.current) recordSegment();
      };

      recorderRef.current = recorder;
      recorder.start();
      window.setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, SEGMENT_MS);
    },
    [queueTranscription],
  );

  const start = useCallback(async () => {
    setErrorMessage(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    const mimeType = pickMimeType();
    if (!mimeType) {
      setStatus("unsupported");
      return;
    }
    mimeTypeRef.current = mimeType;

    setStatus("requesting-permission");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("denied");
      return;
    }
    streamRef.current = stream;

    setTranscript([]);
    setNotes(EMPTY_NOTES);
    notesRef.current = EMPTY_NOTES;
    pendingTranscriptRef.current = "";
    transcriptTextRef.current = "";
    lastNotesUpdateAtRef.current = Date.now();
    isFirstSegmentRef.current = true;
    entryIdRef.current = 0;

    recordingRef.current = true;
    setStatus("recording");
    recordNextSegment();

    notesTimerRef.current = window.setInterval(() => {
      void runNotesUpdateIfDue();
    }, NOTES_CHECK_INTERVAL_MS);
  }, [recordNextSegment, runNotesUpdateIfDue]);

  const stop = useCallback(() => {
    recordingRef.current = false;

    if (notesTimerRef.current !== null) {
      window.clearInterval(notesTimerRef.current);
      notesTimerRef.current = null;
    }

    // The final segment is only queued once the recorder's stop event fires,
    // so wait for it before finishing up -- otherwise the tail is lost.
    const recorder = recorderRef.current;
    const finalSegmentQueued = new Promise<void>((resolve) => {
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    recorderRef.current = null;

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    setStatus("stopped");

    void finalSegmentQueued
      .then(() => transcribeQueueRef.current)
      .then(() => runNotesUpdateIfDue(true))
      .then(() => {
        const text = transcriptTextRef.current;
        if (text) onCompleteRef.current?.({ text, notes: notesRef.current });
      });
  }, [runNotesUpdateIfDue]);

  const clear = useCallback(() => {
    setTranscript([]);
    setNotes(EMPTY_NOTES);
    notesRef.current = EMPTY_NOTES;
    pendingTranscriptRef.current = "";
    transcriptTextRef.current = "";
    setErrorMessage(null);
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      recordingRef.current = false;
      if (notesTimerRef.current !== null) window.clearInterval(notesTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    status,
    transcript,
    notes,
    isTranscribing,
    isUpdatingNotes,
    serviceStatus,
    errorMessage,
    start,
    stop,
    clear,
  };
}
