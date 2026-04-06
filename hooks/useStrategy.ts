"use client";

import { useCallback, useEffect, useState } from "react";

import type { Strategy } from "@/types";

export function useStrategy() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/strategy");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Error al cargar estrategia");
        setStrategy(null);
        return;
      }
      setStrategy(json.strategy ?? null);
    } catch {
      setError("Error de red");
      setStrategy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { strategy, loading, error, refetch };
}
