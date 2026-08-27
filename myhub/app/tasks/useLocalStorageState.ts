"use client";

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listenersByKey = new Map<string, Set<Listener>>();
const cache = new Map<string, unknown>();

function readFromStorage<T>(key: string, initial: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  let value = initial;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) value = JSON.parse(raw) as T;
  } catch {
    // corrupt or inaccessible storage — fall back to the initial value
  }
  cache.set(key, value);
  return value;
}

function notify(key: string) {
  listenersByKey.get(key)?.forEach((listener) => listener());
}

// Reads/writes a value in localStorage, exposed as external React state via
// useSyncExternalStore — avoids the SSR hydration mismatch (and the
// effect-based setState anti-pattern) that a plain useEffect read would cause.
export function useLocalStorageState<T>(key: string, initial: T) {
  const subscribe = useCallback(
    (listener: Listener) => {
      let set = listenersByKey.get(key);
      if (!set) {
        set = new Set();
        listenersByKey.set(key, set);
      }
      set.add(listener);
      return () => set.delete(listener);
    },
    [key]
  );

  const getSnapshot = useCallback(() => readFromStorage(key, initial), [key, initial]);
  const getServerSnapshot = useCallback(() => initial, [initial]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setState = useCallback(
    (updater: T | ((prev: T) => T)) => {
      const prev = readFromStorage(key, initial);
      const next = typeof updater === "function" ? (updater as (p: T) => T)(prev) : updater;
      cache.set(key, next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage unavailable (private mode, quota) — in-memory cache still updates
      }
      notify(key);
    },
    [key, initial]
  );

  return [state, setState] as const;
}
