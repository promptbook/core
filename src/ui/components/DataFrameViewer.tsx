import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { DataFrameMetadata, DataFrameColumnType, DataFramePagination as PaginationType, DataFrameColumn, DataFrameSort } from '../../types';
import { DataFrameToolbar } from './DataFrameToolbar';
import { DataFrameCell } from './DataFrameCell';
import { DataFramePaginationControls } from './DataFramePagination';
import { useDataFramePagination } from '../hooks/useDataFramePagination';
import { useDataFrameFilters } from '../hooks/useDataFrameFilters';
import '../styles/dataframe-viewer.css';

interface DataFrameViewerProps {
  metadata: DataFrameMetadata;
  onGetPage: (dfId: string, page: number, pageSize: number) => Promise<{ data: Record<string, unknown>[]; pagination: PaginationType } | null>;
  onEditCell: (dfId: string, rowIndex: number, column: string, value: unknown) => Promise<boolean>;
  onAddRow: (dfId: string) => Promise<DataFrameMetadata | null>;
  onDeleteRow: (dfId: string, rowIndex: number) => Promise<DataFrameMetadata | null>;
  onAddColumn: (dfId: string, name: string, dtype: DataFrameColumnType) => Promise<DataFrameMetadata | null>;
  onDeleteColumn: (dfId: string, column: string) => Promise<DataFrameMetadata | null>;
}

const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M11 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V4" /><path d="M6 6.5v4M8 6.5v4" /></svg>;
const SortAscIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M3 5l3-3 3 3" /></svg>;
const SortDescIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2v8M3 7l3 3 3-3" /></svg>;

const typeLabels: Record<DataFrameColumnType, string> = { int64: 'int', float64: 'float', object: 'obj', bool: 'bool', datetime64: 'date', category: 'cat', string: 'str' };
const formatColumnType = (dtype: DataFrameColumnType) => typeLabels[dtype] || dtype;

interface TableHeaderProps { columns: DataFrameColumn[]; sort: DataFrameSort | null; toggleSort: (col: string) => void; onDeleteColumn: (col: string) => void; }
function TableHeader({ columns, sort, toggleSort, onDeleteColumn }: TableHeaderProps) {
  return (
    <thead className="dataframe-viewer__header"><tr>
      <th className="dataframe-viewer__header-cell dataframe-viewer__row-number-header">#</th>
      {columns.map((col) => (
        <th key={col.name} className={`dataframe-viewer__header-cell ${sort?.column === col.name ? 'dataframe-viewer__header-cell--sorted' : ''}`}>
          <div className="dataframe-viewer__header-content">
            <button className="dataframe-viewer__header-name" onClick={() => toggleSort(col.name)} title={`Sort by ${col.name}`}>
              <span className="dataframe-viewer__column-name">{col.name}</span>
              <span className="dataframe-viewer__column-type">{formatColumnType(col.dtype)}</span>
              {sort?.column === col.name && <span className="dataframe-viewer__sort-icon">{sort.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />}</span>}
            </button>
            <button className="dataframe-viewer__delete-column-btn" onClick={() => onDeleteColumn(col.name)} title={`Delete column ${col.name}`}><TrashIcon /></button>
          </div>
        </th>
      ))}
    </tr></thead>
  );
}

interface TableRowProps { row: Record<string, unknown>; displayIndex: number; actualRowNumber: number; columns: DataFrameColumn[]; editingCell: { rowIndex: number; column: string } | null; onStartEdit: (row: number, col: string) => void; onSave: (row: number, col: string, val: unknown) => void; onCancelEdit: () => void; onDeleteRow: (idx: number) => void; }
function TableRow({ row, displayIndex, actualRowNumber, columns, editingCell, onStartEdit, onSave, onCancelEdit, onDeleteRow }: TableRowProps) {
  return (
    <tr className={`dataframe-viewer__row ${displayIndex % 2 === 1 ? 'dataframe-viewer__row--striped' : ''}`}>
      <td className="dataframe-viewer__row-number">
        <span className="dataframe-viewer__row-number-text">{actualRowNumber}</span>
        <button className="dataframe-viewer__delete-row-btn" onClick={() => onDeleteRow(displayIndex)} title={`Delete row ${actualRowNumber}`}><TrashIcon /></button>
      </td>
      {columns.map((col) => {
        const isEditing = editingCell?.rowIndex === displayIndex && editingCell?.column === col.name;
        return <DataFrameCell key={col.name} value={row[col.name]} column={col} rowIndex={displayIndex} isEditing={isEditing}
          onStartEdit={() => onStartEdit(displayIndex, col.name)} onSave={(v) => onSave(displayIndex, col.name, v)} onCancel={onCancelEdit} />;
      })}
    </tr>
  );
}

interface TableBodyProps { displayData: Record<string, unknown>[]; data: Record<string, unknown>[]; columns: DataFrameColumn[]; pagination: PaginationType; editingCell: { rowIndex: number; column: string } | null; onStartEdit: (row: number, col: string) => void; onSave: (row: number, col: string, val: unknown) => void; onCancelEdit: () => void; onDeleteRow: (idx: number) => void; }
function TableBody({ displayData, data, columns, pagination, editingCell, onStartEdit, onSave, onCancelEdit, onDeleteRow }: TableBodyProps) {
  if (displayData.length === 0) {
    return <tbody className="dataframe-viewer__body"><tr><td colSpan={columns.length + 1} className="dataframe-viewer__empty-message">{data.length === 0 ? 'No data available' : 'No matching rows found'}</td></tr></tbody>;
  }
  return (
    <tbody className="dataframe-viewer__body">
      {displayData.map((row, i) => <TableRow key={i} row={row} displayIndex={i} actualRowNumber={pagination.page * pagination.pageSize + i + 1} columns={columns}
        editingCell={editingCell} onStartEdit={onStartEdit} onSave={onSave} onCancelEdit={onCancelEdit} onDeleteRow={onDeleteRow} />)}
    </tbody>
  );
}

/** Custom hook for DataFrame row/column operations */
function useDataFrameOperations(
  metadata: DataFrameMetadata, setMetadata: (m: DataFrameMetadata) => void, setError: (e: string | null) => void,
  onEditCell: DataFrameViewerProps['onEditCell'], onAddRow: DataFrameViewerProps['onAddRow'],
  onDeleteRow: DataFrameViewerProps['onDeleteRow'], onAddColumn: DataFrameViewerProps['onAddColumn'],
  onDeleteColumn: DataFrameViewerProps['onDeleteColumn'], pagination: PaginationType, goToPage: (p: number) => Promise<void>
) {
  const [operationLoading, setOperationLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; column: string } | null>(null);

  const runOp = useCallback(async <T,>(op: () => Promise<T | null>, onSuccess?: (r: T) => Promise<void>, errMsg = 'Operation failed') => {
    setError(null); setOperationLoading(true);
    try { const r = await op(); if (r && onSuccess) await onSuccess(r); else if (!r) setError(errMsg); }
    catch (err) { setError(err instanceof Error ? err.message : errMsg); } finally { setOperationLoading(false); }
  }, [setError]);

  const handleCellSave = useCallback(async (displayRowIndex: number, column: string, value: unknown) => {
    setError(null);
    const actualRowIndex = pagination.page * pagination.pageSize + displayRowIndex;
    try { const ok = await onEditCell(metadata.dfId, actualRowIndex, column, value); if (!ok) setError('Failed to save'); setEditingCell(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save'); }
  }, [metadata.dfId, onEditCell, pagination.page, pagination.pageSize, setError]);

  const handleAddRow = useCallback(() => runOp(() => onAddRow(metadata.dfId), async (m) => {
    setMetadata(m); const lp = m.pagination.totalPages - 1; if (lp >= 0 && lp !== pagination.page) await goToPage(lp);
  }, 'Failed to add row'), [metadata.dfId, onAddRow, goToPage, pagination.page, runOp, setMetadata]);

  const handleDeleteRow = useCallback((idx: number) => runOp(() => onDeleteRow(metadata.dfId, pagination.page * pagination.pageSize + idx), async (m) => {
    setMetadata(m); if (m.pagination.totalPages < pagination.page + 1 && pagination.page > 0) await goToPage(pagination.page - 1); else await goToPage(pagination.page);
  }, 'Failed to delete row'), [metadata.dfId, onDeleteRow, goToPage, pagination.page, pagination.pageSize, runOp, setMetadata]);

  const handleAddColumn = useCallback((name: string, dtype: DataFrameColumnType) => runOp(() => onAddColumn(metadata.dfId, name, dtype), async (m) => {
    setMetadata(m); await goToPage(pagination.page);
  }, 'Failed to add column'), [metadata.dfId, onAddColumn, goToPage, pagination.page, runOp, setMetadata]);

  const handleDeleteColumn = useCallback((col: string) => runOp(() => onDeleteColumn(metadata.dfId, col), async (m) => {
    setMetadata(m); await goToPage(pagination.page);
  }, 'Failed to delete column'), [metadata.dfId, onDeleteColumn, goToPage, pagination.page, runOp, setMetadata]);

  const handleStartEdit = useCallback((rowIndex: number, column: string) => setEditingCell({ rowIndex, column }), []);
  const handleCancelEdit = useCallback(() => setEditingCell(null), []);

  return { operationLoading, editingCell, handleCellSave, handleAddRow, handleDeleteRow, handleAddColumn, handleDeleteColumn, handleStartEdit, handleCancelEdit };
}

export function DataFrameViewer({ metadata: initialMetadata, onGetPage, onEditCell, onAddRow, onDeleteRow, onAddColumn, onDeleteColumn }: DataFrameViewerProps) {
  const [metadata, setMetadata] = useState<DataFrameMetadata>(initialMetadata);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setMetadata(initialMetadata); }, [initialMetadata]);

  const handlePageChange = useCallback(async (page: number, pageSize: number) => onGetPage(metadata.dfId, page, pageSize), [metadata.dfId, onGetPage]);
  const { data, pagination, isLoading: paginationLoading, error: paginationError, goToPage, nextPage, prevPage, setPageSize } = useDataFramePagination({ initialMetadata: metadata, onPageChange: handlePageChange });
  const { filters, sort, addFilter, removeFilter, toggleSort, applyFiltersAndSort } = useDataFrameFilters({ columns: metadata.columns });
  const displayData = useMemo(() => applyFiltersAndSort(data), [applyFiltersAndSort, data]);

  const ops = useDataFrameOperations(metadata, setMetadata, setError, onEditCell, onAddRow, onDeleteRow, onAddColumn, onDeleteColumn, pagination, goToPage);
  const isLoading = paginationLoading || ops.operationLoading;
  const displayError = error || paginationError;

  return (
    <div className="dataframe-viewer">
      <DataFrameToolbar columns={metadata.columns} filters={filters} sort={sort} onAddFilter={addFilter} onRemoveFilter={removeFilter}
        onToggleSort={toggleSort} onAddRow={ops.handleAddRow} onAddColumn={ops.handleAddColumn} variableName={metadata.variableName} />
      {displayError && <div className="dataframe-viewer__error" role="alert"><span className="dataframe-viewer__error-icon">!</span><span>{displayError}</span></div>}
      <div className={`dataframe-viewer__table-container ${isLoading ? 'dataframe-viewer__table-container--loading' : ''}`}>
        <table className="dataframe-viewer__table" role="grid">
          <TableHeader columns={metadata.columns} sort={sort} toggleSort={toggleSort} onDeleteColumn={ops.handleDeleteColumn} />
          <TableBody displayData={displayData} data={data} columns={metadata.columns} pagination={pagination}
            editingCell={ops.editingCell} onStartEdit={ops.handleStartEdit} onSave={ops.handleCellSave} onCancelEdit={ops.handleCancelEdit} onDeleteRow={ops.handleDeleteRow} />
        </table>
      </div>
      <DataFramePaginationControls pagination={pagination} isLoading={isLoading} onGoToPage={goToPage} onNextPage={nextPage} onPrevPage={prevPage} onSetPageSize={setPageSize} />
    </div>
  );
}
