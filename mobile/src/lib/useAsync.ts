import { useEffect, useRef, useState } from "react";

type AsyncState<T> = {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  refreshing: boolean;
  reload: () => void;
  refresh: () => Promise<void>;
};

type Result<T> = { key: string | null; data: T | undefined; error: unknown };

// Minimal data loader for screens: runs `fn` on mount and whenever `deps`
// (plain values such as a slug or id) change. `reload` starts over with the
// loading state; `refresh` (pull-to-refresh) keeps the current data on
// screen while it fetches. A result is only ever applied to the request key
// it was fetched for, so a slow earlier request can't overwrite a newer one.
export function useAsync<T>(fn: () => Promise<T>, deps: (string | number | boolean | null | undefined)[]): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const key = `${JSON.stringify(deps)}:${nonce}`;
  const [result, setResult] = useState<Result<T>>({ key: null, data: undefined, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const fnRef = useRef(fn);
  const keyRef = useRef(key);

  // Declared before the loading effect so it always runs first — effects
  // run in declaration order, so a load never calls a stale fn.
  useEffect(() => {
    fnRef.current = fn;
    keyRef.current = key;
  });

  useEffect(() => {
    let cancelled = false;
    fnRef.current().then(
      (data) => {
        if (!cancelled) setResult({ key, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) setResult((prev) => ({ key, data: prev.data, error }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);

  async function refresh() {
    const requestKey = keyRef.current;
    setRefreshing(true);
    try {
      const data = await fnRef.current();
      if (requestKey === keyRef.current) setResult({ key: requestKey, data, error: null });
    } catch (error) {
      if (requestKey === keyRef.current) setResult((prev) => ({ key: requestKey, data: prev.data, error }));
    } finally {
      setRefreshing(false);
    }
  }

  const current = result.key === key;
  return {
    data: result.data,
    error: current ? result.error : null,
    loading: !current,
    refreshing,
    reload: () => setNonce((n) => n + 1),
    refresh,
  };
}

// Supabase query builders resolve to { data, error } instead of throwing;
// this turns an error into a thrown one so useAsync can surface it.
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}
