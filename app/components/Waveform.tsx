"use client";

/**
 * Live waveform — renders rolling amplitude levels (0–1) as mirrored bars.
 * Purely presentational; the values come from useRecorder's analyser.
 */
export function Waveform({ levels }: { levels: number[] }) {
  return (
    <div
      className="flex h-12 items-center justify-center gap-[3px]"
      aria-hidden
    >
      {levels.map((level, i) => {
        const height = 8 + level * 100; // percent of track height
        return (
          <span
            key={i}
            className="w-[3px] rounded-full bg-gradient-accent transition-[height] duration-75 ease-out"
            style={{
              height: `${height}%`,
              opacity: 0.35 + level * 0.65,
            }}
          />
        );
      })}
    </div>
  );
}
