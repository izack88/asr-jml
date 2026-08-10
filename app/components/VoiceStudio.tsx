"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import { transcribeAudio, translateText } from "../lib/api";
import type { Utterance } from "../lib/types";
import { Composer } from "./Composer";
import { HeroLockup } from "./BrandMark";
import { SearchDialog } from "./SearchDialog";
import { Sidebar } from "./Sidebar";
import { TranscriptCard } from "./TranscriptCard";
import { MicIcon } from "./icons";

export function VoiceStudio() {
  const { state, levels, elapsed, start, stop, cancel } = useRecorder();
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Once we begin, the stage docks to the bottom and stays there.
  const active = started || utterances.length > 0 || state !== "idle" || busy;

  const patch = useCallback((id: string, update: Partial<Utterance>) => {
    setUtterances((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...update } : u)),
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [utterances.length]);

  // ⌘K / Ctrl+K toggles search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelectResult = useCallback((id: string) => {
    setSearchOpen(false);
    const el = document.getElementById(`utt-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1800);
  }, []);

  const handleStart = useCallback(() => {
    setStarted(true);
    start();
  }, [start]);

  // Shared pipeline: add a turn for the audio, then transcribe it. Used by both
  // live recording and imported files.
  const ingestAudio = useCallback(
    async (blob: Blob, durationSec: number) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      const audioUrl = URL.createObjectURL(blob);

      const turn: Utterance = {
        id,
        audioUrl,
        audioBlob: blob,
        durationSec,
        transcript: null,
        status: "transcribing",
        translations: {},
        createdAt: Date.now(),
      };
      setUtterances((prev) => [...prev, turn]);
      setBusy(true);

      try {
        const { transcript } = await transcribeAudio(blob, durationSec);
        patch(id, { transcript, status: "ready", error: undefined });
      } catch (err) {
        patch(id, { status: "error", error: errorMessage(err) });
      } finally {
        setBusy(false);
      }
    },
    [patch],
  );

  /** Re-run a transcription that failed, reusing the audio we kept. */
  const handleRetryTranscription = useCallback(
    async (utteranceId: string) => {
      const turn = utterances.find((u) => u.id === utteranceId);
      if (!turn) return;

      patch(utteranceId, {
        status: "transcribing",
        transcript: null,
        error: undefined,
      });
      setBusy(true);

      try {
        const { transcript } = await transcribeAudio(
          turn.audioBlob,
          turn.durationSec,
        );
        patch(utteranceId, {
          transcript,
          status: "ready",
          error: undefined,
        });
      } catch (err) {
        patch(utteranceId, { status: "error", error: errorMessage(err) });
      } finally {
        setBusy(false);
      }
    },
    [utterances, patch],
  );

  const handleStop = useCallback(async () => {
    const result = await stop();
    if (!result) return;
    await ingestAudio(result.blob, result.durationSec);
  }, [stop, ingestAudio]);

  const handleImportFile = useCallback(
    async (file: File) => {
      setStarted(true);
      const durationSec = await getAudioDuration(file);
      await ingestAudio(file, durationSec);
    },
    [ingestAudio],
  );

  const handleTranslate = useCallback(
    async (utteranceId: string, code: string) => {
      const turn = utterances.find((u) => u.id === utteranceId);
      if (!turn?.transcript) return;
      const existing = turn.translations[code];
      if (existing && existing.status !== "error") return;

      patch(utteranceId, {
        translations: {
          ...turn.translations,
          [code]: { code, text: null, status: "loading" },
        },
      });

      try {
        const { translation } = await translateText(turn.transcript, code);
        setUtterances((prev) =>
          prev.map((u) =>
            u.id === utteranceId
              ? {
                  ...u,
                  translations: {
                    ...u.translations,
                    [code]: { code, text: translation, status: "done" },
                  },
                }
              : u,
          ),
        );
      } catch (err) {
        const message = errorMessage(err);
        setUtterances((prev) =>
          prev.map((u) =>
            u.id === utteranceId
              ? {
                  ...u,
                  translations: {
                    ...u.translations,
                    [code]: {
                      code,
                      text: null,
                      status: "error",
                      error: message,
                    },
                  },
                }
              : u,
          ),
        );
      }
    },
    [utterances, patch],
  );

  const handleNewSession = useCallback(() => {
    if (state === "recording") cancel();
    utterances.forEach((u) => URL.revokeObjectURL(u.audioUrl));
    setUtterances([]);
    setBusy(false);
    setStarted(false);
  }, [state, cancel, utterances]);

  return (
    <div className="flex h-screen w-full">
      <Sidebar
        utterances={utterances}
        onNewSession={handleNewSession}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {searchOpen && (
        <SearchDialog
          onClose={() => setSearchOpen(false)}
          utterances={utterances}
          onSelect={handleSelectResult}
        />
      )}

      <main className="relative flex h-screen flex-1 flex-col overflow-hidden">
        {!active && <div className="brand-glow animate-fade" />}

        <span className="pointer-events-none absolute right-5 top-5 z-30 rounded-full border border-surface-border px-2.5 py-1 text-xs text-fg-subtle">
          Aperçu
        </span>

        {/* Scrollable transcript log */}
        <div className="scroll-soft relative z-10 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-48 pt-20">
            {utterances.map((u) => (
              <TranscriptCard
                key={u.id}
                utterance={u}
                onTranslate={(code) => handleTranslate(u.id, code)}
                onRetryTranscription={() => handleRetryTranscription(u.id)}
                highlighted={highlightId === u.id}
              />
            ))}
            {state === "denied" && <DeniedNotice />}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Bottom mask so scrolled content fades under the docked composer */}
        {active && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-bg via-bg/95 to-transparent" />
        )}

        {/* Stage: hero + composer, centered when idle, docked when active */}
        <div
          className="stage absolute inset-x-0 z-20"
          style={
            active
              ? { top: "100%", transform: "translateY(calc(-100% - 16px))" }
              : { top: "50%", transform: "translateY(-50%)" }
          }
        >
          <div className="mx-auto w-full max-w-2xl px-4">
            <div
              className={`brand-collapse overflow-hidden ${
                active
                  ? "max-h-0 -translate-y-2 opacity-0"
                  : "max-h-48 translate-y-0 opacity-100"
              }`}
            >
              <div className="flex flex-col items-center pb-8 text-center">
                <HeroLockup />
                <p className="mt-4 max-w-sm text-pretty text-[15px] leading-relaxed text-fg-muted">
                  Parlez, on transcrit en fon, puis on traduit.
                </p>
              </div>
            </div>

            <Composer
              state={state}
              levels={levels}
              elapsed={elapsed}
              busy={busy}
              onStart={handleStart}
              onStop={handleStop}
              onCancel={cancel}
              onImportFile={handleImportFile}
              docked={active}
            />

            <p className="mt-3 text-center text-xs text-fg-subtle">
              Transcription et traductions fournies à titre indicatif.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * The message to show for a thrown value. Our api helpers already throw
 * reader-ready French; anything else gets a neutral fallback.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return "Une erreur inattendue est survenue.";
}

/** Best-effort duration (seconds) of an audio file; resolves 0 if unknown. */
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "metadata";
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}

function DeniedNotice() {
  return (
    <div className="animate-rise flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-4 text-sm text-fg-muted">
      <MicIcon className="size-5 shrink-0 text-accent-2" />
      <span>
        L&apos;accès au microphone a été refusé. Autorisez-le dans votre
        navigateur pour enregistrer.
      </span>
    </div>
  );
}
