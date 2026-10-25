import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

export function useQuery<T>(fn: () => Promise<T>): {
  data: T | null;
  reload: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fnRef.current().then((result) => {
        if (alive) setData(result);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const reload = useCallback(() => {
    fnRef.current().then(setData);
  }, []);

  return { data, reload };
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
