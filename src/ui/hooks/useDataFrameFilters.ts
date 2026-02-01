import { useState, useCallback, useMemo } from 'react';
import type {
  DataFrameFilter,
  DataFrameSort,
  DataFrameColumn,
  FilterOperator,
} from '../../types';

interface UseDataFrameFiltersProps {
  columns: DataFrameColumn[];
}

interface UseDataFrameFiltersReturn {
  filters: DataFrameFilter[];
  sort: DataFrameSort | null;
  addFilter: (filter: DataFrameFilter) => void;
  removeFilter: (column: string) => void;
  updateFilter: (column: string, updates: Partial<DataFrameFilter>) => void;
  clearFilters: () => void;
  setSort: (sort: DataFrameSort | null) => void;
  toggleSort: (column: string) => void;
  applyFiltersAndSort: (data: Record<string, unknown>[]) => Record<string, unknown>[];
}

/**
 * Convert value to string for comparison
 */
function toStringValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

/**
 * Convert value to number for comparison
 */
function toNumberValue(value: unknown): number {
  if (value === null || value === undefined) {
    return NaN;
  }
  if (typeof value === 'number') {
    return value;
  }
  return parseFloat(String(value));
}

/**
 * Check if a value is null or undefined
 */
function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

/**
 * Helper function to match filter against value
 */
function matchesFilter(value: unknown, filter: DataFrameFilter): boolean {
  const { operator, value: filterValue } = filter;

  // Handle null checks first
  if (operator === 'is_null') {
    return isNullish(value);
  }

  if (operator === 'is_not_null') {
    return !isNullish(value);
  }

  // For other operators, null values don't match
  if (isNullish(value)) {
    return false;
  }

  switch (operator) {
    case 'equals': {
      const strValue = toStringValue(value).toLowerCase();
      const strFilter = toStringValue(filterValue).toLowerCase();
      return strValue === strFilter;
    }

    case 'not_equals': {
      const strValue = toStringValue(value).toLowerCase();
      const strFilter = toStringValue(filterValue).toLowerCase();
      return strValue !== strFilter;
    }

    case 'contains': {
      const strValue = toStringValue(value).toLowerCase();
      const strFilter = toStringValue(filterValue).toLowerCase();
      return strValue.includes(strFilter);
    }

    case 'starts_with': {
      const strValue = toStringValue(value).toLowerCase();
      const strFilter = toStringValue(filterValue).toLowerCase();
      return strValue.startsWith(strFilter);
    }

    case 'ends_with': {
      const strValue = toStringValue(value).toLowerCase();
      const strFilter = toStringValue(filterValue).toLowerCase();
      return strValue.endsWith(strFilter);
    }

    case 'greater_than': {
      const numValue = toNumberValue(value);
      const numFilter = toNumberValue(filterValue);
      if (isNaN(numValue) || isNaN(numFilter)) {
        return false;
      }
      return numValue > numFilter;
    }

    case 'less_than': {
      const numValue = toNumberValue(value);
      const numFilter = toNumberValue(filterValue);
      if (isNaN(numValue) || isNaN(numFilter)) {
        return false;
      }
      return numValue < numFilter;
    }

    case 'between': {
      if (!Array.isArray(filterValue) || filterValue.length !== 2) {
        return false;
      }
      const numValue = toNumberValue(value);
      const [min, max] = filterValue as [number, number];
      if (isNaN(numValue) || isNaN(min) || isNaN(max)) {
        return false;
      }
      return numValue >= min && numValue <= max;
    }

    default:
      return true;
  }
}

/**
 * Compare two values for sorting
 */
function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  // Handle null/undefined
  if (isNullish(a) && isNullish(b)) return 0;
  if (isNullish(a)) return multiplier; // nulls last in asc, first in desc
  if (isNullish(b)) return -multiplier;

  // Try numeric comparison first
  const numA = toNumberValue(a);
  const numB = toNumberValue(b);

  if (!isNaN(numA) && !isNaN(numB)) {
    return (numA - numB) * multiplier;
  }

  // Fall back to string comparison
  const strA = toStringValue(a).toLowerCase();
  const strB = toStringValue(b).toLowerCase();

  return strA.localeCompare(strB) * multiplier;
}

/**
 * React hook for client-side DataFrame filtering and sorting
 *
 * This hook manages filter and sort state for DataFrame viewing.
 * Filtering and sorting are VIEW-ONLY - they don't modify the underlying data,
 * just filter what's displayed on the current page.
 */
export function useDataFrameFilters({
  columns,
}: UseDataFrameFiltersProps): UseDataFrameFiltersReturn {
  const [filters, setFilters] = useState<DataFrameFilter[]>([]);
  const [sort, setSort] = useState<DataFrameSort | null>(null);

  // Get valid column names for validation
  const validColumnNames = useMemo(
    () => new Set(columns.map((col) => col.name)),
    [columns]
  );

  /**
   * Add a new filter for a column
   * Replaces existing filter for the same column
   */
  const addFilter = useCallback(
    (filter: DataFrameFilter) => {
      if (!validColumnNames.has(filter.column)) {
        console.warn(`Invalid column name: ${filter.column}`);
        return;
      }

      setFilters((prev) => {
        // Remove existing filter for this column and add new one
        const filtered = prev.filter((f) => f.column !== filter.column);
        return [...filtered, filter];
      });
    },
    [validColumnNames]
  );

  /**
   * Remove filter for a specific column
   */
  const removeFilter = useCallback((column: string) => {
    setFilters((prev) => prev.filter((f) => f.column !== column));
  }, []);

  /**
   * Update an existing filter
   */
  const updateFilter = useCallback(
    (column: string, updates: Partial<DataFrameFilter>) => {
      setFilters((prev) =>
        prev.map((f) => {
          if (f.column !== column) return f;
          return { ...f, ...updates };
        })
      );
    },
    []
  );

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  /**
   * Toggle sort for a column
   * Cycles through: asc -> desc -> null (no sort)
   */
  const toggleSort = useCallback(
    (column: string) => {
      if (!validColumnNames.has(column)) {
        console.warn(`Invalid column name: ${column}`);
        return;
      }

      setSort((prev) => {
        // If no current sort or different column, start with asc
        if (!prev || prev.column !== column) {
          return { column, direction: 'asc' };
        }

        // If currently asc, switch to desc
        if (prev.direction === 'asc') {
          return { column, direction: 'desc' };
        }

        // If currently desc, clear sort
        return null;
      });
    },
    [validColumnNames]
  );

  /**
   * Apply filters and sorting to data
   * This is the main function that processes the data for display
   */
  const applyFiltersAndSort = useCallback(
    (data: Record<string, unknown>[]): Record<string, unknown>[] => {
      if (!data || data.length === 0) {
        return [];
      }

      let result = [...data];

      // Apply filters
      if (filters.length > 0) {
        result = result.filter((row) => {
          // Row must match ALL filters (AND logic)
          return filters.every((filter) => {
            const value = row[filter.column];
            return matchesFilter(value, filter);
          });
        });
      }

      // Apply sorting
      if (sort) {
        result.sort((a, b) => {
          const valueA = a[sort.column];
          const valueB = b[sort.column];
          return compareValues(valueA, valueB, sort.direction);
        });
      }

      return result;
    },
    [filters, sort]
  );

  return {
    filters,
    sort,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    setSort,
    toggleSort,
    applyFiltersAndSort,
  };
}
