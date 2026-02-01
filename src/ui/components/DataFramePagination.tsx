import React from 'react';
import type { DataFramePagination as PaginationState } from '../../types';
import '../styles/dataframe-pagination.css';

interface DataFramePaginationProps {
  pagination: PaginationState;
  isLoading: boolean;
  onGoToPage: (page: number) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onSetPageSize: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Calculate the range of rows being displayed
 */
function getRowRange(pagination: PaginationState): { start: number; end: number } {
  const start = pagination.page * pagination.pageSize + 1;
  const end = Math.min(start + pagination.pageSize - 1, pagination.totalRows);
  return { start, end };
}

/**
 * Pagination controls for DataFrame viewer
 * Layout: Left side shows row info, right side shows page size selector and navigation
 */
export function DataFramePaginationControls({
  pagination,
  isLoading,
  onGoToPage,
  onNextPage,
  onPrevPage,
  onSetPageSize,
}: DataFramePaginationProps) {
  const { start, end } = getRowRange(pagination);
  const { page, totalPages, totalRows, pageSize } = pagination;

  const isFirstPage = page === 0;
  const isLastPage = page >= totalPages - 1;
  const hasData = totalRows > 0;

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    if (!isNaN(newSize)) {
      onSetPageSize(newSize);
    }
  };

  const handleGoToFirst = () => {
    if (!isFirstPage && !isLoading) {
      onGoToPage(0);
    }
  };

  const handleGoToLast = () => {
    if (!isLastPage && !isLoading) {
      onGoToPage(totalPages - 1);
    }
  };

  const handlePrevPage = () => {
    if (!isFirstPage && !isLoading) {
      onPrevPage();
    }
  };

  const handleNextPage = () => {
    if (!isLastPage && !isLoading) {
      onNextPage();
    }
  };

  return (
    <div className={`dataframe-pagination ${isLoading ? 'dataframe-pagination--loading' : ''}`}>
      {/* Left side: Row information */}
      <div className="dataframe-pagination__info">
        {hasData ? (
          <span className="dataframe-pagination__rows">
            Showing <strong>{start.toLocaleString()}</strong> - <strong>{end.toLocaleString()}</strong> of{' '}
            <strong>{totalRows.toLocaleString()}</strong> rows
          </span>
        ) : (
          <span className="dataframe-pagination__rows dataframe-pagination__rows--empty">
            No rows to display
          </span>
        )}
      </div>

      {/* Right side: Controls */}
      <div className="dataframe-pagination__controls">
        {/* Loading indicator */}
        {isLoading && (
          <div className="dataframe-pagination__spinner" role="status" aria-label="Loading">
            <span className="sr-only">Loading...</span>
          </div>
        )}

        {/* Page size selector */}
        <label className="dataframe-pagination__page-size">
          <span className="dataframe-pagination__page-size-label">Rows per page:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            disabled={isLoading || !hasData}
            className="dataframe-pagination__page-size-select"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {/* Navigation buttons */}
        <div className="dataframe-pagination__nav" role="navigation" aria-label="Pagination">
          {/* First page */}
          <button
            type="button"
            className="dataframe-pagination__nav-btn"
            onClick={handleGoToFirst}
            disabled={isFirstPage || isLoading || !hasData}
            title="Go to first page"
            aria-label="Go to first page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="11,17 6,12 11,7" />
              <polyline points="18,17 13,12 18,7" />
            </svg>
          </button>

          {/* Previous page */}
          <button
            type="button"
            className="dataframe-pagination__nav-btn"
            onClick={handlePrevPage}
            disabled={isFirstPage || isLoading || !hasData}
            title="Go to previous page"
            aria-label="Go to previous page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>

          {/* Page indicator */}
          <span className="dataframe-pagination__page-indicator">
            Page <strong>{hasData ? page + 1 : 0}</strong> of <strong>{totalPages}</strong>
          </span>

          {/* Next page */}
          <button
            type="button"
            className="dataframe-pagination__nav-btn"
            onClick={handleNextPage}
            disabled={isLastPage || isLoading || !hasData}
            title="Go to next page"
            aria-label="Go to next page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>

          {/* Last page */}
          <button
            type="button"
            className="dataframe-pagination__nav-btn"
            onClick={handleGoToLast}
            disabled={isLastPage || isLoading || !hasData}
            title="Go to last page"
            aria-label="Go to last page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="13,17 18,12 13,7" />
              <polyline points="6,17 11,12 6,7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
