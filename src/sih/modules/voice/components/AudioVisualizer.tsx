import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import type { LevelSource } from "../hooks/useVoiceRecording";

const SHAPE = [0.45, 0.7, 0.55, 0.9, 0.65, 1, 0.6, 0.85, 0.5];

interface AudioVisualizerProps {
  /** Only draws while recording is live. */
  active: boolean;
  levelSource: LevelSource;
  /** Providers that cannot measure level report only whether speech is heard. */
  speechActive: boolean;
}

/**
 * Decorative level bars. They are hidden from assistive technology: the
 * recording state is always available as text ("Listening...", the timer).
 * With reduced motion the bars stop moving and show a fixed shape.
 */
export default function AudioVisualizer({ active, levelSource, speechActive }: AudioVisualizerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [level, setLevel] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    return levelSource.subscribe(setLevel);
  }, [active, levelSource]);

  if (!active) return null;

  const effective = reducedMotion ? 0.5 : (level ?? (speechActive ? 0.7 : 0.25));
  return (
    <div aria-hidden="true" data-testid="audio-visualizer" className="flex h-12 items-end justify-center gap-1.5">
      {SHAPE.map((weight, index) => (
        <span
          key={index}
          className={`w-2 rounded-full bg-rose-700 dark:bg-rose-300 ${
            reducedMotion || level !== null ? "" : "motion-safe:animate-pulse"
          } ${reducedMotion ? "" : "motion-safe:transition-[height] motion-safe:duration-100"}`}
          style={{ height: `${20 + Math.round(effective * weight * 80)}%`, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </div>
  );
}
