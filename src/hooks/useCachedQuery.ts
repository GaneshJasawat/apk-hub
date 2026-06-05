import { useQuery, type UseQueryOptions, type QueryKey } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCached, setCache, isOnline } from "./offline-cache";

export function useCachedQuery<TData, TError = Error, TQueryKey extends QueryKey = QueryKey>(
  cacheKey: string,
  queryOptions: UseQueryOptions<TData, TError, TData, TQueryKey>,
) {
  const [cached, setCached] = useState<TData | null | undefined>(undefined);

  useEffect(() => {
    getCached<TData>(cacheKey).then(setCached);
  }, [cacheKey]);

  const result = useQuery({
    ...queryOptions,
    enabled: queryOptions.enabled !== false,
    retry: false,
    meta: { cacheKey },
  } as any);

  useEffect(() => {
    if (result.data && result.isSuccess) {
      setCache(cacheKey, result.data);
    }
  }, [result.data, result.isSuccess, cacheKey]);

  const data = result.data ?? cached ?? undefined;
  const isLoading = result.isLoading && cached === undefined;

  return { ...result, data, isLoading } as typeof result & { data: TData | undefined; isLoading: boolean };
}
