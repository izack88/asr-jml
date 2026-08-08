"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/**
 * Theme store backed by the DOM: the source of truth is `data-theme` on <html>.
 * The system preference renders flash-free via the CSS media query (no JS); a
 * saved override is restored on mount. Read via useSyncExternalStore so SSR and
 * CSR stay consistent.
 */
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): Theme {
  const attr = document.documentElement.dataset.theme;
  if (attr === "dark" || attr === "light") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSnapshot(): Theme {
  return "dark";
}

function setTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    /* storage may be unavailable; ignore */
  }
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Restore a previously saved preference once mounted (system default is
  // already in effect via CSS, so there's no flash for system users).
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("theme");
    } catch {
      /* ignore */
    }
    if (
      (saved === "dark" || saved === "light") &&
      document.documentElement.dataset.theme !== saved
    ) {
      setTheme(saved);
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggle };
}
