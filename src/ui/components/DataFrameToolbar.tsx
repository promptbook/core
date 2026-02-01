import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  DataFrameColumn,
  DataFrameFilter,
  DataFrameSort,
  FilterOperator,
  DataFrameColumnType,
} from '../../types';
import '../styles/dataframe-toolbar.css';

interface DataFrameToolbarProps {
  columns: DataFrameColumn[];
  filters: DataFrameFilter[];
  sort: DataFrameSort | null;
  onAddFilter: (filter: DataFrameFilter) => void;
  onRemoveFilter: (column: string) => void;
  onToggleSort: (column: string) => void;
  onAddRow: () => void;
  onAddColumn: (name: string, dtype: DataFrameColumnType) => void;
  variableName?: string;
}

/** Filter operators with display labels */
const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'greater_than', label: 'Greater than' },
  { value: 'less_than', label: 'Less than' },
  { value: 'between', label: 'Between' },
  { value: 'is_null', label: 'Is empty' },
  { value: 'is_not_null', label: 'Is not empty' },
];

/** Column types with display labels */
const COLUMN_TYPES: { value: DataFrameColumnType; label: string }[] = [
  { value: 'string', label: 'Text' },
  { value: 'int64', label: 'Integer' },
  { value: 'float64', label: 'Decimal' },
  { value: 'bool', label: 'Boolean' },
  { value: 'datetime64', label: 'Date/Time' },
];

/** Format filter value for display */
function formatFilterValue(filter: DataFrameFilter): string {
  if (filter.operator === 'is_null' || filter.operator === 'is_not_null') {
    return '';
  }
  if (filter.operator === 'between' && Array.isArray(filter.value)) {
    return `${filter.value[0]} - ${filter.value[1]}`;
  }
  return String(filter.value);
}

/** Get operator display label */
function getOperatorLabel(operator: FilterOperator): string {
  const op = FILTER_OPERATORS.find((o) => o.value === operator);
  return op?.label ?? operator;
}

// Icons
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 2h12M3 5h8M5 8h4M6 11h2" />
  </svg>
);

const SortAscIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2v10M4 5l3-3 3 3" />
  </svg>
);

const SortDescIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2v10M4 9l3 3 3-3" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M7 2v10M2 7h10" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 2l8 8M10 2l-8 8" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 4.5l3 3 3-3" />
  </svg>
);

/** Hook to handle click outside of dropdown */
function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, onClose: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, onClose]);
}

// Sub-components

interface FilterTagProps {
  filter: DataFrameFilter;
  onRemove: () => void;
}

function FilterTag({ filter, onRemove }: FilterTagProps) {
  const value = formatFilterValue(filter);
  return (
    <span className="dataframe-toolbar__tag">
      <span className="dataframe-toolbar__tag-column">{filter.column}</span>
      <span className="dataframe-toolbar__tag-operator">{getOperatorLabel(filter.operator)}</span>
      {value && <span className="dataframe-toolbar__tag-value">{value}</span>}
      <button
        className="dataframe-toolbar__tag-remove"
        onClick={onRemove}
        aria-label={`Remove filter for ${filter.column}`}
      >
        <CloseIcon />
      </button>
    </span>
  );
}

interface SortIndicatorProps {
  sort: DataFrameSort;
  onToggle: () => void;
}

function SortIndicator({ sort, onToggle }: SortIndicatorProps) {
  return (
    <button className="dataframe-toolbar__sort-indicator" onClick={onToggle} title="Click to change sort direction">
      {sort.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
      <span>{sort.column}</span>
      <span className="dataframe-toolbar__sort-direction">{sort.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
    </button>
  );
}

interface FilterFormProps {
  availableColumns: DataFrameColumn[];
  onApply: (filter: DataFrameFilter) => void;
  onCancel: () => void;
}

function FilterForm({ availableColumns, onApply, onCancel }: FilterFormProps) {
  const [selectedColumn, setSelectedColumn] = useState(availableColumns[0]?.name ?? '');
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [betweenMin, setBetweenMin] = useState('');
  const [betweenMax, setBetweenMax] = useState('');

  const needsValue = selectedOperator !== 'is_null' && selectedOperator !== 'is_not_null';
  const isBetween = selectedOperator === 'between';
  const canApply = selectedColumn && (!needsValue || (isBetween ? betweenMin && betweenMax : filterValue));

  const handleApply = () => {
    if (!selectedColumn) return;

    let value: string | number | [number, number];
    if (selectedOperator === 'is_null' || selectedOperator === 'is_not_null') {
      value = '';
    } else if (selectedOperator === 'between') {
      value = [parseFloat(betweenMin) || 0, parseFloat(betweenMax) || 0];
    } else {
      value = filterValue;
    }

    onApply({ column: selectedColumn, operator: selectedOperator, value });
  };

  return (
    <div className="dataframe-toolbar__dropdown-menu">
      <div className="dataframe-toolbar__dropdown-row">
        <label>Column</label>
        <select value={selectedColumn} onChange={(e) => setSelectedColumn(e.target.value)}>
          <option value="" disabled>Select column</option>
          {availableColumns.map((col) => (
            <option key={col.name} value={col.name}>{col.name}</option>
          ))}
        </select>
      </div>
      <div className="dataframe-toolbar__dropdown-row">
        <label>Operator</label>
        <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value as FilterOperator)}>
          {FILTER_OPERATORS.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>
      </div>
      {needsValue && (
        <div className="dataframe-toolbar__dropdown-row">
          <label>Value</label>
          {isBetween ? (
            <div className="dataframe-toolbar__between-inputs">
              <input type="text" placeholder="Min" value={betweenMin} onChange={(e) => setBetweenMin(e.target.value)} />
              <span>to</span>
              <input type="text" placeholder="Max" value={betweenMax} onChange={(e) => setBetweenMax(e.target.value)} />
            </div>
          ) : (
            <input
              type="text"
              placeholder="Enter value..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canApply && handleApply()}
            />
          )}
        </div>
      )}
      <div className="dataframe-toolbar__dropdown-actions">
        <button className="dataframe-toolbar__dropdown-cancel" onClick={onCancel}>Cancel</button>
        <button className="dataframe-toolbar__dropdown-apply" onClick={handleApply} disabled={!canApply}>Apply</button>
      </div>
    </div>
  );
}

interface FilterDropdownProps {
  columns: DataFrameColumn[];
  onAddFilter: (filter: DataFrameFilter) => void;
  existingFilters: DataFrameFilter[];
}

function FilterDropdown({ columns, onAddFilter, existingFilters }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const availableColumns = columns.filter((col) => !existingFilters.some((f) => f.column === col.name));

  const handleApply = (filter: DataFrameFilter) => {
    onAddFilter(filter);
    setIsOpen(false);
  };

  return (
    <div className="dataframe-toolbar__dropdown" ref={dropdownRef}>
      <button
        className="dataframe-toolbar__btn"
        onClick={() => setIsOpen(!isOpen)}
        disabled={availableColumns.length === 0}
        title="Add filter"
      >
        <FilterIcon />
        <span>Filter</span>
        <ChevronDownIcon />
      </button>
      {isOpen && <FilterForm availableColumns={availableColumns} onApply={handleApply} onCancel={handleClose} />}
    </div>
  );
}

interface ColumnFormProps {
  existingColumns: string[];
  onAdd: (name: string, dtype: DataFrameColumnType) => void;
  onCancel: () => void;
}

function ColumnForm({ existingColumns, onAdd, onCancel }: ColumnFormProps) {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState<DataFrameColumnType>('string');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmedName = columnName.trim();
    if (!trimmedName) {
      setError('Column name is required');
      return;
    }
    if (existingColumns.includes(trimmedName)) {
      setError('Column name already exists');
      return;
    }
    onAdd(trimmedName, columnType);
  };

  return (
    <div className="dataframe-toolbar__dropdown-menu">
      <div className="dataframe-toolbar__dropdown-row">
        <label>Name</label>
        <input
          type="text"
          placeholder="Column name..."
          value={columnName}
          onChange={(e) => { setColumnName(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && columnName.trim() && handleAdd()}
          autoFocus
        />
        {error && <span className="dataframe-toolbar__dropdown-error">{error}</span>}
      </div>
      <div className="dataframe-toolbar__dropdown-row">
        <label>Type</label>
        <select value={columnType} onChange={(e) => setColumnType(e.target.value as DataFrameColumnType)}>
          {COLUMN_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>
      <div className="dataframe-toolbar__dropdown-actions">
        <button className="dataframe-toolbar__dropdown-cancel" onClick={onCancel}>Cancel</button>
        <button className="dataframe-toolbar__dropdown-apply" onClick={handleAdd} disabled={!columnName.trim()}>Add</button>
      </div>
    </div>
  );
}

interface AddColumnDropdownProps {
  onAddColumn: (name: string, dtype: DataFrameColumnType) => void;
  existingColumns: string[];
}

function AddColumnDropdown({ onAddColumn, existingColumns }: AddColumnDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setIsOpen(false), []);
  useClickOutside(dropdownRef, handleClose);

  const handleAdd = (name: string, dtype: DataFrameColumnType) => {
    onAddColumn(name, dtype);
    setIsOpen(false);
  };

  return (
    <div className="dataframe-toolbar__dropdown" ref={dropdownRef}>
      <button className="dataframe-toolbar__btn" onClick={() => setIsOpen(!isOpen)} title="Add column">
        <PlusIcon />
        <span>Column</span>
        <ChevronDownIcon />
      </button>
      {isOpen && <ColumnForm existingColumns={existingColumns} onAdd={handleAdd} onCancel={handleClose} />}
    </div>
  );
}

export function DataFrameToolbar({
  columns,
  filters,
  sort,
  onAddFilter,
  onRemoveFilter,
  onToggleSort,
  onAddRow,
  onAddColumn,
  variableName,
}: DataFrameToolbarProps) {
  return (
    <div className="dataframe-toolbar">
      <div className="dataframe-toolbar__left">
        {variableName && <span className="dataframe-toolbar__variable">{variableName}</span>}
        {filters.length > 0 && (
          <div className="dataframe-toolbar__tags">
            {filters.map((filter) => (
              <FilterTag key={filter.column} filter={filter} onRemove={() => onRemoveFilter(filter.column)} />
            ))}
          </div>
        )}
        {sort && <SortIndicator sort={sort} onToggle={() => onToggleSort(sort.column)} />}
      </div>
      <div className="dataframe-toolbar__right">
        <FilterDropdown columns={columns} onAddFilter={onAddFilter} existingFilters={filters} />
        <button className="dataframe-toolbar__btn" onClick={onAddRow} title="Add row">
          <PlusIcon />
          <span>Row</span>
        </button>
        <AddColumnDropdown onAddColumn={onAddColumn} existingColumns={columns.map((c) => c.name)} />
      </div>
    </div>
  );
}
