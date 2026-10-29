import { useCallback, useEffect, useState } from "react";
import {
  createSavedNote,
  deleteSavedNote,
  fetchSavedNotes,
  updateSavedNote,
} from "../lib/api";
import type { MeetingNotes, SavedNote } from "../types";

export function useSavedNotes() {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedNotes()
      .then(setNotes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  const create = useCallback(async (input: { text: string; summary: MeetingNotes }) => {
    const note = await createSavedNote(input);
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const update = useCallback(
    async (id: string, changes: { title?: string; text?: string }) => {
      const note = await updateSavedNote(id, changes);
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    await deleteSavedNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notes, isLoading, error, setError, create, update, remove };
}
