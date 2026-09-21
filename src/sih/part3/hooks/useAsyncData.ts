import { useEffect, useRef, useState } from "react";

interface Settled<T> { baseKey: string; fullKey: string; data?: T; error?: unknown }

/**
 * Loads data for `key` (pass null to skip). Data from a previous key is never shown for a new key
 * (important: never show one patient's data under another), but is kept while the SAME key reloads.
 */
export function useAsyncData<T>(key: string | null, loader: () => Promise<T>) {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [version, setVersion] = useState(0);
  const fullKey = key === null ? null : `${key}#${version}`;
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });

  useEffect(() => {
    if (key === null || fullKey === null) return undefined;
    let cancelled = false;
    loaderRef.current().then(
      (data) => { if (!cancelled) setSettled({ baseKey: key, fullKey, data }); },
      (error: unknown) => { if (!cancelled) setSettled({ baseKey: key, fullKey, error }); },
    );
    return () => { cancelled = true; };
  }, [key, fullKey]);

  const sameBase = settled !== null && settled.baseKey === key;
  const done = settled !== null && settled.fullKey === fullKey;
  return {
    data: sameBase ? settled.data : undefined,
    error: done ? settled.error : undefined,
    loading: key !== null && !done,
    reload: () => setVersion((v) => v + 1),
  };
}
