'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useSimpleFetch<T>(
  fetchFn: () => Promise<T>,
  deps: React.DependencyList = []
) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null
  });

  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const execute = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Increment request ID to handle race conditions
    const currentRequestId = ++requestIdRef.current;

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const result = await fetchFn();
      
      // Only update state if this is still the latest request and component is mounted
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setState({
          data: result,
          loading: false,
          error: null
        });
      }
    } catch (error) {
      // Only update error if this is still the latest request and component is mounted
      if (isMountedRef.current && 
          currentRequestId === requestIdRef.current && 
          !abortControllerRef.current?.signal.aborted) {
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
    execute();

    return () => {
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