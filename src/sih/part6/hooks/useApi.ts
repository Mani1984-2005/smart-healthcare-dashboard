import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";

interface Settled<T> {
  key: string;
  data?: T;
  error?: ApiError;
}

/**
 * Data-loading hook with explicit states. `loading` is DERIVED (result key != current key), so changing
 * inputs or calling reload() shows the loading state without setting state synchronously inside an effect.
 * Pass `enabled=false` to skip the request.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[], enabled = true) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const fetchRef = useRef(fetcher);
  useEffect(() => {
    fetchRef.current = fetcher;
  });
  const key = `${JSON.stringify(deps)}#${tick}`;

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchRef
      .current()
      .then((data) => !cancelled && setSettled({ key, data }))
      .catch((e: unknown) => !cancelled && setSettled({ key, error: e instanceof ApiError ? e : new ApiError(0, "ERROR", "Unexpected error.") }));
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = settled && settled.key === key ? settled : null;
  return {
    data: current?.data as T | undefined,
    error: current?.error,
    loading: enabled && !current,
    reload,
  };
}
