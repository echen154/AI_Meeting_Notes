import { useCallback, useState } from "react";
import { HomeView } from "./components/HomeView";
import { NotesView } from "./components/NotesView";
import { Sidebar, type View } from "./components/Sidebar";
import { useMeetingSession, type CompletedSession } from "./hooks/useMeetingSession";
import { useSavedNotes } from "./hooks/useSavedNotes";

function App() {
  const library = useSavedNotes();
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const { create: createNote, setError: setLibraryError } = library;
  const handleSessionComplete = useCallback(
    async ({ text, notes }: CompletedSession) => {
      try {
        const note = await createNote({ text, summary: notes });
        setJustSavedId(note.id);
        setTimeout(() => setJustSavedId((id) => (id === note.id ? null : id)), 6000);
      } catch (err) {
        setLibraryError(err instanceof Error ? err.message : "Couldn't save the note.");
      }
    },
    [createNote, setLibraryError],
  );

  const session = useMeetingSession(handleSessionComplete);

  const openNote = (id: string) => {
    setSelectedId(id);
    setView("notes");
    setJustSavedId(null);
  };

  const errorMessage = session.errorMessage ?? library.error;

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink md:h-screen md:flex-row">
      <Sidebar
        view={view}
        onNavigate={setView}
        noteCount={library.notes.length}
        serviceStatus={session.serviceStatus}
      />

      <main className="flex min-h-0 flex-1 flex-col md:overflow-y-auto">
        {errorMessage && (
          <div className="mx-5 mt-5 rounded-lg border border-rec/30 bg-rec/10 px-4 py-2.5 text-sm text-rec md:mx-10">
            {errorMessage}
          </div>
        )}

        {view === "home" ? (
          <HomeView
            status={session.status}
            transcript={session.transcript}
            liveNotes={session.notes}
            isTranscribing={session.isTranscribing}
            isUpdatingNotes={session.isUpdatingNotes}
            savedNotes={library.notes}
            onStart={session.start}
            onStop={session.stop}
            onOpenNote={openNote}
          />
        ) : (
          <NotesView
            notes={library.notes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSave={library.update}
            onDelete={library.remove}
          />
        )}
      </main>

      {justSavedId && (
        <div className="fixed right-5 bottom-5 flex items-center gap-3 rounded-full bg-ink py-2 pr-2 pl-4 text-sm text-paper shadow-lg">
          Saved to Notes
          <button
            onClick={() => openNote(justSavedId)}
            className="rounded-full bg-paper/15 px-3 py-1 font-medium transition hover:bg-paper/25"
          >
            Open
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
