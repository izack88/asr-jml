"use client";

import { useTheme } from "../hooks/useTheme";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle({ expanded }: { expanded: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Passer en clair" : "Passer en sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
    >
      <span className="relative grid size-5 shrink-0 place-items-center">
        {/* Cross-fade the two glyphs as the theme flips */}
        <SunIcon
          className={`absolute size-5 transition-all duration-300 ${
            !isDark
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-50 opacity-0"
          }`}
        />
        <MoonIcon
          className={`absolute size-5 transition-all duration-300 ${
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-50 opacity-0"
          }`}
        />
      </span>
      {expanded && (
        <span className="animate-fade truncate text-sm">
          {isDark ? "Mode clair" : "Mode sombre"}
        </span>
      )}
    </button>
  );
}
