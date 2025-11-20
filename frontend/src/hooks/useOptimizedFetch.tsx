'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface FetchOptions {
  cacheTime?: number; // Cache duration in milliseconds
  staleTime?: number; // Time before data is considered stale
  retry?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries
}

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastFetched: number | null;
}

const cache = new Map<string, { data: any; timestamp: number }>();

export function useOptimizedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: FetchOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default cache
    staleTime = 30 * 1000, // 30 seconds default stale time
    retry = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: false,
    error: null,
    lastFetched: null
  });

  const abortControllerRef = useRef<AbortController>();
  const retryCountRef = useRef(0);

  const executeRequest = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await fetchFn();
      
      if (signal?.aborted) return;

      // Cache the result
      cache.set(key, { data: result, timestamp: Date.now() });
      
      setState(prev => ({
        ...prev,
        data: result,
        loading: false,
        error: null,
        lastFetched: Date.now()
      }));
      
      retryCountRef.current = 0;
    } catch (error) {
      if (signal?.aborted) return;

      if (retryCountRef.current < retry) {
        retryCountRef.current++;
        setTimeout(() => {
          if (!signal?.aborted) {
            executeRequest(signal);
          }
        }, retryDelay * retryCountRef.current);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Unknown error')
        }));
        retryCountRef.current = 0;
      }
    }
  }, [key, fetchFn, retry, retryDelay]);

  const refetch = useCallback((force = false) => {
    // Check cache first
    const cached = cache.get(key);
    const now = Date.now();
    
    if (!force && cached && (now - cached.timestamp) < cacheTime) {
      const isStale = (now - cached.timestamp) > staleTime;
      
      setState(prev => ({
        ...prev,
        data: cached.data,
        loading: isStale, // Show loading if stale but still use cached data
        error: null,
        lastFetched: cached.timestamp
      }));
      
      if (!isStale) return Promise.resolve(cached.data);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    return executeRequest(abortControllerRef.current.signal);
  }, [key, cacheTime, staleTime, executeRequest]);

  // Initial fetch - only run once with key
  useEffect(() => {
    let mounted = true;
    
    const initialFetch = () => {
      // Check cache first
      const cached = cache.get(key);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < cacheTime) {
        if (mounted) {
          setState({
            data: cached.data,
            loading: false,
            error: null,
            lastFetched: cached.timestamp
          });
        }
        return;
      }

      if (mounted) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Create abort controller
      abortControllerRef.current = new AbortController();
      executeRequest(abortControllerRef.current.signal);
    };

    initialFetch();
    
    return () => {
      mounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, cacheTime, executeRequest]); // Fixed dependencies

  return {
    ...state,
    refetch,
    isStale: state.lastFetched ? (Date.now() - state.lastFetched) > staleTime : false
  };
}

// Optimistic update hook
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (optimisticUpdate: Partial<T>) => {
    const previousData = data;
    
    // Apply optimistic update immediately
    setData(prev => ({ ...prev, ...optimisticUpdate }));
    setIsUpdating(true);
    setError(null);

    try {
      const result = await updateFn({ ...data, ...optimisticUpdate });
      setData(result);
    } catch (err) {
      // Rollback on error
      setData(previousData);
      setError(err instanceof Error ? err : new Error('Update failed'));
    } finally {
      setIsUpdating(false);
    }
  }, [data, updateFn]);

  return { data, isUpdating, error, update };
}