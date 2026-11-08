import { useCallback, useEffect, useState } from "react";
import {
  createSavedNote,
  deleteSavedNote,
  fetchSavedNotes,
  updateSavedNote,
} from "../lib/api";
import {
  createBrowserNote,
  deleteBrowserNote,
  listBrowserNotes,
  updateBrowserNote,
} from "../lib/browserNotes";
import type { MeetingNotes, SavedNote } from "../types";

// Saved notes live on the server (data/notes.json) when running locally, or in
// the browser when the server is hosted. Both expose the same async calls.
const stores = {
  server: {
    list: fetchSavedNotes,
    create: createSavedNote,
    update: updateSavedNote,
    remove: deleteSavedNote,
  },
  browser: {
    list: async () => listBrowserNotes(),
    create: async (input: { text: string; summary: MeetingNotes }) => createBrowserNote(input),
    update: async (id: string, changes: { title?: string; text?: string }) =>
      updateBrowserNote(id, changes),
    remove: async (id: string) => deleteBrowserNote(id),
  },
};

export function useSavedNotes(storage: "server" | "browser") {
  const store = stores[storage];
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    store
      .list()
      .then(setNotes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [store]);

  const create = useCallback(
    async (input: { text: string; summary: MeetingNotes }) => {
      const note = await store.create(input);
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    [store],
  );

  const update = useCallback(
    async (id: string, changes: { title?: string; text?: string }) => {
      const note = await store.update(id, changes);
      setNotes((prev) => prev.map((n) => (n.id === id ? note : n)));
      return note;
    },
    [store],
  );

  const remove = useCallback(
    async (id: string) => {
      await store.remove(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    [store],
  );

  return { notes, isLoading, error, setError, create, update, remove };
}
