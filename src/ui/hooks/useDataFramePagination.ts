import { useState, useCallback } from 'react';
import type { DataFrameMetadata, DataFramePagination } from '../../types';

interface UseDataFramePaginationProps {
  initialMetadata: DataFrameMetadata;
  onPageChange: (page: number, pageSize: number) => Promise<{
    data: Record<string, unknown>[];
    pagination: DataFramePagination;
  } | null>;
}

interface UseDataFramePaginationReturn {
  data: Record<string, unknown>[];
  pagination: DataFramePagination;
  isLoading: boolean;
  error: string | null;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  setPageSize: (size: number) => Promise<void>;
}

export function useDataFramePagination({
  initialMetadata,
  onPageChange,
}: UseDataFramePaginationProps): UseDataFramePaginationReturn {
  const [data, setData] = useState<Record<string, unknown>[]>(initialMetadata.pageData);
  const [pagination, setPagination] = useState<DataFramePagination>(initialMetadata.pagination);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (page: number, pageSize: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await onPageChange(page, pageSize);
        if (result) {
          setData(result.data);
          setPagination(result.pagination);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [onPageChange]
  );

  const goToPage = useCallback(
    async (page: number) => {
      if (page < 0 || page >= pagination.totalPages) return;
      await fetchPage(page, pagination.pageSize);
    },
    [fetchPage, pagination.totalPages, pagination.pageSize]
  );

  const nextPage = useCallback(async () => {
    if (pagination.page < pagination.totalPages - 1) {
      await goToPage(pagination.page + 1);
    }
  }, [goToPage, pagination.page, pagination.totalPages]);

  const prevPage = useCallback(async () => {
    if (pagination.page > 0) {
      await goToPage(pagination.page - 1);
    }
  }, [goToPage, pagination.page]);

  const setPageSize = useCallback(
    async (size: number) => {
      await fetchPage(0, size);
    },
    [fetchPage]
  );

  return {
    data,
    pagination,
    isLoading,
    error,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  };
}
