"use client";

import { useEffect, useRef, useState } from "react";
import { Waveform } from "./Waveform";
import { CloseIcon, MicIcon, PlusIcon, StopIcon, UploadIcon } from "./icons";
import type { RecorderState } from "../hooks/useRecorder";

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type ComposerProps = {
  state: RecorderState;
  levels: number[];
  elapsed: number;
  busy: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onImportFile: (file: File) => void;
  /** When docked at the bottom, the "+" menu opens upward to stay on screen. */
  docked: boolean;
};

/**
 * Grok-style composer pill. Idle: a hint + a round record button.
 * Recording: the pill morphs into a live waveform with timer and controls.
 */
export function Composer({
  state,
  levels,
  elapsed,
  busy,
  onStart,
  onStop,
  onCancel,
  onImportFile,
  docked,
}: ComposerProps) {
  const recording = state === "recording";
  const requesting = state === "requesting";
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the "+" menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    setMenuOpen(false);
    if (file) onImportFile(file);
  };

  // Track the pointer so the border spotlight follows the cursor. Written
  // straight to the node (not React state) so it stays smooth and is never
  // clobbered by re-renders during recording.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  // Drive the bloom intensity from the live audio level while recording.
  const voice = recording ? (levels[levels.length - 1] ?? 0) : 0;
  useEffect(() => {
    wrapRef.current?.style.setProperty("--voice", String(voice));
  }, [voice]);

  return (
    <div ref={wrapRef} className="composer-wrap w-full">
      <div className="composer-bloom" aria-hidden />
      <div className="composer-pill relative flex items-center gap-2 rounded-[1.75rem] border border-composer-border bg-composer-bg px-2.5 py-2.5 shadow-[var(--shadow-float)] transition-all duration-300">
        {recording ? (
          <>
            <button
              onClick={onCancel}
              aria-label="Annuler l'enregistrement"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <CloseIcon className="size-5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
              <span className="shrink-0 font-mono text-sm tabular-nums text-fg-muted">
                {formatTime(elapsed)}
              </span>
              <div className="min-w-0 flex-1 overflow-hidden">
                <Waveform levels={levels} />
              </div>
            </div>

            <button
              onClick={onStop}
              aria-label="Terminer et transcrire"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-fg text-bg transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <StopIcon className="size-5" />
            </button>
          </>
        ) : (
          <>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                disabled={busy || requesting}
                aria-label="Plus d'options"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlusIcon
                  className={`size-5 transition-transform duration-200 ${
                    menuOpen ? "rotate-45" : ""
                  }`}
                />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  className={`animate-rise absolute left-0 w-64 overflow-hidden rounded-2xl border border-surface-border bg-bg-elevated p-1.5 shadow-[var(--shadow-float)] ${
                    docked ? "bottom-full mb-3" : "top-full mt-3"
                  }`}
                >
                  <button
                    role="menuitem"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface"
                  >
                    <UploadIcon className="size-5 shrink-0 text-fg-muted" />
                    <span className="min-w-0">
                      <span className="block text-sm text-fg">
                        Importer un fichier audio
                      </span>
                      {/* <span className="block text-xs text-fg-subtle">
                        MP3, WAV, M4A, OGG…
                      </span> */}
                    </span>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <span className="flex-1 select-none truncate px-1 text-[15px] text-fg-subtle">
              {busy
                ? "Transcription en cours…"
                : requesting
                  ? "Autorisation du micro…"
                  : "Parlez en fon…"}
            </span>

            <button
              onClick={onStart}
              disabled={busy || requesting}
              aria-label="Commencer à parler"
              className="group relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-full bg-fg text-bg transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? (
                <span className="size-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
              ) : (
                <MicIcon className="size-5" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
