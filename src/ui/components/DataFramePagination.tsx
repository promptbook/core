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

// SVG icons for navigation buttons
const FirstIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="11,17 6,12 11,7" /><polyline points="18,17 13,12 18,7" /></svg>;
const PrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15,18 9,12 15,6" /></svg>;
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9,18 15,12 9,6" /></svg>;
const LastIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="13,17 18,12 13,7" /><polyline points="6,17 11,12 6,7" /></svg>;

interface NavBtnProps { onClick: () => void; disabled: boolean; title: string; children: React.ReactNode; }
const NavBtn = ({ onClick, disabled, title, children }: NavBtnProps) => (
  <button type="button" className="dataframe-pagination__nav-btn" onClick={onClick} disabled={disabled} title={title} aria-label={title}>{children}</button>
);

function getRowRange(p: PaginationState) { return { start: p.page * p.pageSize + 1, end: Math.min(p.page * p.pageSize + p.pageSize, p.totalRows) }; }

export function DataFramePaginationControls({ pagination, isLoading, onGoToPage, onNextPage, onPrevPage, onSetPageSize }: DataFramePaginationProps) {
  const { start, end } = getRowRange(pagination);
  const { page, totalPages, totalRows, pageSize } = pagination;
  const isFirst = page === 0, isLast = page >= totalPages - 1, hasData = totalRows > 0;

  const handlePageSize = (e: React.ChangeEvent<HTMLSelectElement>) => { const s = parseInt(e.target.value, 10); if (!isNaN(s)) onSetPageSize(s); };
  const canNav = (cond: boolean) => !cond && !isLoading && hasData;

  return (
    <div className={`dataframe-pagination ${isLoading ? 'dataframe-pagination--loading' : ''}`}>
      <div className="dataframe-pagination__info">
        {hasData ? <span className="dataframe-pagination__rows">Showing <strong>{start.toLocaleString()}</strong> - <strong>{end.toLocaleString()}</strong> of <strong>{totalRows.toLocaleString()}</strong> rows</span>
          : <span className="dataframe-pagination__rows dataframe-pagination__rows--empty">No rows to display</span>}
      </div>
      <div className="dataframe-pagination__controls">
        {isLoading && <div className="dataframe-pagination__spinner" role="status" aria-label="Loading"><span className="sr-only">Loading...</span></div>}
        <label className="dataframe-pagination__page-size">
          <span className="dataframe-pagination__page-size-label">Rows per page:</span>
          <select value={pageSize} onChange={handlePageSize} disabled={isLoading || !hasData} className="dataframe-pagination__page-size-select" aria-label="Rows per page">
            {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="dataframe-pagination__nav" role="navigation" aria-label="Pagination">
          <NavBtn onClick={() => onGoToPage(0)} disabled={!canNav(isFirst)} title="Go to first page"><FirstIcon /></NavBtn>
          <NavBtn onClick={onPrevPage} disabled={!canNav(isFirst)} title="Go to previous page"><PrevIcon /></NavBtn>
          <span className="dataframe-pagination__page-indicator">Page <strong>{hasData ? page + 1 : 0}</strong> of <strong>{totalPages}</strong></span>
          <NavBtn onClick={onNextPage} disabled={!canNav(isLast)} title="Go to next page"><NextIcon /></NavBtn>
          <NavBtn onClick={() => onGoToPage(totalPages - 1)} disabled={!canNav(isLast)} title="Go to last page"><LastIcon /></NavBtn>
        </div>
      </div>
    </div>
  );
}
