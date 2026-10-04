import { useEffect, useRef, useState } from "react";

/**
 * Tracks a value across renders and flips to `true` for `durationMs`
 * whenever it changes (skipping the very first render, so nothing
 * flashes just because the page loaded). Used to trigger the subtle
 * "status just changed" highlight animation on the public status page
 * -- see StatusPage.tsx -- without reaching for an animation library
 * for what's fundamentally a one-shot timed boolean.
 */
export function useHighlightOnChange<T>(value: T, durationMs = 1000): boolean {
  const [highlight, setHighlight] = useState(false);
  const previous = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previous.current = value;
      return;
    }
    if (previous.current !== value) {
      previous.current = value;
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), durationMs);
      return () => clearTimeout(timer);
    }
  }, [value, durationMs]);

  return highlight;
}
