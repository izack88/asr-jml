"use client";

import { useState } from "react";
import type { Utterance } from "../lib/types";
import {
  SOURCE_LANGUAGE,
  TARGET_LANGUAGES,
  getLanguage,
} from "../lib/languages";
import { CheckIcon, CopyIcon, PlayIcon } from "./icons";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      aria-label="Copier le texte"
      className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-border hover:text-fg"
    >
      {copied ? (
        <CheckIcon className="size-4 text-accent" />
      ) : (
        <CopyIcon className="size-4" />
      )}
    </button>
  );
}

function LanguageBadge({ short }: { short: string }) {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft font-mono text-xs font-medium text-accent">
      {short}
    </span>
  );
}

type TranscriptCardProps = {
  utterance: Utterance;
  onTranslate: (code: string) => void;
  /** Briefly ringed when navigated to from search. */
  highlighted?: boolean;
};

export function TranscriptCard({
  utterance,
  onTranslate,
  highlighted = false,
}: TranscriptCardProps) {
  const transcribing = utterance.status === "transcribing";
  const activeTranslations = TARGET_LANGUAGES.filter(
    (l) => utterance.translations[l.code],
  );

  return (
    <article
      id={`utt-${utterance.id}`}
      className={`animate-rise scroll-mt-24 rounded-[1.5rem] border bg-bg-elevated p-5 transition-[box-shadow,border-color] duration-500 sm:p-6 ${
        highlighted
          ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]"
          : "border-surface-border"
      }`}
    >
      {/* Transcript header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LanguageBadge short={SOURCE_LANGUAGE.short} />
          <div className="leading-tight">
            <div className="text-sm font-medium">
              {SOURCE_LANGUAGE.endonym}
            </div>
            <div className="text-xs text-fg-subtle">Transcription</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <audio src={utterance.audioUrl} className="hidden" id={utterance.id} />
          <button
            onClick={() => {
              const el = document.getElementById(
                utterance.id,
              ) as HTMLAudioElement | null;
              el?.play();
            }}
            aria-label="Réécouter"
            className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-border hover:text-fg"
          >
            <PlayIcon className="size-3.5" />
          </button>
          {utterance.transcript && <CopyButton text={utterance.transcript} />}
        </div>
      </div>

      {/* Transcript body */}
      {transcribing ? (
        <div className="space-y-2.5">
          <div className="shimmer h-4 w-11/12 rounded-full bg-surface-border" />
          <div className="shimmer h-4 w-3/4 rounded-full bg-surface-border" />
        </div>
      ) : (
        <p className="text-lg leading-relaxed text-fg">
          {utterance.transcript}
        </p>
      )}

      {/* Translation controls */}
      {!transcribing && utterance.transcript && (
        <div className="mt-5 border-t border-surface-border pt-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
              Traduire
            </span>
            {TARGET_LANGUAGES.map((lang) => {
              const t = utterance.translations[lang.code];
              const active = !!t;
              return (
                <button
                  key={lang.code}
                  onClick={() => onTranslate(lang.code)}
                  disabled={t?.status === "loading"}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 disabled:opacity-60 ${
                    active
                      ? "border-transparent bg-accent-soft text-accent"
                      : "border-surface-border text-fg-muted hover:border-accent hover:text-fg"
                  }`}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>

          {/* Translation results */}
          {activeTranslations.length > 0 && (
            <div className="space-y-2.5">
              {activeTranslations.map((lang) => {
                const t = utterance.translations[lang.code];
                const meta = getLanguage(lang.code)!;
                return (
                  <div
                    key={lang.code}
                    className="animate-rise flex gap-3 rounded-2xl bg-surface p-3.5"
                  >
                    <LanguageBadge short={meta.short} />
                    <div className="min-w-0 flex-1">
                      <div className="mb-0.5 text-xs text-fg-subtle">
                        {meta.endonym}
                      </div>
                      {t.status === "loading" ? (
                        <div className="space-y-2 pt-1">
                          <div className="shimmer h-3.5 w-4/5 rounded-full bg-surface-border" />
                          <div className="shimmer h-3.5 w-2/3 rounded-full bg-surface-border" />
                        </div>
                      ) : t.status === "error" ? (
                        <p className="text-sm text-accent-2">
                          Traduction indisponible.
                        </p>
                      ) : (
                        <p className="text-[15px] leading-relaxed text-fg">
                          {t.text}
                        </p>
                      )}
                    </div>
                    {t.status === "done" && t.text && (
                      <CopyButton text={t.text} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
