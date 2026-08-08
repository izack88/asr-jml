"use client";

import { useState } from "react";
import { BrandOrb } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";
import {
  ChevronsIcon,
  ComposeIcon,
  HistoryIcon,
  SearchIcon,
} from "./icons";
import type { Utterance } from "../lib/types";

type SidebarProps = {
  utterances: Utterance[];
  onNewSession: () => void;
  onOpenSearch: () => void;
};

/**
 * Thin icon rail that expands into a panel with chat history.
 * Collapsed by default (Grok-style), toggled from the footer.
 */
export function Sidebar({
  utterances,
  onNewSession,
  onOpenSearch,
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  const history = [...utterances]
    .reverse()
    .filter((u) => u.transcript)
    .map((u) => ({ id: u.id, label: u.transcript as string }));

  return (
    <>
      {/* Mobile backdrop: tap to collapse the overlaid sidebar. */}
      {expanded && (
        <div
          aria-hidden
          onClick={() => setExpanded(false)}
          className="animate-fade fixed inset-0 z-30 bg-black/40 sm:hidden"
        />
      )}

      <aside
        className={`z-40 flex h-screen shrink-0 flex-col border-r border-surface-border bg-bg transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          expanded
            ? "fixed inset-y-0 left-0 w-64 shadow-[var(--shadow-float)] sm:relative sm:shadow-none"
            : "relative w-[68px]"
        }`}
      >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <BrandOrb className="size-7 shrink-0" />
        {expanded && (
          <span className="animate-fade truncate text-[15px] font-semibold tracking-tight">
            Fɔngbè <span className="font-normal text-fg-subtle">Voice</span>
          </span>
        )}
      </div>

      {/* Primary actions */}
      <nav className="flex flex-col gap-1 px-3 py-2">
        <RailButton
          expanded={expanded}
          label="Nouvelle session"
          onClick={onNewSession}
          icon={<ComposeIcon className="size-5" />}
        />
        <RailButton
          expanded={expanded}
          label="Rechercher"
          onClick={onOpenSearch}
          icon={<SearchIcon className="size-5" />}
        />
        <RailButton
          expanded={expanded}
          label="Historique"
          onClick={onOpenSearch}
          icon={<HistoryIcon className="size-5" />}
        />
      </nav>

      {/* History list (only when expanded) */}
      {expanded && (
        <div className="scroll-soft mt-2 flex-1 overflow-y-auto px-3">
          <div className="px-2 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
            Récents
          </div>
          {history.length === 0 ? (
            <p className="px-2 text-sm text-fg-subtle">
              Vos transcriptions apparaîtront ici.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {history.map((h) => (
                <li key={h.id}>
                  <button className="w-full cursor-pointer truncate rounded-lg px-2.5 py-2 text-left text-sm text-fg-muted transition-colors hover:bg-surface hover:text-fg">
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!expanded && <div className="flex-1" />}

      {/* Theme switch */}
      <div className="px-3 pb-1">
        <ThemeToggle expanded={expanded} />
      </div>

      {/* Footer: avatar + collapse toggle */}
      <div className="flex items-center justify-between gap-2 border-t border-surface-border p-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-xs font-medium text-fg-muted">
            ZI
          </span>
          {expanded && (
            <span className="animate-fade text-sm text-fg-muted">Compte</span>
          )}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Réduire le menu" : "Étendre le menu"}
          className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface hover:text-fg"
        >
          <ChevronsIcon
            className={`size-4 transition-transform duration-300 ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>
      </aside>
    </>
  );
}

function RailButton({
  expanded,
  label,
  icon,
  onClick,
}: {
  expanded: boolean;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={expanded ? undefined : label}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
    >
      <span className="grid size-5 shrink-0 place-items-center">{icon}</span>
      {expanded && (
        <span className="animate-fade truncate text-sm">{label}</span>
      )}
    </button>
  );
}
