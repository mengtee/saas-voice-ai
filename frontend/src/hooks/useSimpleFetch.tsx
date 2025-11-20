'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useSimpleFetch<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null
  });

  const abortControllerRef = useRef<AbortController>();
  const isMountedRef = useRef(true);

  const execute = useCallback(async () => {
    if (!isMountedRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await fetchFn();
      
      if (isMountedRef.current) {
        setState({
          data: result,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      if (isMountedRef.current && !abortControllerRef.current?.signal.aborted) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error')
        }));
      }
    }
  }, deps);

  const refetch = useCallback((force = true) => {
    if (force || !state.data) {
      return execute();
    }
  }, [execute, state.data]);

  useEffect(() => {
    isMountedRef.current = true;
    execute();

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, deps);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { ...state, refetch };
}