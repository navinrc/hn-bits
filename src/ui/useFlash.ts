import { useRef, useState } from 'react';

const FLASH_MS = 1500;

/** Transient status text (e.g. "bookmarked ✓") that self-clears after FLASH_MS. */
export function useFlash(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  function flash(text: string): void {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), FLASH_MS);
  }

  return [message, flash];
}
