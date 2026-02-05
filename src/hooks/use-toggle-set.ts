"use client";

import { useState, useCallback } from "react";

/**
 * Hook for managing a Set with toggle, select all, and clear operations.
 * Useful for selection states in lists.
 */
export function useToggleSet<T>(initialValue?: Iterable<T>) {
  const [set, setSet] = useState<Set<T>>(() => new Set(initialValue));

  const toggle = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  }, []);

  const add = useCallback((item: T) => {
    setSet((prev) => new Set(prev).add(item));
  }, []);

  const remove = useCallback((item: T) => {
    setSet((prev) => {
      const next = new Set(prev);
      next.delete(item);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSet(new Set());
  }, []);

  const selectAll = useCallback((items: Iterable<T>) => {
    setSet(new Set(items));
  }, []);

  const has = useCallback((item: T) => set.has(item), [set]);

  return {
    set,
    size: set.size,
    toggle,
    add,
    remove,
    clear,
    selectAll,
    has,
  };
}
