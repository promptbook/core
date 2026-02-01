import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  DataFrameMetadata,
  DataFrameColumnType,
  DataFramePagination as PaginationType,
} from '../../types';
import { DataFrameToolbar } from './DataFrameToolbar';
import { DataFrameCell } from './DataFrameCell';
import { DataFramePaginationControls } from './DataFramePagination';
import { useDataFramePagination } from '../hooks/useDataFramePagination';
import { useDataFrameFilters } from '../hooks/useDataFrameFilters';
import '../styles/dataframe-viewer.css';

interface DataFrameViewerProps {
  metadata: DataFrameMetadata;
  onGetPage: (
    dfId: string,
    page: number,
    pageSize: number
  ) => Promise<{
    data: Record<string, unknown>[];
    pagination: PaginationType;
  } | null>;
  onEditCell: (
    dfId: string,
    rowIndex: number,
    column: string,
    value: unknown
  ) => Promise<boolean>;
  onAddRow: (dfId: string) => Promise<DataFrameMetadata | null>;
  onDeleteRow: (
    dfId: string,
    rowIndex: number
  ) => Promise<DataFrameMetadata | null>;
  onAddColumn: (
    dfId: string,
    name: string,
    dtype: DataFrameColumnType
  ) => Promise<DataFrameMetadata | null>;
  onDeleteColumn: (
    dfId: string,
    column: string
  ) => Promise<DataFrameMetadata | null>;
}

// Icons
const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" />
    <path d="M6 6.5v4M8 6.5v4" />
  </svg>
);

const SortAscIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M6 2v8M3 5l3-3 3 3" />
  </svg>
);

const SortDescIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M6 2v8M3 7l3 3 3-3" />
  </svg>
);

/** Format column type for display */
function formatColumnType(dtype: DataFrameColumnType): string {
  const typeLabels: Record<DataFrameColumnType, string> = {
    int64: 'int',
    float64: 'float',
    object: 'obj',
    bool: 'bool',
    datetime64: 'date',
    category: 'cat',
    string: 'str',
  };
  return typeLabels[dtype] || dtype;
}

/**
 * Main DataFrame viewer component that combines toolbar, table, and pagination
 */
export function DataFrameViewer({
  metadata: initialMetadata,
  onGetPage,
  onEditCell,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
}: DataFrameViewerProps) {
  // State for current metadata (can change after operations)
  const [metadata, setMetadata] = useState<DataFrameMetadata>(initialMetadata);
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    column: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // Update metadata when prop changes
  useEffect(() => {
    setMetadata(initialMetadata);
  }, [initialMetadata]);

  // Page change callback for the pagination hook
  const handlePageChange = useCallback(
    async (page: number, pageSize: number) => {
      return await onGetPage(metadata.dfId, page, pageSize);
    },
    [metadata.dfId, onGetPage]
  );

  // Use pagination hook
  const {
    data,
    pagination,
    isLoading: paginationLoading,
    error: paginationError,
    goToPage,
    nextPage,
    prevPage,
    setPageSize,
  } = useDataFramePagination({
    initialMetadata: metadata,
    onPageChange: handlePageChange,
  });

  // Use filters hook
  const { filters, sort, addFilter, removeFilter, toggleSort, applyFiltersAndSort } =
    useDataFrameFilters({
      columns: metadata.columns,
    });

  // Apply filters and sort to current page data
  const displayData = useMemo(
    () => applyFiltersAndSort(data),
    [applyFiltersAndSort, data]
  );

  // Combined loading state
  const isLoading = paginationLoading || operationLoading;

  // Combined error
  const displayError = error || paginationError;

  /**
   * Handle cell save - calculate actual row index and call onEditCell
   */
  const handleCellSave = useCallback(
    async (displayRowIndex: number, column: string, value: unknown) => {
      setError(null);

      // Calculate actual row index (page offset + display index)
      const actualRowIndex = pagination.page * pagination.pageSize + displayRowIndex;

      try {
        const success = await onEditCell(metadata.dfId, actualRowIndex, column, value);
        if (!success) {
          setError('Failed to save cell edit');
        }
        setEditingCell(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save cell');
      }
    },
    [metadata.dfId, onEditCell, pagination.page, pagination.pageSize]
  );

  /**
   * Handle adding a new row
   */
  const handleAddRow = useCallback(async () => {
    setError(null);
    setOperationLoading(true);

    try {
      const newMetadata = await onAddRow(metadata.dfId);
      if (newMetadata) {
        setMetadata(newMetadata);
        // Go to last page to see the new row
        const lastPage = newMetadata.pagination.totalPages - 1;
        if (lastPage >= 0 && lastPage !== pagination.page) {
          await goToPage(lastPage);
        }
      } else {
        setError('Failed to add row');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add row');
    } finally {
      setOperationLoading(false);
    }
  }, [metadata.dfId, onAddRow, goToPage, pagination.page]);

  /**
   * Handle deleting a row
   */
  const handleDeleteRow = useCallback(
    async (displayRowIndex: number) => {
      setError(null);
      setOperationLoading(true);

      // Calculate actual row index
      const actualRowIndex = pagination.page * pagination.pageSize + displayRowIndex;

      try {
        const newMetadata = await onDeleteRow(metadata.dfId, actualRowIndex);
        if (newMetadata) {
          setMetadata(newMetadata);
          // If current page is now empty and not the first page, go to previous page
          if (
            newMetadata.pagination.totalPages < pagination.page + 1 &&
            pagination.page > 0
          ) {
            await goToPage(pagination.page - 1);
          } else {
            // Refresh current page
            await goToPage(pagination.page);
          }
        } else {
          setError('Failed to delete row');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete row');
      } finally {
        setOperationLoading(false);
      }
    },
    [metadata.dfId, onDeleteRow, goToPage, pagination.page, pagination.pageSize]
  );

  /**
   * Handle adding a new column
   */
  const handleAddColumn = useCallback(
    async (name: string, dtype: DataFrameColumnType) => {
      setError(null);
      setOperationLoading(true);

      try {
        const newMetadata = await onAddColumn(metadata.dfId, name, dtype);
        if (newMetadata) {
          setMetadata(newMetadata);
          // Refresh current page to get new column data
          await goToPage(pagination.page);
        } else {
          setError('Failed to add column');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add column');
      } finally {
        setOperationLoading(false);
      }
    },
    [metadata.dfId, onAddColumn, goToPage, pagination.page]
  );

  /**
   * Handle deleting a column
   */
  const handleDeleteColumn = useCallback(
    async (column: string) => {
      setError(null);
      setOperationLoading(true);

      try {
        const newMetadata = await onDeleteColumn(metadata.dfId, column);
        if (newMetadata) {
          setMetadata(newMetadata);
          // Refresh current page
          await goToPage(pagination.page);
        } else {
          setError('Failed to delete column');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete column');
      } finally {
        setOperationLoading(false);
      }
    },
    [metadata.dfId, onDeleteColumn, goToPage, pagination.page]
  );

  /**
   * Start editing a cell
   */
  const handleStartEdit = useCallback((rowIndex: number, column: string) => {
    setEditingCell({ rowIndex, column });
  }, []);

  /**
   * Cancel cell editing
   */
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  return (
    <div className="dataframe-viewer">
      {/* Toolbar */}
      <DataFrameToolbar
        columns={metadata.columns}
        filters={filters}
        sort={sort}
        onAddFilter={addFilter}
        onRemoveFilter={removeFilter}
        onToggleSort={toggleSort}
        onAddRow={handleAddRow}
        onAddColumn={handleAddColumn}
        variableName={metadata.variableName}
      />

      {/* Error display */}
      {displayError && (
        <div className="dataframe-viewer__error" role="alert">
          <span className="dataframe-viewer__error-icon">!</span>
          <span>{displayError}</span>
        </div>
      )}

      {/* Table container */}
      <div
        className={`dataframe-viewer__table-container ${isLoading ? 'dataframe-viewer__table-container--loading' : ''}`}
      >
        <table className="dataframe-viewer__table" role="grid">
          {/* Header */}
          <thead className="dataframe-viewer__header">
            <tr>
              {/* Row number column header */}
              <th className="dataframe-viewer__header-cell dataframe-viewer__row-number-header">
                #
              </th>

              {/* Column headers */}
              {metadata.columns.map((column) => (
                <th
                  key={column.name}
                  className={`dataframe-viewer__header-cell ${sort?.column === column.name ? 'dataframe-viewer__header-cell--sorted' : ''}`}
                >
                  <div className="dataframe-viewer__header-content">
                    <button
                      className="dataframe-viewer__header-name"
                      onClick={() => toggleSort(column.name)}
                      title={`Sort by ${column.name}`}
                    >
                      <span className="dataframe-viewer__column-name">
                        {column.name}
                      </span>
                      <span className="dataframe-viewer__column-type">
                        {formatColumnType(column.dtype)}
                      </span>
                      {sort?.column === column.name && (
                        <span className="dataframe-viewer__sort-icon">
                          {sort.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
                        </span>
                      )}
                    </button>
                    <button
                      className="dataframe-viewer__delete-column-btn"
                      onClick={() => handleDeleteColumn(column.name)}
                      title={`Delete column ${column.name}`}
                      aria-label={`Delete column ${column.name}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="dataframe-viewer__body">
            {displayData.length === 0 ? (
              <tr>
                <td
                  colSpan={metadata.columns.length + 1}
                  className="dataframe-viewer__empty-message"
                >
                  {data.length === 0
                    ? 'No data available'
                    : 'No matching rows found'}
                </td>
              </tr>
            ) : (
              displayData.map((row, displayIndex) => {
                // Calculate actual row number for display
                const actualRowNumber =
                  pagination.page * pagination.pageSize + displayIndex + 1;

                return (
                  <tr
                    key={displayIndex}
                    className={`dataframe-viewer__row ${displayIndex % 2 === 1 ? 'dataframe-viewer__row--striped' : ''}`}
                  >
                    {/* Row number cell with delete button */}
                    <td className="dataframe-viewer__row-number">
                      <span className="dataframe-viewer__row-number-text">
                        {actualRowNumber}
                      </span>
                      <button
                        className="dataframe-viewer__delete-row-btn"
                        onClick={() => handleDeleteRow(displayIndex)}
                        title={`Delete row ${actualRowNumber}`}
                        aria-label={`Delete row ${actualRowNumber}`}
                      >
                        <TrashIcon />
                      </button>
                    </td>

                    {/* Data cells */}
                    {metadata.columns.map((column) => {
                      const isEditing =
                        editingCell?.rowIndex === displayIndex &&
                        editingCell?.column === column.name;

                      return (
                        <DataFrameCell
                          key={column.name}
                          value={row[column.name]}
                          column={column}
                          rowIndex={displayIndex}
                          isEditing={isEditing}
                          onStartEdit={() => handleStartEdit(displayIndex, column.name)}
                          onSave={(value) =>
                            handleCellSave(displayIndex, column.name, value)
                          }
                          onCancel={handleCancelEdit}
                        />
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <DataFramePaginationControls
        pagination={pagination}
        isLoading={isLoading}
        onGoToPage={goToPage}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onSetPageSize={setPageSize}
      />
    </div>
  );
}
