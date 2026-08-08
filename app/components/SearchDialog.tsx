"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Utterance } from "../lib/types";
import { TARGET_LANGUAGES, getLanguage } from "../lib/languages";
import { CloseIcon, SearchIcon } from "./icons";

type SearchDialogProps = {
  onClose: () => void;
  utterances: Utterance[];
  onSelect: (id: string) => void;
};

type Hit = {
  utterance: Utterance;
  /** Language code whose translation matched, if the hit wasn't the transcript. */
  matchedLang?: string;
  snippet: string;
};

/** Wrap the first occurrence of `query` (case-insensitive) in a <mark>. */
function highlight(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/**
 * Centered command-palette-style search over the session's transcripts and
 * their translations. Opens via the sidebar button or ⌘K / Ctrl+K.
 */
export function SearchDialog({
  onClose,
  utterances,
  onSelect,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // The dialog mounts fresh on each open, so state starts clean; just focus
  // the input after the entrance frame.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  const q = query.trim().toLowerCase();

  const hits = useMemo<Hit[]>(() => {
    const ordered = [...utterances]
      .reverse()
      .filter((u) => u.transcript);

    if (!q) {
      return ordered.map((u) => ({
        utterance: u,
        snippet: u.transcript as string,
      }));
    }

    const out: Hit[] = [];
    for (const u of ordered) {
      if ((u.transcript as string).toLowerCase().includes(q)) {
        out.push({ utterance: u, snippet: u.transcript as string });
        continue;
      }
      const lang = TARGET_LANGUAGES.find(
        (l) => u.translations[l.code]?.text?.toLowerCase().includes(q),
      );
      if (lang) {
        out.push({
          utterance: u,
          matchedLang: lang.code,
          snippet: u.translations[lang.code].text as string,
        });
      }
    }
    return out;
  }, [utterances, q]);

  // Clamp during render so a shrinking result set never leaves a stale index.
  const activeIdx = hits.length ? Math.min(active, hits.length - 1) : 0;

  const choose = (i: number) => {
    const hit = hits[i];
    if (hit) onSelect(hit.utterance.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(Math.min(activeIdx + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(activeIdx - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(activeIdx);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Rechercher dans vos discussions"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop */}
      <button
        aria-label="Fermer la recherche"
        onClick={onClose}
        className="animate-fade absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="animate-rise relative w-full max-w-xl overflow-hidden rounded-2xl border border-surface-border bg-bg-elevated shadow-[var(--shadow-float)]">
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-surface-border px-4">
          <SearchIcon className="size-5 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Rechercher dans vos discussions…"
            className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="scroll-soft max-h-[50vh] overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-fg-subtle">
              {utterances.some((u) => u.transcript)
                ? "Aucun résultat."
                : "Aucune transcription pour l’instant."}
            </p>
          ) : (
            <>
              {!q && (
                <div className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
                  Récents
                </div>
              )}
              <ul>
                {hits.map((hit, i) => {
                  const meta = hit.matchedLang
                    ? getLanguage(hit.matchedLang)
                    : undefined;
                  return (
                    <li key={hit.utterance.id}>
                      <button
                        onMouseMove={() => setActive(i)}
                        onClick={() => choose(i)}
                        className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          i === activeIdx ? "bg-surface" : "hover:bg-surface"
                        }`}
                      >
                        <span className="truncate text-[15px] text-fg">
                          {highlight(hit.snippet, query)}
                        </span>
                        {meta && (
                          <span className="truncate text-xs text-fg-subtle">
                            Traduction · {meta.label}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-surface-border px-4 py-2.5 text-xs text-fg-subtle">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>pour naviguer</span>
          <Kbd>↵</Kbd>
          <span>pour ouvrir</span>
          <Kbd>esc</Kbd>
          <span>pour fermer</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="grid min-w-5 place-items-center rounded border border-surface-border bg-surface px-1 py-0.5 font-mono text-[10px] text-fg-muted">
      {children}
    </kbd>
  );
}
