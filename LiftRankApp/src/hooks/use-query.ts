import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useQuery<T>(fn: () => Promise<T>): {
  data: T | null;
  reload: () => Promise<void>;
} {
  const [data, setData] = useState<T | null>(null);
  const fnRef = useRef(fn);
  /** Identifica a requisição mais recente: respostas antigas são descartadas. */
  const latestRequest = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const result = await fnRef.current();
    if (requestId === latestRequest.current) {
      setData(result);
    }
  }, []);

  const runInBackground = useCallback(() => {
    run().catch((error) => {
      if (__DEV__) console.warn('[useQuery] falha ao recarregar', error);
    });
  }, [run]);

  useEffect(() => {
    fnRef.current = fn;
    runInBackground();
  }, [fn, runInBackground]);

  useFocusEffect(
    useCallback(() => {
      runInBackground();
    }, [runInBackground]),
  );

  return { data, reload: run };
}

export function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseDecimal(input: string) {
  const normalized = input.replace(',', '.').replace(/[^\d.]/g, '');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : 0;
}
